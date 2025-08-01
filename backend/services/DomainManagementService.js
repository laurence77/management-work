const { createClient } = require('@supabase/supabase-js');
const { logger, securityLogger } = require('../utils/logger');

class DomainManagementService {
    constructor() {
        this.supabase = createClient(
            process.env.SUPABASE_URL,
            process.env.SUPABASE_SERVICE_ROLE_KEY
        );
    }

    // Add domain to whitelist
    async addDomain(domain, metadata = {}) {
        try {
            const { data, error } = await this.supabase
                .from('cors_domain_whitelist')
                .insert({
                    domain: domain.toLowerCase(),
                    is_active: true,
                    environment: process.env.NODE_ENV || 'development',
                    metadata: {
                        ...metadata,
                        added_by: 'system',
                        added_at: new Date().toISOString()
                    }
                })
                .select()
                .single();

            if (error) throw error;

            logger.info('Domain added to whitelist', { domain, metadata });
            return data;
        } catch (error) {
            logger.error('Failed to add domain to whitelist', { domain, error: error.message });
            throw error;
        }
    }

    // Remove domain from whitelist
    async removeDomain(domain) {
        try {
            const { error } = await this.supabase
                .from('cors_domain_whitelist')
                .update({ is_active: false, deactivated_at: new Date().toISOString() })
                .eq('domain', domain.toLowerCase());

            if (error) throw error;

            logger.info('Domain removed from whitelist', { domain });
        } catch (error) {
            logger.error('Failed to remove domain from whitelist', { domain, error: error.message });
            throw error;
        }
    }

    // Get active domains for environment
    async getActiveDomains(environment = null) {
        try {
            let query = this.supabase
                .from('cors_domain_whitelist')
                .select('*')
                .eq('is_active', true);

            if (environment) {
                query = query.eq('environment', environment);
            }

            const { data, error } = await query.order('created_at', { ascending: false });
            if (error) throw error;

            return data;
        } catch (error) {
            logger.error('Failed to get active domains', { error: error.message });
            throw error;
        }
    }

    // Log CORS request
    async logCORSRequest(origin, allowed, reason, metadata = {}) {
        try {
            const { error } = await this.supabase
                .from('cors_request_logs')
                .insert({
                    origin,
                    allowed,
                    reason,
                    metadata: {
                        ...metadata,
                        timestamp: new Date().toISOString(),
                        environment: process.env.NODE_ENV
                    }
                });

            if (error && error.code !== '23505') { // Ignore duplicate key errors
                logger.warn('Failed to log CORS request', { error: error.message });
            }
        } catch (error) {
            // Don't throw errors for logging failures
            logger.warn('CORS request logging failed', { error: error.message });
        }
    }

    // Get CORS analytics
    async getCORSAnalytics(hours = 24) {
        try {
            const cutoffTime = new Date();
            cutoffTime.setHours(cutoffTime.getHours() - hours);

            const { data: logs, error } = await this.supabase
                .from('cors_request_logs')
                .select('*')
                .gte('created_at', cutoffTime.toISOString());

            if (error) throw error;

            const analytics = {
                total_requests: logs.length,
                allowed_requests: logs.filter(l => l.allowed).length,
                blocked_requests: logs.filter(l => !l.allowed).length,
                unique_origins: [...new Set(logs.map(l => l.origin))].length,
                top_origins: {},
                block_reasons: {},
                hourly_distribution: {}
            };

            // Calculate additional metrics
            analytics.success_rate = analytics.total_requests > 0 
                ? ((analytics.allowed_requests / analytics.total_requests) * 100).toFixed(2)
                : 0;

            // Top origins
            logs.forEach(log => {
                analytics.top_origins[log.origin] = (analytics.top_origins[log.origin] || 0) + 1;
            });

            // Block reasons
            logs.filter(l => !l.allowed).forEach(log => {
                analytics.block_reasons[log.reason] = (analytics.block_reasons[log.reason] || 0) + 1;
            });

            // Hourly distribution
            logs.forEach(log => {
                const hour = new Date(log.created_at).getHours();
                analytics.hourly_distribution[hour] = (analytics.hourly_distribution[hour] || 0) + 1;
            });

            return analytics;
        } catch (error) {
            logger.error('Failed to get CORS analytics', { error: error.message });
            throw error;
        }
    }

    // Check domain reputation
    async checkDomainReputation(domain) {
        try {
            // Get recent activity for this domain
            const { data: recentLogs, error } = await this.supabase
                .from('cors_request_logs')
                .select('*')
                .eq('origin', domain)
                .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
                .order('created_at', { ascending: false });

            if (error) throw error;

            const reputation = {
                domain,
                total_requests: recentLogs.length,
                success_rate: 0,
                is_trusted: false,
                risk_score: 0,
                flags: []
            };

            if (recentLogs.length > 0) {
                const successfulRequests = recentLogs.filter(l => l.allowed).length;
                reputation.success_rate = ((successfulRequests / recentLogs.length) * 100).toFixed(2);

                // Risk assessment
                if (recentLogs.length > 1000) {
                    reputation.flags.push('high_volume');
                    reputation.risk_score += 10;
                }

                if (reputation.success_rate < 50) {
                    reputation.flags.push('low_success_rate');
                    reputation.risk_score += 20;
                }

                const blockReasons = recentLogs.filter(l => !l.allowed).map(l => l.reason);
                const uniqueBlockReasons = [...new Set(blockReasons)];
                if (uniqueBlockReasons.length > 3) {
                    reputation.flags.push('multiple_block_reasons');
                    reputation.risk_score += 15;
                }
            }

            // Check whitelist status
            const { data: whitelistEntry } = await this.supabase
                .from('cors_domain_whitelist')
                .select('*')
                .eq('domain', domain)
                .eq('is_active', true)
                .single();

            if (whitelistEntry) {
                reputation.is_trusted = true;
                reputation.risk_score = Math.max(0, reputation.risk_score - 30);
            }

            return reputation;
        } catch (error) {
            logger.error('Failed to check domain reputation', { domain, error: error.message });
            return {
                domain,
                total_requests: 0,
                success_rate: 0,
                is_trusted: false,
                risk_score: 100,
                flags: ['reputation_check_failed']
            };
        }
    }
}

module.exports = DomainManagementService;
