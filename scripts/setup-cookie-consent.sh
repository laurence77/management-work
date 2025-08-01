#!/bin/bash

# Cookie Consent Banner and Privacy Preference Management Setup
# This script implements GDPR-compliant cookie consent management

set -euo pipefail

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}🍪 Setting up Cookie Consent Banner and Privacy Preference Management...${NC}"

# Create cookie consent components
create_cookie_consent_components() {
    echo -e "${YELLOW}🏗️ Creating cookie consent components...${NC}"
    
    mkdir -p src/components/cookie-consent
    mkdir -p backend/services/cookie-consent
    
    # Cookie consent banner component
    cat > src/components/cookie-consent/CookieConsentBanner.tsx << 'EOF'
import React, { useState, useEffect } from 'react';
import { Cookie, Settings, X, Check, Info } from 'lucide-react';

interface CookieConsent {
    essential: boolean;
    analytics: boolean;
    marketing: boolean;
    personalization: boolean;
}

interface CookieConsentBannerProps {
    onAcceptAll?: () => void;
    onRejectAll?: () => void;
    onCustomize?: (consents: CookieConsent) => void;
}

export const CookieConsentBanner: React.FC<CookieConsentBannerProps> = ({
    onAcceptAll,
    onRejectAll,
    onCustomize
}) => {
    const [isVisible, setIsVisible] = useState(false);
    const [showDetails, setShowDetails] = useState(false);
    const [consents, setConsents] = useState<CookieConsent>({
        essential: true, // Always required
        analytics: false,
        marketing: false,
        personalization: false
    });

    useEffect(() => {
        // Check if user has already made a choice
        const existingConsent = localStorage.getItem('cookie-consent');
        if (!existingConsent) {
            setIsVisible(true);
        }
    }, []);

    const handleAcceptAll = () => {
        const allConsents = {
            essential: true,
            analytics: true,
            marketing: true,
            personalization: true
        };
        saveConsent(allConsents);
        onAcceptAll?.();
        setIsVisible(false);
    };

    const handleRejectAll = () => {
        const essentialOnly = {
            essential: true,
            analytics: false,
            marketing: false,
            personalization: false
        };
        saveConsent(essentialOnly);
        onRejectAll?.();
        setIsVisible(false);
    };

    const handleCustomize = () => {
        saveConsent(consents);
        onCustomize?.(consents);
        setIsVisible(false);
    };

    const saveConsent = (consentData: CookieConsent) => {
        const consentRecord = {
            ...consentData,
            timestamp: new Date().toISOString(),
            version: '1.0'
        };
        localStorage.setItem('cookie-consent', JSON.stringify(consentRecord));
        
        // Also send to backend
        fetch('/api/cookie-consent', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(consentRecord)
        }).catch(console.error);
    };

    const updateConsent = (type: keyof CookieConsent, value: boolean) => {
        setConsents(prev => ({
            ...prev,
            [type]: value
        }));
    };

    if (!isVisible) return null;

    return (
        <div className="fixed inset-0 z-50 bg-black bg-opacity-50 flex items-end">
            <div className="bg-white w-full max-w-4xl mx-auto m-4 rounded-lg shadow-xl">
                <div className="p-6">
                    <div className="flex items-start justify-between mb-4">
                        <div className="flex items-center">
                            <Cookie className="h-6 w-6 text-blue-600 mr-2" />
                            <h3 className="text-lg font-semibold text-gray-900">
                                We use cookies to enhance your experience
                            </h3>
                        </div>
                        <button
                            onClick={() => setIsVisible(false)}
                            className="text-gray-400 hover:text-gray-600"
                        >
                            <X size={20} />
                        </button>
                    </div>

                    <p className="text-gray-600 mb-4">
                        We use cookies and similar technologies to provide, protect, and improve our services. 
                        Some cookies are essential for our platform to work, while others help us personalize 
                        your experience and show you relevant content.
                    </p>

                    {!showDetails && (
                        <div className="flex flex-wrap gap-3">
                            <button
                                onClick={handleAcceptAll}
                                className="bg-blue-600 text-white px-6 py-2 rounded-md hover:bg-blue-700 flex items-center"
                            >
                                <Check size={16} className="mr-2" />
                                Accept All
                            </button>
                            <button
                                onClick={handleRejectAll}
                                className="bg-gray-200 text-gray-800 px-6 py-2 rounded-md hover:bg-gray-300"
                            >
                                Reject All
                            </button>
                            <button
                                onClick={() => setShowDetails(true)}
                                className="bg-white border border-gray-300 text-gray-700 px-6 py-2 rounded-md hover:bg-gray-50 flex items-center"
                            >
                                <Settings size={16} className="mr-2" />
                                Customize
                            </button>
                        </div>
                    )}

                    {showDetails && (
                        <div className="space-y-4">
                            <div className="border-t pt-4">
                                <h4 className="font-semibold text-gray-900 mb-3">Cookie Preferences</h4>
                                
                                <div className="space-y-4">
                                    {/* Essential Cookies */}
                                    <div className="flex items-start justify-between p-4 bg-gray-50 rounded-lg">
                                        <div className="flex-1">
                                            <div className="flex items-center">
                                                <h5 className="font-medium text-gray-900">Essential Cookies</h5>
                                                <span className="ml-2 text-xs bg-green-100 text-green-800 px-2 py-1 rounded">
                                                    Required
                                                </span>
                                            </div>
                                            <p className="text-sm text-gray-600 mt-1">
                                                These cookies are necessary for the platform to function and cannot be disabled.
                                                They include authentication, security, and basic functionality.
                                            </p>
                                        </div>
                                        <div className="ml-4">
                                            <div className="w-12 h-6 bg-green-500 rounded-full flex items-center justify-center">
                                                <div className="w-4 h-4 bg-white rounded-full"></div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Analytics Cookies */}
                                    <div className="flex items-start justify-between p-4 bg-gray-50 rounded-lg">
                                        <div className="flex-1">
                                            <h5 className="font-medium text-gray-900">Analytics Cookies</h5>
                                            <p className="text-sm text-gray-600 mt-1">
                                                Help us understand how you use our platform to improve performance and user experience.
                                                No personal information is collected.
                                            </p>
                                        </div>
                                        <div className="ml-4">
                                            <button
                                                onClick={() => updateConsent('analytics', !consents.analytics)}
                                                className={`w-12 h-6 rounded-full flex items-center transition-colors ${
                                                    consents.analytics ? 'bg-blue-500 justify-end' : 'bg-gray-300 justify-start'
                                                }`}
                                            >
                                                <div className="w-4 h-4 bg-white rounded-full mx-1"></div>
                                            </button>
                                        </div>
                                    </div>

                                    {/* Marketing Cookies */}
                                    <div className="flex items-start justify-between p-4 bg-gray-50 rounded-lg">
                                        <div className="flex-1">
                                            <h5 className="font-medium text-gray-900">Marketing Cookies</h5>
                                            <p className="text-sm text-gray-600 mt-1">
                                                Used to show you relevant advertisements and track the effectiveness of our marketing campaigns.
                                            </p>
                                        </div>
                                        <div className="ml-4">
                                            <button
                                                onClick={() => updateConsent('marketing', !consents.marketing)}
                                                className={`w-12 h-6 rounded-full flex items-center transition-colors ${
                                                    consents.marketing ? 'bg-blue-500 justify-end' : 'bg-gray-300 justify-start'
                                                }`}
                                            >
                                                <div className="w-4 h-4 bg-white rounded-full mx-1"></div>
                                            </button>
                                        </div>
                                    </div>

                                    {/* Personalization Cookies */}
                                    <div className="flex items-start justify-between p-4 bg-gray-50 rounded-lg">
                                        <div className="flex-1">
                                            <h5 className="font-medium text-gray-900">Personalization Cookies</h5>
                                            <p className="text-sm text-gray-600 mt-1">
                                                Remember your preferences and settings to provide a customized experience.
                                            </p>
                                        </div>
                                        <div className="ml-4">
                                            <button
                                                onClick={() => updateConsent('personalization', !consents.personalization)}
                                                className={`w-12 h-6 rounded-full flex items-center transition-colors ${
                                                    consents.personalization ? 'bg-blue-500 justify-end' : 'bg-gray-300 justify-start'
                                                }`}
                                            >
                                                <div className="w-4 h-4 bg-white rounded-full mx-1"></div>
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="flex justify-between items-center pt-4 border-t">
                                <button
                                    onClick={() => setShowDetails(false)}
                                    className="text-gray-600 hover:text-gray-800"
                                >
                                    Back
                                </button>
                                <div className="flex gap-3">
                                    <button
                                        onClick={handleCustomize}
                                        className="bg-blue-600 text-white px-6 py-2 rounded-md hover:bg-blue-700"
                                    >
                                        Save Preferences
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}

                    <div className="mt-4 pt-4 border-t text-sm text-gray-500">
                        <p>
                            For more information, read our{' '}
                            <a href="/privacy-policy" className="text-blue-600 hover:underline">
                                Privacy Policy
                            </a>{' '}
                            and{' '}
                            <a href="/cookie-policy" className="text-blue-600 hover:underline">
                                Cookie Policy
                            </a>
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
};
EOF

    # Privacy preferences component
    cat > src/components/cookie-consent/PrivacyPreferences.tsx << 'EOF'
import React, { useState, useEffect } from 'react';
import { Shield, Cookie, Eye, Bell, Download, Trash2, Settings } from 'lucide-react';

interface PrivacySettings {
    analytics: boolean;
    marketing: boolean;
    personalization: boolean;
    emailMarketing: boolean;
    pushNotifications: boolean;
    dataProcessing: boolean;
}

export const PrivacyPreferences: React.FC = () => {
    const [settings, setSettings] = useState<PrivacySettings>({
        analytics: false,
        marketing: false,
        personalization: false,
        emailMarketing: false,
        pushNotifications: false,
        dataProcessing: true
    });
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        loadSettings();
    }, []);

    const loadSettings = async () => {
        try {
            const response = await fetch('/api/privacy-preferences');
            if (response.ok) {
                const data = await response.json();
                setSettings(data.preferences || settings);
            }
        } catch (error) {
            console.error('Failed to load privacy settings:', error);
        } finally {
            setLoading(false);
        }
    };

    const updateSetting = (key: keyof PrivacySettings, value: boolean) => {
        setSettings(prev => ({
            ...prev,
            [key]: value
        }));
    };

    const saveSettings = async () => {
        setSaving(true);
        try {
            const response = await fetch('/api/privacy-preferences', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ preferences: settings })
            });

            if (response.ok) {
                // Show success message
                alert('Privacy preferences updated successfully');
            }
        } catch (error) {
            console.error('Failed to save privacy settings:', error);
            alert('Failed to save preferences. Please try again.');
        } finally {
            setSaving(false);
        }
    };

    const requestDataExport = async () => {
        try {
            const response = await fetch('/api/gdpr/export', { method: 'POST' });
            if (response.ok) {
                const blob = await response.blob();
                const url = window.URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = 'my-data-export.json';
                a.click();
                window.URL.revokeObjectURL(url);
            }
        } catch (error) {
            console.error('Failed to export data:', error);
            alert('Failed to export data. Please try again.');
        }
    };

    const requestAccountDeletion = async () => {
        if (confirm('Are you sure you want to delete your account? This action cannot be undone.')) {
            try {
                const response = await fetch('/api/gdpr/delete-account', { method: 'POST' });
                if (response.ok) {
                    alert('Account deletion request submitted. You will receive a confirmation email.');
                }
            } catch (error) {
                console.error('Failed to request account deletion:', error);
                alert('Failed to submit deletion request. Please try again.');
            }
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
        );
    }

    return (
        <div className="max-w-4xl mx-auto p-6">
            <div className="bg-white rounded-lg shadow-lg">
                <div className="p-6 border-b border-gray-200">
                    <div className="flex items-center">
                        <Shield className="h-8 w-8 text-blue-600 mr-3" />
                        <div>
                            <h2 className="text-2xl font-bold text-gray-900">Privacy Preferences</h2>
                            <p className="text-gray-600">Manage your privacy settings and data preferences</p>
                        </div>
                    </div>
                </div>

                <div className="p-6 space-y-8">
                    {/* Cookie Preferences */}
                    <section>
                        <div className="flex items-center mb-4">
                            <Cookie className="h-6 w-6 text-blue-600 mr-2" />
                            <h3 className="text-lg font-semibold text-gray-900">Cookie Preferences</h3>
                        </div>
                        
                        <div className="space-y-4">
                            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                                <div>
                                    <h4 className="font-medium text-gray-900">Analytics Cookies</h4>
                                    <p className="text-sm text-gray-600">Help us improve our platform</p>
                                </div>
                                <button
                                    onClick={() => updateSetting('analytics', !settings.analytics)}
                                    className={`w-12 h-6 rounded-full flex items-center transition-colors ${
                                        settings.analytics ? 'bg-blue-500 justify-end' : 'bg-gray-300 justify-start'
                                    }`}
                                >
                                    <div className="w-4 h-4 bg-white rounded-full mx-1"></div>
                                </button>
                            </div>

                            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                                <div>
                                    <h4 className="font-medium text-gray-900">Marketing Cookies</h4>
                                    <p className="text-sm text-gray-600">Show relevant advertisements</p>
                                </div>
                                <button
                                    onClick={() => updateSetting('marketing', !settings.marketing)}
                                    className={`w-12 h-6 rounded-full flex items-center transition-colors ${
                                        settings.marketing ? 'bg-blue-500 justify-end' : 'bg-gray-300 justify-start'
                                    }`}
                                >
                                    <div className="w-4 h-4 bg-white rounded-full mx-1"></div>
                                </button>
                            </div>

                            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                                <div>
                                    <h4 className="font-medium text-gray-900">Personalization Cookies</h4>
                                    <p className="text-sm text-gray-600">Customize your experience</p>
                                </div>
                                <button
                                    onClick={() => updateSetting('personalization', !settings.personalization)}
                                    className={`w-12 h-6 rounded-full flex items-center transition-colors ${
                                        settings.personalization ? 'bg-blue-500 justify-end' : 'bg-gray-300 justify-start'
                                    }`}
                                >
                                    <div className="w-4 h-4 bg-white rounded-full mx-1"></div>
                                </button>
                            </div>
                        </div>
                    </section>

                    {/* Communication Preferences */}
                    <section>
                        <div className="flex items-center mb-4">
                            <Bell className="h-6 w-6 text-blue-600 mr-2" />
                            <h3 className="text-lg font-semibold text-gray-900">Communication Preferences</h3>
                        </div>
                        
                        <div className="space-y-4">
                            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                                <div>
                                    <h4 className="font-medium text-gray-900">Email Marketing</h4>
                                    <p className="text-sm text-gray-600">Receive promotional emails and updates</p>
                                </div>
                                <button
                                    onClick={() => updateSetting('emailMarketing', !settings.emailMarketing)}
                                    className={`w-12 h-6 rounded-full flex items-center transition-colors ${
                                        settings.emailMarketing ? 'bg-blue-500 justify-end' : 'bg-gray-300 justify-start'
                                    }`}
                                >
                                    <div className="w-4 h-4 bg-white rounded-full mx-1"></div>
                                </button>
                            </div>

                            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                                <div>
                                    <h4 className="font-medium text-gray-900">Push Notifications</h4>
                                    <p className="text-sm text-gray-600">Receive browser notifications</p>
                                </div>
                                <button
                                    onClick={() => updateSetting('pushNotifications', !settings.pushNotifications)}
                                    className={`w-12 h-6 rounded-full flex items-center transition-colors ${
                                        settings.pushNotifications ? 'bg-blue-500 justify-end' : 'bg-gray-300 justify-start'
                                    }`}
                                >
                                    <div className="w-4 h-4 bg-white rounded-full mx-1"></div>
                                </button>
                            </div>
                        </div>
                    </section>

                    {/* Data Rights */}
                    <section>
                        <div className="flex items-center mb-4">
                            <Eye className="h-6 w-6 text-blue-600 mr-2" />
                            <h3 className="text-lg font-semibold text-gray-900">Your Data Rights</h3>
                        </div>
                        
                        <div className="grid md:grid-cols-2 gap-4">
                            <button
                                onClick={requestDataExport}
                                className="flex items-center p-4 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors"
                            >
                                <Download className="h-6 w-6 text-blue-600 mr-3" />
                                <div className="text-left">
                                    <h4 className="font-medium text-gray-900">Export My Data</h4>
                                    <p className="text-sm text-gray-600">Download a copy of your data</p>
                                </div>
                            </button>

                            <button
                                onClick={requestAccountDeletion}
                                className="flex items-center p-4 bg-red-50 rounded-lg hover:bg-red-100 transition-colors"
                            >
                                <Trash2 className="h-6 w-6 text-red-600 mr-3" />
                                <div className="text-left">
                                    <h4 className="font-medium text-gray-900">Delete My Account</h4>
                                    <p className="text-sm text-gray-600">Permanently delete your account</p>
                                </div>
                            </button>
                        </div>
                    </section>

                    {/* Save Button */}
                    <div className="flex justify-end pt-6 border-t border-gray-200">
                        <button
                            onClick={saveSettings}
                            disabled={saving}
                            className="bg-blue-600 text-white px-6 py-2 rounded-md hover:bg-blue-700 disabled:opacity-50 flex items-center"
                        >
                            {saving ? (
                                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                            ) : (
                                <Settings className="h-4 w-4 mr-2" />
                            )}
                            {saving ? 'Saving...' : 'Save Preferences'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};
EOF

    echo -e "${GREEN}✅ Cookie consent components created${NC}"
}

