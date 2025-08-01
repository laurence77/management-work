const { createClient } = require('@supabase/supabase-js');
const { logger } = require('../../utils/logger');

class CookieConsentService {
    constructor() {
        this.supabase = createClient(
            process.env.SUPABASE_URL,
            process.env.SUPABASE_SERVICE_ROLE_KEY
        );
    }

    // Record cookie consent
    async recordConsent(userId, consentData, metadata = {}) {
        try {
            const { data, error } = await this.supabase
                .from('cookie_consents')
                .insert({
                    user_id: userId,
                    essential: true, // Always true
                    analytics: consentData.analytics || false,
                    marketing: consentData.marketing || false,
                    personalization: consentData.personalization || false,
                    consent_version: consentData.version || '1.0',
                    ip_address: metadata.ipAddress,
                    user_agent: metadata.userAgent,
                    consent_method: metadata.method || 'banner',
                    metadata: metadata
                })
                .select()
                .single();

            if (error) throw error;

            logger.info('Cookie consent recorded', { userId, consentData });
            return data;
        } catch (error) {
            logger.error('Failed to record cookie consent', { userId, error: error.message });
            throw error;
        }
    }

    // Update consent preferences
    async updateConsent(userId, consentData) {
        try {
            const { data, error } = await this.supabase
                .from('cookie_consents')
                .update({
                    analytics: consentData.analytics,
                    marketing: consentData.marketing,
                    personalization: consentData.personalization,
                    updated_at: new Date().toISOString()
                })
                .eq('user_id', userId)
                .select()
                .single();

            if (error) throw error;

            logger.info('Cookie consent updated', { userId, consentData });
            return data;
        } catch (error) {
            logger.error('Failed to update cookie consent', { userId, error: error.message });
            throw error;
        }
    }

    // Get user consent
    async getConsent(userId) {
        try {
            const { data, error } = await this.supabase
                .from('cookie_consents')
                .select('*')
                .eq('user_id', userId)
                .order('created_at', { ascending: false })
                .limit(1)
                .single();

            if (error && error.code !== 'PGRST116') throw error; // Ignore "not found" errors
            
            return data || null;
        } catch (error) {
            logger.error('Failed to get cookie consent', { userId, error: error.message });
            return null;
        }
    }

    // Record cookie usage
    async recordCookieUsage(cookieName, cookieType, purpose, userId = null) {
        try {
            const { error } = await this.supabase
                .from('cookie_usage_logs')
                .insert({
                    cookie_name: cookieName,
                    cookie_type: cookieType,
                    purpose: purpose,
                    user_id: userId,
                    used_at: new Date().toISOString()
                });

            if (error) {
                logger.warn('Failed to log cookie usage', { cookieName, error: error.message });
            }
        } catch (error) {
            logger.warn('Failed to log cookie usage', { cookieName, error: error.message });
        }
    }

    // Get consent statistics
    async getConsentStatistics(days = 30) {
        try {
            const cutoffDate = new Date();
            cutoffDate.setDate(cutoffDate.getDate() - days);

            const { data: consents, error } = await this.supabase
                .from('cookie_consents')
                .select('analytics, marketing, personalization, created_at')
                .gte('created_at', cutoffDate.toISOString());

            if (error) throw error;

            const stats = {
                total_consents: consents.length,
                analytics_consent_rate: 0,
                marketing_consent_rate: 0,
                personalization_consent_rate: 0,
                daily_consents: {},
                consent_methods: {}
            };

            if (consents.length > 0) {
                stats.analytics_consent_rate = (consents.filter(c => c.analytics).length / consents.length * 100).toFixed(1);
                stats.marketing_consent_rate = (consents.filter(c => c.marketing).length / consents.length * 100).toFixed(1);
                stats.personalization_consent_rate = (consents.filter(c => c.personalization).length / consents.length * 100).toFixed(1);

                // Group by day
                consents.forEach(consent => {
                    const date = new Date(consent.created_at).toISOString().split('T')[0];
                    stats.daily_consents[date] = (stats.daily_consents[date] || 0) + 1;
                });
            }

            return stats;
        } catch (error) {
            logger.error('Failed to get consent statistics', error);
            throw error;
        }
    }

    // Check if cookies can be used
    canUseCookies(consentData, cookieType) {
        if (!consentData) return false;
        
        switch (cookieType) {
            case 'essential':
                return true; // Always allowed
            case 'analytics':
                return consentData.analytics || false;
            case 'marketing':
                return consentData.marketing || false;
            case 'personalization':
                return consentData.personalization || false;
            default:
                return false;
        }
    }

    // Generate cookie banner content
    getCookieBannerContent() {
        return {
            title: 'We use cookies to enhance your experience',
            description: 'We use cookies and similar technologies to provide, protect, and improve our services. Some cookies are essential for our platform to work, while others help us personalize your experience and show you relevant content.',
            categories: {
                essential: {
                    name: 'Essential Cookies',
                    description: 'These cookies are necessary for the platform to function and cannot be disabled. They include authentication, security, and basic functionality.',
                    required: true,
                    examples: ['Session tokens', 'Security tokens', 'Load balancing']
                },
                analytics: {
                    name: 'Analytics Cookies',
                    description: 'Help us understand how you use our platform to improve performance and user experience. No personal information is collected.',
                    required: false,
                    examples: ['Google Analytics', 'Performance monitoring', 'Usage statistics']
                },
                marketing: {
                    name: 'Marketing Cookies',
                    description: 'Used to show you relevant advertisements and track the effectiveness of our marketing campaigns.',
                    required: false,
                    examples: ['Advertisement tracking', 'Conversion tracking', 'Retargeting']
                },
                personalization: {
                    name: 'Personalization Cookies',
                    description: 'Remember your preferences and settings to provide a customized experience.',
                    required: false,
                    examples: ['User preferences', 'Language settings', 'Theme choices']
                }
            },
            links: {
                privacy_policy: '/privacy-policy',
                cookie_policy: '/cookie-policy',
                contact: '/contact'
            }
        };
    }

    // Cookie compliance middleware
    createComplianceMiddleware() {
        return (req, res, next) => {
            // Add cookie consent helpers to request
            req.cookieConsent = {
                canUseAnalytics: () => {
                    const consent = req.cookies['cookie-consent'];
                    if (!consent) return false;
                    try {
                        const parsed = JSON.parse(consent);
                        return parsed.analytics || false;
                    } catch {
                        return false;
                    }
                },
                canUseMarketing: () => {
                    const consent = req.cookies['cookie-consent'];
                    if (!consent) return false;
                    try {
                        const parsed = JSON.parse(consent);
                        return parsed.marketing || false;
                    } catch {
                        return false;
                    }
                },
                canUsePersonalization: () => {
                    const consent = req.cookies['cookie-consent'];
                    if (!consent) return false;
                    try {
                        const parsed = JSON.parse(consent);
                        return parsed.personalization || false;
                    } catch {
                        return false;
                    }
                }
            };

            // Add cookie setting helper to response
            res.setCookieIfAllowed = (name, value, options, type) => {
                if (type === 'essential' || req.cookieConsent[`canUse${type.charAt(0).toUpperCase() + type.slice(1)}`]?.()) {
                    res.cookie(name, value, options);
                    this.recordCookieUsage(name, type, 'Set by application', req.user?.id).catch(console.error);
                }
            };

            next();
        };
    }
}

module.exports = CookieConsentService;
