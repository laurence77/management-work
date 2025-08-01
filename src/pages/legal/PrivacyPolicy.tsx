import React from 'react';
import { Shield, Users, Database, Lock, Eye, Download, Trash2, Settings } from 'lucide-react';

export const PrivacyPolicy: React.FC = () => {
    const lastUpdated = "December 2024";
    
    return (
        <div className="max-w-4xl mx-auto px-4 py-8">
            <div className="bg-white rounded-lg shadow-lg p-8">
                <div className="text-center mb-8">
                    <Shield className="mx-auto h-16 w-16 text-blue-600 mb-4" />
                    <h1 className="text-4xl font-bold text-gray-900 mb-2">Privacy Policy</h1>
                    <p className="text-gray-600">Last updated: {lastUpdated}</p>
                </div>

                <div className="prose max-w-none">
                    <section className="mb-8">
                        <h2 className="text-2xl font-semibold text-gray-900 mb-4 flex items-center">
                            <Users className="mr-2 h-6 w-6 text-blue-600" />
                            1. Information We Collect
                        </h2>
                        
                        <div className="bg-blue-50 p-4 rounded-lg mb-4">
                            <h3 className="font-semibold text-blue-900 mb-2">Personal Information</h3>
                            <ul className="list-disc list-inside text-blue-800 space-y-1">
                                <li>Name and contact information (email, phone number)</li>
                                <li>Profile information and preferences</li>
                                <li>Payment and billing information</li>
                                <li>Communication history and booking details</li>
                                <li>Account credentials and security information</li>
                            </ul>
                        </div>

                        <div className="bg-gray-50 p-4 rounded-lg mb-4">
                            <h3 className="font-semibold text-gray-900 mb-2">Automatically Collected Information</h3>
                            <ul className="list-disc list-inside text-gray-700 space-y-1">
                                <li>Device information and unique identifiers</li>
                                <li>Usage data and interaction patterns</li>
                                <li>Location data (with your consent)</li>
                                <li>Cookies and tracking technologies</li>
                                <li>Log files and technical data</li>
                            </ul>
                        </div>
                    </section>

                    <section className="mb-8">
                        <h2 className="text-2xl font-semibold text-gray-900 mb-4 flex items-center">
                            <Database className="mr-2 h-6 w-6 text-blue-600" />
                            2. How We Use Your Information
                        </h2>
                        
                        <div className="grid md:grid-cols-2 gap-4">
                            <div className="bg-green-50 p-4 rounded-lg">
                                <h3 className="font-semibold text-green-900 mb-2">Service Provision</h3>
                                <ul className="list-disc list-inside text-green-800 text-sm space-y-1">
                                    <li>Processing and managing bookings</li>
                                    <li>Facilitating celebrity-client communications</li>
                                    <li>Payment processing and billing</li>
                                    <li>Customer support and assistance</li>
                                </ul>
                            </div>
                            
                            <div className="bg-purple-50 p-4 rounded-lg">
                                <h3 className="font-semibold text-purple-900 mb-2">Platform Improvement</h3>
                                <ul className="list-disc list-inside text-purple-800 text-sm space-y-1">
                                    <li>Analytics and usage insights</li>
                                    <li>Feature development and testing</li>
                                    <li>Security and fraud prevention</li>
                                    <li>Personalization and recommendations</li>
                                </ul>
                            </div>
                        </div>
                    </section>

                    <section className="mb-8">
                        <h2 className="text-2xl font-semibold text-gray-900 mb-4 flex items-center">
                            <Lock className="mr-2 h-6 w-6 text-blue-600" />
                            3. Legal Basis for Processing (GDPR)
                        </h2>
                        
                        <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 mb-4">
                            <h3 className="font-semibold text-yellow-900 mb-2">We process your data based on:</h3>
                            <ul className="list-disc list-inside text-yellow-800 space-y-2">
                                <li><strong>Contract:</strong> To perform our services and fulfill booking agreements</li>
                                <li><strong>Legitimate Interest:</strong> For business operations, security, and improvements</li>
                                <li><strong>Consent:</strong> For marketing communications and optional features</li>
                                <li><strong>Legal Obligation:</strong> To comply with applicable laws and regulations</li>
                            </ul>
                        </div>
                    </section>

                    <section className="mb-8">
                        <h2 className="text-2xl font-semibold text-gray-900 mb-4 flex items-center">
                            <Eye className="mr-2 h-6 w-6 text-blue-600" />
                            4. Your Rights Under GDPR
                        </h2>
                        
                        <div className="grid md:grid-cols-2 gap-4">
                            <div className="space-y-3">
                                <div className="bg-blue-50 p-3 rounded">
                                    <h4 className="font-semibold text-blue-900">Right of Access</h4>
                                    <p className="text-blue-800 text-sm">Request a copy of your personal data</p>
                                </div>
                                
                                <div className="bg-green-50 p-3 rounded">
                                    <h4 className="font-semibold text-green-900">Right to Rectification</h4>
                                    <p className="text-green-800 text-sm">Correct inaccurate personal data</p>
                                </div>
                                
                                <div className="bg-purple-50 p-3 rounded">
                                    <h4 className="font-semibold text-purple-900">Right to Erasure</h4>
                                    <p className="text-purple-800 text-sm">Request deletion of your data</p>
                                </div>
                            </div>
                            
                            <div className="space-y-3">
                                <div className="bg-orange-50 p-3 rounded">
                                    <h4 className="font-semibold text-orange-900">Right to Portability</h4>
                                    <p className="text-orange-800 text-sm">Export your data in a portable format</p>
                                </div>
                                
                                <div className="bg-red-50 p-3 rounded">
                                    <h4 className="font-semibold text-red-900">Right to Object</h4>
                                    <p className="text-red-800 text-sm">Object to processing for marketing</p>
                                </div>
                                
                                <div className="bg-gray-50 p-3 rounded">
                                    <h4 className="font-semibold text-gray-900">Right to Restrict</h4>
                                    <p className="text-gray-800 text-sm">Limit how we process your data</p>
                                </div>
                            </div>
                        </div>
                    </section>

                    <section className="mb-8">
                        <h2 className="text-2xl font-semibold text-gray-900 mb-4 flex items-center">
                            <Settings className="mr-2 h-6 w-6 text-blue-600" />
                            5. Data Security and Retention
                        </h2>
                        
                        <div className="bg-gray-50 p-6 rounded-lg">
                            <div className="grid md:grid-cols-2 gap-6">
                                <div>
                                    <h3 className="font-semibold text-gray-900 mb-3">Security Measures</h3>
                                    <ul className="list-disc list-inside text-gray-700 text-sm space-y-1">
                                        <li>End-to-end encryption</li>
                                        <li>Regular security audits</li>
                                        <li>Access controls and monitoring</li>
                                        <li>Secure data centers</li>
                                        <li>Staff training and protocols</li>
                                    </ul>
                                </div>
                                
                                <div>
                                    <h3 className="font-semibold text-gray-900 mb-3">Retention Periods</h3>
                                    <ul className="list-disc list-inside text-gray-700 text-sm space-y-1">
                                        <li>Account data: Until account deletion</li>
                                        <li>Booking records: 7 years (legal requirement)</li>
                                        <li>Payment data: 6 years (financial records)</li>
                                        <li>Marketing data: Until consent withdrawn</li>
                                        <li>Analytics data: 26 months maximum</li>
                                    </ul>
                                </div>
                            </div>
                        </div>
                    </section>

                    <section className="mb-8">
                        <h2 className="text-2xl font-semibold text-gray-900 mb-4">6. International Transfers</h2>
                        
                        <div className="bg-blue-50 border border-blue-200 p-4 rounded-lg">
                            <p className="text-blue-800 mb-3">
                                Your data may be transferred to and processed in countries outside the European Economic Area (EEA). 
                                We ensure adequate protection through:
                            </p>
                            <ul className="list-disc list-inside text-blue-800 space-y-1">
                                <li>Standard Contractual Clauses (SCCs)</li>
                                <li>Adequacy decisions by the European Commission</li>
                                <li>Binding Corporate Rules where applicable</li>
                                <li>Your explicit consent for specific transfers</li>
                            </ul>
                        </div>
                    </section>

                    <section className="mb-8">
                        <h2 className="text-2xl font-semibold text-gray-900 mb-4">7. Cookies and Tracking</h2>
                        
                        <div className="space-y-4">
                            <div className="bg-green-50 p-4 rounded-lg">
                                <h3 className="font-semibold text-green-900 mb-2">Essential Cookies</h3>
                                <p className="text-green-800 text-sm">Required for basic functionality and security</p>
                            </div>
                            
                            <div className="bg-blue-50 p-4 rounded-lg">
                                <h3 className="font-semibold text-blue-900 mb-2">Analytics Cookies</h3>
                                <p className="text-blue-800 text-sm">Help us understand how you use our platform (requires consent)</p>
                            </div>
                            
                            <div className="bg-purple-50 p-4 rounded-lg">
                                <h3 className="font-semibold text-purple-900 mb-2">Marketing Cookies</h3>
                                <p className="text-purple-800 text-sm">Used for personalized advertising (requires consent)</p>
                            </div>
                        </div>
                    </section>

                    <section className="mb-8">
                        <h2 className="text-2xl font-semibold text-gray-900 mb-4">8. Contact Information</h2>
                        
                        <div className="bg-gray-50 p-6 rounded-lg">
                            <div className="grid md:grid-cols-2 gap-6">
                                <div>
                                    <h3 className="font-semibold text-gray-900 mb-3">Data Controller</h3>
                                    <p className="text-gray-700 text-sm mb-2">Celebrity Booking Platform Ltd.</p>
                                    <p className="text-gray-700 text-sm mb-2">Email: privacy@bookmyreservation.org</p>
                                    <p className="text-gray-700 text-sm mb-2">Phone: +1 (555) 123-4567</p>
                                    <p className="text-gray-700 text-sm">Address: 123 Business Ave, Suite 100, City, State 12345</p>
                                </div>
                                
                                <div>
                                    <h3 className="font-semibold text-gray-900 mb-3">Data Protection Officer</h3>
                                    <p className="text-gray-700 text-sm mb-2">Email: dpo@bookmyreservation.org</p>
                                    <p className="text-gray-700 text-sm mb-4">Phone: +1 (555) 123-4568</p>
                                    
                                    <h3 className="font-semibold text-gray-900 mb-3">Supervisory Authority</h3>
                                    <p className="text-gray-700 text-sm">You have the right to lodge a complaint with your local data protection authority.</p>
                                </div>
                            </div>
                        </div>
                    </section>
                </div>

                <div className="mt-8 p-4 bg-blue-50 rounded-lg">
                    <h3 className="font-semibold text-blue-900 mb-2">Exercise Your Rights</h3>
                    <p className="text-blue-800 text-sm mb-3">
                        To exercise any of your rights or for privacy-related questions, please contact us at privacy@bookmyreservation.org
                    </p>
                    <div className="flex flex-wrap gap-2">
                        <button className="bg-blue-600 text-white px-4 py-2 rounded text-sm hover:bg-blue-700">
                            Download My Data
                        </button>
                        <button className="bg-gray-600 text-white px-4 py-2 rounded text-sm hover:bg-gray-700">
                            Update Preferences
                        </button>
                        <button className="bg-red-600 text-white px-4 py-2 rounded text-sm hover:bg-red-700">
                            Delete Account
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};