# Create cookie consent service
create_cookie_service() {
    echo -e "${YELLOW}🍪 Creating cookie consent service...${NC}"
    
    cat > backend/services/cookie-consent/CookieConsentService.js << 'EOF'
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
EOF

    echo -e "${GREEN}✅ Cookie consent service created${NC}"
}

# Create cookie policy page
create_cookie_policy() {
    echo -e "${YELLOW}📜 Creating cookie policy page...${NC}"
    
    cat > src/pages/legal/CookiePolicy.tsx << 'EOF'
import React from 'react';
import { Cookie, Shield, Info, Settings } from 'lucide-react';

export const CookiePolicy: React.FC = () => {
    const lastUpdated = "December 2024";
    
    return (
        <div className="max-w-4xl mx-auto px-4 py-8">
            <div className="bg-white rounded-lg shadow-lg p-8">
                <div className="text-center mb-8">
                    <Cookie className="mx-auto h-16 w-16 text-blue-600 mb-4" />
                    <h1 className="text-4xl font-bold text-gray-900 mb-2">Cookie Policy</h1>
                    <p className="text-gray-600">Last updated: {lastUpdated}</p>
                </div>

                <div className="prose max-w-none">
                    <section className="mb-8">
                        <h2 className="text-2xl font-semibold text-gray-900 mb-4 flex items-center">
                            <Info className="mr-2 h-6 w-6 text-blue-600" />
                            What Are Cookies?
                        </h2>
                        
                        <div className="bg-blue-50 p-4 rounded-lg mb-4">
                            <p className="text-blue-800">
                                Cookies are small text files that are stored on your device when you visit our website. 
                                They help us provide you with a better experience by remembering your preferences, 
                                keeping you signed in, and helping us understand how our platform is used.
                            </p>
                        </div>
                    </section>

                    <section className="mb-8">
                        <h2 className="text-2xl font-semibold text-gray-900 mb-4 flex items-center">
                            <Shield className="mr-2 h-6 w-6 text-blue-600" />
                            Types of Cookies We Use
                        </h2>
                        
                        <div className="space-y-6">
                            {/* Essential Cookies */}
                            <div className="border border-green-200 rounded-lg p-6 bg-green-50">
                                <div className="flex items-center mb-3">
                                    <span className="bg-green-600 text-white px-3 py-1 rounded-full text-sm font-medium mr-3">
                                        Essential
                                    </span>
                                    <h3 className="text-lg font-semibold text-green-900">Strictly Necessary Cookies</h3>
                                </div>
                                <p className="text-green-800 mb-3">
                                    These cookies are essential for our platform to function properly. They cannot be disabled 
                                    as they are necessary for core functionality.
                                </p>
                                <div className="bg-white p-3 rounded">
                                    <h4 className="font-medium text-green-900 mb-2">Examples:</h4>
                                    <ul className="list-disc list-inside text-green-800 text-sm space-y-1">
                                        <li><strong>Authentication tokens:</strong> Keep you logged in securely</li>
                                        <li><strong>Session management:</strong> Maintain your session across pages</li>
                                        <li><strong>Security cookies:</strong> Protect against CSRF attacks</li>
                                        <li><strong>Load balancing:</strong> Ensure optimal server distribution</li>
                                    </ul>
                                </div>
                            </div>

                            {/* Analytics Cookies */}
                            <div className="border border-blue-200 rounded-lg p-6 bg-blue-50">
                                <div className="flex items-center mb-3">
                                    <span className="bg-blue-600 text-white px-3 py-1 rounded-full text-sm font-medium mr-3">
                                        Analytics
                                    </span>
                                    <h3 className="text-lg font-semibold text-blue-900">Performance & Analytics Cookies</h3>
                                </div>
                                <p className="text-blue-800 mb-3">
                                    These cookies help us understand how visitors interact with our platform by collecting 
                                    and reporting information anonymously.
                                </p>
                                <div className="bg-white p-3 rounded">
                                    <h4 className="font-medium text-blue-900 mb-2">Examples:</h4>
                                    <ul className="list-disc list-inside text-blue-800 text-sm space-y-1">
                                        <li><strong>Google Analytics:</strong> _ga, _gid, _gat</li>
                                        <li><strong>Performance monitoring:</strong> Page load times, error tracking</li>
                                        <li><strong>Usage statistics:</strong> Most popular pages, user flows</li>
                                        <li><strong>A/B testing:</strong> Feature effectiveness measurement</li>
                                    </ul>
                                </div>
                                <div className="mt-3 p-2 bg-blue-100 rounded text-sm text-blue-800">
                                    <strong>Your choice:</strong> You can opt out of these cookies without affecting core functionality.
                                </div>
                            </div>

                            {/* Marketing Cookies */}
                            <div className="border border-purple-200 rounded-lg p-6 bg-purple-50">
                                <div className="flex items-center mb-3">
                                    <span className="bg-purple-600 text-white px-3 py-1 rounded-full text-sm font-medium mr-3">
                                        Marketing
                                    </span>
                                    <h3 className="text-lg font-semibold text-purple-900">Marketing & Advertising Cookies</h3>
                                </div>
                                <p className="text-purple-800 mb-3">
                                    These cookies are used to make advertising messages more relevant to you and track 
                                    the effectiveness of our marketing campaigns.
                                </p>
                                <div className="bg-white p-3 rounded">
                                    <h4 className="font-medium text-purple-900 mb-2">Examples:</h4>
                                    <ul className="list-disc list-inside text-purple-800 text-sm space-y-1">
                                        <li><strong>Google Ads:</strong> Conversion tracking and remarketing</li>
                                        <li><strong>Facebook Pixel:</strong> Social media advertising optimization</li>
                                        <li><strong>LinkedIn Ads:</strong> Professional network advertising</li>
                                        <li><strong>Attribution tracking:</strong> Campaign effectiveness measurement</li>
                                    </ul>
                                </div>
                                <div className="mt-3 p-2 bg-purple-100 rounded text-sm text-purple-800">
                                    <strong>Your choice:</strong> You can disable these cookies to stop seeing personalized ads.
                                </div>
                            </div>

                            {/* Personalization Cookies */}
                            <div className="border border-orange-200 rounded-lg p-6 bg-orange-50">
                                <div className="flex items-center mb-3">
                                    <span className="bg-orange-600 text-white px-3 py-1 rounded-full text-sm font-medium mr-3">
                                        Personalization
                                    </span>
                                    <h3 className="text-lg font-semibold text-orange-900">Personalization Cookies</h3>
                                </div>
                                <p className="text-orange-800 mb-3">
                                    These cookies remember your preferences and settings to provide you with a 
                                    customized and enhanced user experience.
                                </p>
                                <div className="bg-white p-3 rounded">
                                    <h4 className="font-medium text-orange-900 mb-2">Examples:</h4>
                                    <ul className="list-disc list-inside text-orange-800 text-sm space-y-1">
                                        <li><strong>Language preferences:</strong> Remember your chosen language</li>
                                        <li><strong>Theme settings:</strong> Dark/light mode preferences</li>
                                        <li><strong>User interface:</strong> Layout and display preferences</li>
                                        <li><strong>Search history:</strong> Improve search suggestions</li>
                                    </ul>
                                </div>
                                <div className="mt-3 p-2 bg-orange-100 rounded text-sm text-orange-800">
                                    <strong>Your choice:</strong> Disabling these may result in a less personalized experience.
                                </div>
                            </div>
                        </div>
                    </section>

                    <section className="mb-8">
                        <h2 className="text-2xl font-semibold text-gray-900 mb-4">Cookie Duration</h2>
                        
                        <div className="grid md:grid-cols-2 gap-4">
                            <div className="bg-gray-50 p-4 rounded-lg">
                                <h3 className="font-semibold text-gray-900 mb-2">Session Cookies</h3>
                                <p className="text-gray-700 text-sm">
                                    Temporary cookies that are deleted when you close your browser. 
                                    Used for essential functionality like keeping you logged in.
                                </p>
                            </div>
                            
                            <div className="bg-gray-50 p-4 rounded-lg">
                                <h3 className="font-semibold text-gray-900 mb-2">Persistent Cookies</h3>
                                <p className="text-gray-700 text-sm">
                                    Remain on your device for a set period or until manually deleted. 
                                    Used for preferences and analytics.
                                </p>
                            </div>
                        </div>
                    </section>

                    <section className="mb-8">
                        <h2 className="text-2xl font-semibold text-gray-900 mb-4 flex items-center">
                            <Settings className="mr-2 h-6 w-6 text-blue-600" />
                            Managing Your Cookie Preferences
                        </h2>
                        
                        <div className="space-y-4">
                            <div className="bg-blue-50 p-4 rounded-lg">
                                <h3 className="font-semibold text-blue-900 mb-2">Platform Settings</h3>
                                <p className="text-blue-800 text-sm mb-3">
                                    You can manage your cookie preferences at any time through our cookie banner 
                                    or in your account settings.
                                </p>
                                <button className="bg-blue-600 text-white px-4 py-2 rounded text-sm hover:bg-blue-700">
                                    Manage Cookie Preferences
                                </button>
                            </div>
                            
                            <div className="bg-gray-50 p-4 rounded-lg">
                                <h3 className="font-semibold text-gray-900 mb-2">Browser Settings</h3>
                                <p className="text-gray-700 text-sm mb-3">
                                    You can also control cookies through your browser settings:
                                </p>
                                <ul className="list-disc list-inside text-gray-700 text-sm space-y-1">
                                    <li><strong>Chrome:</strong> Settings → Privacy and security → Cookies</li>
                                    <li><strong>Firefox:</strong> Preferences → Privacy & Security → Cookies</li>
                                    <li><strong>Safari:</strong> Preferences → Privacy → Cookies and website data</li>
                                    <li><strong>Edge:</strong> Settings → Cookies and site permissions</li>
                                </ul>
                            </div>
                        </div>
                    </section>

                    <section className="mb-8">
                        <h2 className="text-2xl font-semibold text-gray-900 mb-4">Third-Party Cookies</h2>
                        
                        <div className="bg-yellow-50 border border-yellow-200 p-4 rounded-lg">
                            <p className="text-yellow-800 mb-3">
                                Some cookies on our platform are set by third-party services we use to enhance your experience:
                            </p>
                            <div className="space-y-2 text-sm">
                                <div><strong>Google Analytics:</strong> Website analytics and performance monitoring</div>
                                <div><strong>Stripe:</strong> Secure payment processing</div>
                                <div><strong>Cloudflare:</strong> Content delivery and security</div>
                                <div><strong>Intercom:</strong> Customer support chat functionality</div>
                            </div>
                            <p className="text-yellow-800 text-sm mt-3">
                                These services have their own privacy policies and cookie practices.
                            </p>
                        </div>
                    </section>

                    <section className="mb-8">
                        <h2 className="text-2xl font-semibold text-gray-900 mb-4">Your Rights</h2>
                        
                        <div className="bg-green-50 p-4 rounded-lg">
                            <h3 className="font-semibold text-green-900 mb-2">You have the right to:</h3>
                            <ul className="list-disc list-inside text-green-800 text-sm space-y-1">
                                <li>Be informed about our use of cookies</li>
                                <li>Accept or decline non-essential cookies</li>
                                <li>Withdraw consent at any time</li>
                                <li>Access information about cookies we use</li>
                                <li>Delete cookies through your browser</li>
                            </ul>
                        </div>
                    </section>

                    <section className="mb-8">
                        <h2 className="text-2xl font-semibold text-gray-900 mb-4">Contact Us</h2>
                        
                        <div className="bg-gray-50 p-6 rounded-lg">
                            <p className="text-gray-700 mb-4">
                                If you have any questions about our use of cookies, please contact us:
                            </p>
                            <div className="space-y-2 text-sm text-gray-700">
                                <div><strong>Email:</strong> privacy@bookmyreservation.org</div>
                                <div><strong>Phone:</strong> +1 (555) 123-4567</div>
                                <div><strong>Address:</strong> 123 Business Ave, Suite 100, City, State 12345</div>
                            </div>
                        </div>
                    </section>
                </div>
            </div>
        </div>
    );
};
EOF

    echo -e "${GREEN}✅ Cookie policy page created${NC}"
}

