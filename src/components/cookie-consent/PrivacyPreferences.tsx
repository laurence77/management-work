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
