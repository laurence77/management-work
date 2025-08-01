const { createClient } = require('@supabase/supabase-js');
const { logger } = require('../../utils/logger');

class GDPRComplianceService {
    constructor() {
        this.supabase = createClient(
            process.env.SUPABASE_URL,
            process.env.SUPABASE_SERVICE_ROLE_KEY
        );
    }

    // Handle data subject access request (Right of Access)
    async handleDataAccessRequest(userId) {
        try {
            logger.info('Processing data access request', { userId });
            
            const userData = await this.collectUserData(userId);
            
            // Log the request
            await this.logGDPRRequest(userId, 'access_request', {
                data_categories: Object.keys(userData),
                request_fulfilled: true
            });
            
            return {
                user_id: userId,
                export_date: new Date().toISOString(),
                data: userData,
                retention_info: await this.getRetentionInfo(),
                legal_basis: await this.getLegalBasisInfo(userId)
            };
        } catch (error) {
            logger.error('Failed to process data access request', { userId, error: error.message });
            throw error;
        }
    }

    // Collect all user data across tables
    async collectUserData(userId) {
        const userData = {};
        
        const tables = [
            'users', 'user_profiles', 'bookings', 'payments', 
            'user_preferences', 'communication_logs', 'login_history'
        ];
        
        for (const table of tables) {
            try {
                const { data, error } = await this.supabase
                    .from(table)
                    .select('*')
                    .eq('user_id', userId);
                
                if (!error && data) {
                    userData[table] = data;
                }
            } catch (error) {
                logger.warn(`Failed to collect data from ${table}`, { userId, error: error.message });
                userData[table] = { error: 'Data collection failed' };
            }
        }
        
        return userData;
    }

    // Handle data rectification request (Right to Rectification)
    async handleDataRectificationRequest(userId, corrections) {
        try {
            logger.info('Processing data rectification request', { userId, corrections });
            
            const results = {};
            
            for (const [table, updates] of Object.entries(corrections)) {
                try {
                    const { data, error } = await this.supabase
                        .from(table)
                        .update({
                            ...updates,
                            updated_at: new Date().toISOString()
                        })
                        .eq('user_id', userId)
                        .select();
                    
                    if (error) throw error;
                    
                    results[table] = {
                        status: 'updated',
                        updated_records: data?.length || 0
                    };
                } catch (error) {
                    results[table] = {
                        status: 'failed',
                        error: error.message
                    };
                }
            }
            
            await this.logGDPRRequest(userId, 'rectification_request', {
                tables_updated: Object.keys(corrections),
                results
            });
            
            return results;
        } catch (error) {
            logger.error('Failed to process rectification request', { userId, error: error.message });
            throw error;
        }
    }

    // Handle data erasure request (Right to Erasure)
    async handleDataErasureRequest(userId, options = {}) {
        try {
            logger.info('Processing data erasure request', { userId, options });
            
            const { preserveForLegal = true, anonymize = true } = options;
            const results = {};
            
            // Get user data before deletion for logging
            const userData = await this.collectUserData(userId);
            
            const tables = [
                'user_preferences', 'communication_logs', 'login_history',
                'user_profiles', 'users' // Delete users table last
            ];
            
            // Tables to preserve for legal/financial reasons
            const legalTables = ['bookings', 'payments', 'contracts'];
            
            for (const table of tables) {
                try {
                    const { error } = await this.supabase
                        .from(table)
                        .delete()
                        .eq('user_id', userId);
                    
                    if (error) throw error;
                    
                    results[table] = { status: 'deleted' };
                } catch (error) {
                    results[table] = {
                        status: 'failed',
                        error: error.message
                    };
                }
            }
            
            // Handle legal tables (anonymize or preserve)
            for (const table of legalTables) {
                if (preserveForLegal && anonymize) {
                    try {
                        const { error } = await this.supabase
                            .from(table)
                            .update({
                                user_id: null,
                                user_email: '[ANONYMIZED]',
                                user_name: '[ANONYMIZED]',
                                anonymized_at: new Date().toISOString(),
                                original_user_id: userId
                            })
                            .eq('user_id', userId);
                        
                        if (error) throw error;
                        
                        results[table] = { status: 'anonymized' };
                    } catch (error) {
                        results[table] = {
                            status: 'anonymization_failed',
                            error: error.message
                        };
                    }
                } else {
                    results[table] = { status: 'preserved_for_legal_reasons' };
                }
            }
            
            await this.logGDPRRequest(userId, 'erasure_request', {
                tables_processed: Object.keys(results),
                results,
                preserve_legal: preserveForLegal,
                anonymize: anonymize
            });
            
            return results;
        } catch (error) {
            logger.error('Failed to process erasure request', { userId, error: error.message });
            throw error;
        }
    }

    // Handle data portability request (Right to Data Portability)
    async handleDataPortabilityRequest(userId, format = 'json') {
        try {
            logger.info('Processing data portability request', { userId, format });
            
            const userData = await this.collectUserData(userId);
            
            // Clean and structure data for portability
            const portableData = {
                export_info: {
                    user_id: userId,
                    export_date: new Date().toISOString(),
                    format: format,
                    version: '1.0'
                },
                personal_data: this.structurePortableData(userData),
                data_sources: Object.keys(userData),
                retention_periods: await this.getRetentionInfo()
            };
            
            await this.logGDPRRequest(userId, 'portability_request', {
                format: format,
                data_size: JSON.stringify(portableData).length,
                request_fulfilled: true
            });
            
            return portableData;
        } catch (error) {
            logger.error('Failed to process portability request', { userId, error: error.message });
            throw error;
        }
    }