# Create cookie database schema
create_cookie_schema() {
    echo -e "${YELLOW}🗄️ Creating cookie consent database schema...${NC}"
    
    cat > backend/migrations/026_cookie_consent.sql << 'EOF'
-- Cookie Consent Management

-- Cookie Consents
CREATE TABLE IF NOT EXISTS cookie_consents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    essential BOOLEAN DEFAULT true,
    analytics BOOLEAN DEFAULT false,
    marketing BOOLEAN DEFAULT false,
    personalization BOOLEAN DEFAULT false,
    consent_version VARCHAR(10) DEFAULT '1.0',
    consent_method VARCHAR(50) DEFAULT 'banner',
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Cookie Usage Logs
CREATE TABLE IF NOT EXISTS cookie_usage_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    cookie_name VARCHAR(255) NOT NULL,
    cookie_type VARCHAR(50) NOT NULL,
    purpose TEXT,
    used_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Cookie Definitions
CREATE TABLE IF NOT EXISTS cookie_definitions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL UNIQUE,
    category VARCHAR(50) NOT NULL,
    purpose TEXT NOT NULL,
    duration VARCHAR(100),
    provider VARCHAR(255),
    is_essential BOOLEAN DEFAULT false,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_cookie_consents_user_id ON cookie_consents(user_id);
CREATE INDEX IF NOT EXISTS idx_cookie_consents_created_at ON cookie_consents(created_at);
CREATE INDEX IF NOT EXISTS idx_cookie_usage_logs_user_id ON cookie_usage_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_cookie_usage_logs_cookie_name ON cookie_usage_logs(cookie_name);
CREATE INDEX IF NOT EXISTS idx_cookie_usage_logs_used_at ON cookie_usage_logs(used_at);
CREATE INDEX IF NOT EXISTS idx_cookie_definitions_category ON cookie_definitions(category);
CREATE INDEX IF NOT EXISTS idx_cookie_definitions_name ON cookie_definitions(name);

-- RLS Policies
ALTER TABLE cookie_consents ENABLE ROW LEVEL SECURITY;
ALTER TABLE cookie_usage_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE cookie_definitions ENABLE ROW LEVEL SECURITY;

-- Users can view and update their own consents
CREATE POLICY "Users can manage their own cookie consents" ON cookie_consents
    FOR ALL USING (auth.uid() = user_id);

-- Service role has full access
CREATE POLICY "Service role full access to cookie_consents" ON cookie_consents
    FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role full access to cookie_usage_logs" ON cookie_usage_logs
    FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role full access to cookie_definitions" ON cookie_definitions
    FOR ALL USING (auth.role() = 'service_role');

-- Public read access to cookie definitions
CREATE POLICY "Public read access to cookie definitions" ON cookie_definitions
    FOR SELECT USING (true);

-- Functions
CREATE OR REPLACE FUNCTION update_cookie_consent_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_cookie_consents_timestamp
    BEFORE UPDATE ON cookie_consents
    FOR EACH ROW
    EXECUTE FUNCTION update_cookie_consent_timestamp();

-- Insert default cookie definitions
INSERT INTO cookie_definitions (name, category, purpose, duration, provider, is_essential, description) VALUES
('session_token', 'essential', 'User authentication', 'Session', 'Platform', true, 'Keeps you logged in securely'),
('csrf_token', 'essential', 'Security protection', 'Session', 'Platform', true, 'Protects against cross-site request forgery'),
('load_balancer', 'essential', 'Load balancing', '1 hour', 'Platform', true, 'Ensures optimal server distribution'),
('_ga', 'analytics', 'Google Analytics', '2 years', 'Google', false, 'Distinguishes unique users'),
('_gid', 'analytics', 'Google Analytics', '24 hours', 'Google', false, 'Distinguishes unique users'),
('_gat', 'analytics', 'Google Analytics', '1 minute', 'Google', false, 'Used to throttle request rate'),
('fbp', 'marketing', 'Facebook Pixel', '3 months', 'Facebook', false, 'Tracks conversions and retargeting'),
('_gcl_au', 'marketing', 'Google AdSense', '3 months', 'Google', false, 'Used for ad targeting'),
('user_preferences', 'personalization', 'User preferences', '1 year', 'Platform', false, 'Remembers your settings'),
('theme_preference', 'personalization', 'Theme selection', '1 year', 'Platform', false, 'Remembers light/dark mode choice'),
('language_preference', 'personalization', 'Language setting', '1 year', 'Platform', false, 'Remembers your language choice')
ON CONFLICT (name) DO NOTHING;
EOF

    echo -e "${GREEN}✅ Cookie consent schema created${NC}"
}

