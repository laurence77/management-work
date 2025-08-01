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