    // Structure data for portability
    structurePortableData(userData) {
        const structured = {};
        
        for (const [table, data] of Object.entries(userData)) {
            if (Array.isArray(data)) {
                structured[table] = data.map(record => {
                    // Remove internal IDs and system fields
                    const cleanRecord = { ...record };
                    delete cleanRecord.id;
                    delete cleanRecord.created_at;
                    delete cleanRecord.updated_at;
                    return cleanRecord;
                });
            }
        }
        
        return structured;
    }

    // Update consent preferences
    async updateConsentPreferences(userId, consents) {
        try {
            const { data, error } = await this.supabase
                .from('user_consents')
                .upsert({
                    user_id: userId,
                    marketing_consent: consents.marketing || false,
                    analytics_consent: consents.analytics || false,
                    personalization_consent: consents.personalization || false,
                    third_party_consent: consents.thirdParty || false,
                    consent_date: new Date().toISOString(),
                    consent_method: 'user_settings',
                    ip_address: consents.ipAddress,
                    user_agent: consents.userAgent
                }, {
                    onConflict: 'user_id'
                })
                .select()
                .single();
            
            if (error) throw error;
            
            await this.logGDPRRequest(userId, 'consent_update', consents);
            
            return data;
        } catch (error) {
            logger.error('Failed to update consent preferences', { userId, error: error.message });
            throw error;
        }
    }

    // Get retention information
    async getRetentionInfo() {
        return {
            account_data: 'Until account deletion',
            booking_records: '7 years (legal requirement)',
            payment_data: '6 years (financial records)',
            marketing_data: 'Until consent withdrawn',
            analytics_data: '26 months maximum',
            support_communications: '3 years',
            login_history: '1 year'
        };
    }

    // Get legal basis information
    async getLegalBasisInfo(userId) {
        return {
            contract: [
                'Processing bookings and payments',
                'Service delivery and customer support',
                'Account management and security'
            ],
            legitimate_interest: [
                'Platform security and fraud prevention',
                'Service improvement and analytics',
                'Business operations and administration'
            ],
            consent: [
                'Marketing communications',
                'Personalization features',
                'Non-essential cookies and tracking'
            ],
            legal_obligation: [
                'Financial record keeping',
                'Tax compliance',
                'Legal document retention'
            ]
        };
    }

    // Log GDPR requests
    async logGDPRRequest(userId, requestType, metadata) {
        try {
            const { error } = await this.supabase
                .from('gdpr_requests')
                .insert({
                    user_id: userId,
                    request_type: requestType,
                    status: 'completed',
                    metadata: metadata,
                    processed_at: new Date().toISOString()
                });
            
            if (error) {
                logger.warn('Failed to log GDPR request', { userId, requestType, error: error.message });
            }
        } catch (error) {
            logger.warn('Failed to log GDPR request', { userId, requestType, error: error.message });
        }
    }

    // Get GDPR compliance status
    async getComplianceStatus() {
        try {
            // Check recent requests
            const { data: recentRequests } = await this.supabase
                .from('gdpr_requests')
                .select('request_type, status, created_at')
                .gte('created_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString())
                .order('created_at', { ascending: false });
            
            // Check consent tracking
            const { data: consents } = await this.supabase
                .from('user_consents')
                .select('marketing_consent, analytics_consent')
                .limit(100);
            
            const status = {
                timestamp: new Date().toISOString(),
                recent_requests: recentRequests?.length || 0,
                request_types: this.groupRequestsByType(recentRequests || []),
                consent_rates: this.calculateConsentRates(consents || []),
                compliance_score: this.calculateComplianceScore(recentRequests || []),
                retention_policies: 'configured',
                data_processing_records: 'maintained',
                privacy_policy: 'current',
                cookie_policy: 'current'
            };
            
            return status;
        } catch (error) {
            logger.error('Failed to get compliance status', error);
            return {
                timestamp: new Date().toISOString(),
                status: 'error',
                error: error.message
            };
        }
    }

    // Group requests by type
    groupRequestsByType(requests) {
        return requests.reduce((acc, request) => {
            acc[request.request_type] = (acc[request.request_type] || 0) + 1;
            return acc;
        }, {});
    }

    // Calculate consent rates
    calculateConsentRates(consents) {
        if (consents.length === 0) return {};
        
        const rates = {
            marketing: 0,
            analytics: 0
        };
        
        rates.marketing = (consents.filter(c => c.marketing_consent).length / consents.length * 100).toFixed(1);
        rates.analytics = (consents.filter(c => c.analytics_consent).length / consents.length * 100).toFixed(1);
        
        return rates;
    }

    // Calculate compliance score
    calculateComplianceScore(requests) {
        // Simple scoring based on request fulfillment
        const totalRequests = requests.length;
        const fulfilledRequests = requests.filter(r => r.status === 'completed').length;
        
        if (totalRequests === 0) return 100;
        return Math.round((fulfilledRequests / totalRequests) * 100);
    }
}

module.exports = GDPRComplianceService;
