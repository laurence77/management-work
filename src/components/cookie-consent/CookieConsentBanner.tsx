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