# Main execution
main() {
    echo -e "${BLUE}🚀 Starting Cookie Consent Setup...${NC}"
    
    # Create all components
    create_cookie_consent_components
    create_cookie_service
    create_cookie_policy
    create_cookie_schema
    
    echo -e "${GREEN}✅ Cookie Consent Setup Complete!${NC}"
    echo -e "${BLUE}📋 Components created:${NC}"
    echo "• Cookie consent banner with customizable preferences"
    echo "• Privacy preferences management page"
    echo "• Cookie policy page with detailed explanations"
    echo "• Cookie consent service for backend integration"
    echo "• Database schema for consent tracking"
    echo ""
    echo -e "${BLUE}📋 Features implemented:${NC}"
    echo "• GDPR-compliant cookie consent management"
    echo "• Granular cookie category controls"
    echo "• User preference persistence"
    echo "• Cookie usage logging and analytics"
    echo "• Browser integration and compliance middleware"
    echo ""
    echo -e "${BLUE}📋 Cookie categories:${NC}"
    echo "• Essential cookies (always enabled)"
    echo "• Analytics cookies (optional)"
    echo "• Marketing cookies (optional)"
    echo "• Personalization cookies (optional)"
    echo ""
    echo -e "${BLUE}📋 Pages available:${NC}"
    echo "• Cookie consent banner (automatic)"
    echo "• /privacy-preferences - User preference management"
    echo "• /cookie-policy - Detailed cookie information"
}

# Execute main function
main "$@"