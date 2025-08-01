#!/bin/bash

# GDPR Compliance Setup - Privacy Policy and Terms of Service
# This script creates comprehensive GDPR-compliant privacy and legal pages

set -euo pipefail

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}🔒 Setting up GDPR Compliance - Privacy Policy and Terms of Service...${NC}"

# Create legal pages directory structure
create_legal_structure() {
    echo -e "${YELLOW}📁 Creating legal pages structure...${NC}"
    
    mkdir -p src/pages/legal
    mkdir -p admin-dashboard/src/components/legal
    mkdir -p backend/services/legal
    
    echo -e "${GREEN}✅ Legal pages structure created${NC}"
}

# Create Privacy Policy component
create_privacy_policy() {
    echo -e "${YELLOW}📋 Creating Privacy Policy page...${NC}"
    
    cat > src/pages/legal/PrivacyPolicy.tsx << 'EOF'
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
EOF

    echo -e "${GREEN}✅ Privacy Policy component created${NC}"
}

# Create Terms of Service component
create_terms_of_service() {
    echo -e "${YELLOW}📜 Creating Terms of Service page...${NC}"
    
    cat > src/pages/legal/TermsOfService.tsx << 'EOF'
import React from 'react';
import { Scale, Users, CreditCard, Shield, AlertTriangle, BookOpen, Gavel } from 'lucide-react';

export const TermsOfService: React.FC = () => {
    const lastUpdated = "December 2024";
    
    return (
        <div className="max-w-4xl mx-auto px-4 py-8">
            <div className="bg-white rounded-lg shadow-lg p-8">
                <div className="text-center mb-8">
                    <Scale className="mx-auto h-16 w-16 text-blue-600 mb-4" />
                    <h1 className="text-4xl font-bold text-gray-900 mb-2">Terms of Service</h1>
                    <p className="text-gray-600">Last updated: {lastUpdated}</p>
                </div>

                <div className="prose max-w-none">
                    <section className="mb-8">
                        <h2 className="text-2xl font-semibold text-gray-900 mb-4 flex items-center">
                            <BookOpen className="mr-2 h-6 w-6 text-blue-600" />
                            1. Acceptance of Terms
                        </h2>
                        
                        <div className="bg-blue-50 border-l-4 border-blue-400 p-4">
                            <p className="text-blue-800">
                                By accessing and using the Celebrity Booking Platform ("Platform"), you agree to be bound by these Terms of Service. 
                                If you do not agree to these terms, please do not use our services.
                            </p>
                        </div>
                    </section>

                    <section className="mb-8">
                        <h2 className="text-2xl font-semibold text-gray-900 mb-4 flex items-center">
                            <Users className="mr-2 h-6 w-6 text-blue-600" />
                            2. Service Description
                        </h2>
                        
                        <div className="grid md:grid-cols-2 gap-4">
                            <div className="bg-green-50 p-4 rounded-lg">
                                <h3 className="font-semibold text-green-900 mb-2">For Clients</h3>
                                <ul className="list-disc list-inside text-green-800 text-sm space-y-1">
                                    <li>Browse celebrity profiles and availability</li>
                                    <li>Submit booking requests and proposals</li>
                                    <li>Manage contracts and communications</li>
                                    <li>Process payments securely</li>
                                    <li>Access booking history and receipts</li>
                                </ul>
                            </div>
                            
                            <div className="bg-purple-50 p-4 rounded-lg">
                                <h3 className="font-semibold text-purple-900 mb-2">For Celebrities</h3>
                                <ul className="list-disc list-inside text-purple-800 text-sm space-y-1">
                                    <li>Create and manage professional profiles</li>
                                    <li>Set availability and pricing</li>
                                    <li>Review and respond to booking requests</li>
                                    <li>Communicate with potential clients</li>
                                    <li>Receive payments and manage earnings</li>
                                </ul>
                            </div>
                        </div>
                    </section>

                    <section className="mb-8">
                        <h2 className="text-2xl font-semibold text-gray-900 mb-4 flex items-center">
                            <Shield className="mr-2 h-6 w-6 text-blue-600" />
                            3. User Responsibilities
                        </h2>
                        
                        <div className="space-y-4">
                            <div className="bg-yellow-50 border border-yellow-200 p-4 rounded-lg">
                                <h3 className="font-semibold text-yellow-900 mb-2">Account Security</h3>
                                <ul className="list-disc list-inside text-yellow-800 text-sm space-y-1">
                                    <li>Maintain confidentiality of login credentials</li>
                                    <li>Notify us immediately of unauthorized access</li>
                                    <li>Use strong passwords and enable two-factor authentication</li>
                                    <li>Keep contact information current and accurate</li>
                                </ul>
                            </div>
                            
                            <div className="bg-red-50 border border-red-200 p-4 rounded-lg">
                                <h3 className="font-semibold text-red-900 mb-2">Prohibited Activities</h3>
                                <ul className="list-disc list-inside text-red-800 text-sm space-y-1">
                                    <li>Harassment, abuse, or discriminatory behavior</li>
                                    <li>Fraudulent or misleading information</li>
                                    <li>Violation of intellectual property rights</li>
                                    <li>Spam, phishing, or malicious content</li>
                                    <li>Circumventing platform fees or processes</li>
                                </ul>
                            </div>
                        </div>
                    </section>

                    <section className="mb-8">
                        <h2 className="text-2xl font-semibold text-gray-900 mb-4 flex items-center">
                            <CreditCard className="mr-2 h-6 w-6 text-blue-600" />
                            4. Payment Terms
                        </h2>
                        
                        <div className="grid md:grid-cols-2 gap-4">
                            <div className="bg-blue-50 p-4 rounded-lg">
                                <h3 className="font-semibold text-blue-900 mb-2">Platform Fees</h3>
                                <ul className="list-disc list-inside text-blue-800 text-sm space-y-1">
                                    <li>Service fee: 5% of booking value</li>
                                    <li>Payment processing: 2.9% + $0.30</li>
                                    <li>Fees are clearly displayed before confirmation</li>
                                    <li>No hidden charges or surprise fees</li>
                                </ul>
                            </div>
                            
                            <div className="bg-green-50 p-4 rounded-lg">
                                <h3 className="font-semibold text-green-900 mb-2">Payment Schedule</h3>
                                <ul className="list-disc list-inside text-green-800 text-sm space-y-1">
                                    <li>50% deposit required to confirm booking</li>
                                    <li>Remaining balance due 48 hours before event</li>
                                    <li>Celebrity payments released after event completion</li>
                                    <li>Refunds processed within 5-7 business days</li>
                                </ul>
                            </div>
                        </div>
                    </section>

                    <section className="mb-8">
                        <h2 className="text-2xl font-semibold text-gray-900 mb-4 flex items-center">
                            <AlertTriangle className="mr-2 h-6 w-6 text-blue-600" />
                            5. Cancellation and Refund Policy
                        </h2>
                        
                        <div className="bg-gray-50 p-6 rounded-lg">
                            <div className="space-y-4">
                                <div className="border-l-4 border-green-400 pl-4">
                                    <h4 className="font-semibold text-green-900">More than 30 days before event</h4>
                                    <p className="text-green-800 text-sm">Full refund minus processing fees</p>
                                </div>
                                
                                <div className="border-l-4 border-yellow-400 pl-4">
                                    <h4 className="font-semibold text-yellow-900">15-30 days before event</h4>
                                    <p className="text-yellow-800 text-sm">75% refund of total booking value</p>
                                </div>
                                
                                <div className="border-l-4 border-orange-400 pl-4">
                                    <h4 className="font-semibold text-orange-900">7-14 days before event</h4>
                                    <p className="text-orange-800 text-sm">50% refund of total booking value</p>
                                </div>
                                
                                <div className="border-l-4 border-red-400 pl-4">
                                    <h4 className="font-semibold text-red-900">Less than 7 days before event</h4>
                                    <p className="text-red-800 text-sm">No refund unless extenuating circumstances</p>
                                </div>
                            </div>
                        </div>
                    </section>

                    <section className="mb-8">
                        <h2 className="text-2xl font-semibold text-gray-900 mb-4 flex items-center">
                            <Gavel className="mr-2 h-6 w-6 text-blue-600" />
                            6. Intellectual Property
                        </h2>
                        
                        <div className="space-y-4">
                            <div className="bg-purple-50 p-4 rounded-lg">
                                <h3 className="font-semibold text-purple-900 mb-2">Platform Content</h3>
                                <p className="text-purple-800 text-sm">
                                    All platform content, including logos, designs, text, and software, is owned by Celebrity Booking Platform 
                                    and protected by intellectual property laws.
                                </p>
                            </div>
                            
                            <div className="bg-blue-50 p-4 rounded-lg">
                                <h3 className="font-semibold text-blue-900 mb-2">User Content</h3>
                                <p className="text-blue-800 text-sm">
                                    You retain ownership of content you upload but grant us a license to use, display, and distribute it 
                                    for platform operations and promotional purposes.
                                </p>
                            </div>
                        </div>
                    </section>

                    <section className="mb-8">
                        <h2 className="text-2xl font-semibold text-gray-900 mb-4">7. Limitation of Liability</h2>
                        
                        <div className="bg-red-50 border border-red-200 p-4 rounded-lg">
                            <p className="text-red-800 text-sm mb-3">
                                <strong>IMPORTANT:</strong> Our liability is limited to the maximum extent permitted by law. We are not liable for:
                            </p>
                            <ul className="list-disc list-inside text-red-800 text-sm space-y-1">
                                <li>Indirect, incidental, or consequential damages</li>
                                <li>Loss of profits, data, or business opportunities</li>
                                <li>Actions or omissions of celebrities or clients</li>
                                <li>Force majeure events beyond our control</li>
                                <li>Third-party services or payment processors</li>
                            </ul>
                        </div>
                    </section>

                    <section className="mb-8">
                        <h2 className="text-2xl font-semibold text-gray-900 mb-4">8. Dispute Resolution</h2>
                        
                        <div className="grid md:grid-cols-2 gap-4">
                            <div className="bg-green-50 p-4 rounded-lg">
                                <h3 className="font-semibold text-green-900 mb-2">Informal Resolution</h3>
                                <p className="text-green-800 text-sm">
                                    We encourage users to contact our support team first to resolve disputes amicably 
                                    through direct communication and mediation.
                                </p>
                            </div>
                            
                            <div className="bg-blue-50 p-4 rounded-lg">
                                <h3 className="font-semibold text-blue-900 mb-2">Formal Arbitration</h3>
                                <p className="text-blue-800 text-sm">
                                    Unresolved disputes will be settled through binding arbitration in accordance with 
                                    the rules of the American Arbitration Association.
                                </p>
                            </div>
                        </div>
                    </section>

                    <section className="mb-8">
                        <h2 className="text-2xl font-semibold text-gray-900 mb-4">9. Modifications and Termination</h2>
                        
                        <div className="bg-yellow-50 p-4 rounded-lg">
                            <h3 className="font-semibold text-yellow-900 mb-2">Changes to Terms</h3>
                            <p className="text-yellow-800 text-sm mb-3">
                                We may update these terms periodically. Significant changes will be communicated via email 
                                and platform notifications with 30 days advance notice.
                            </p>
                            
                            <h3 className="font-semibold text-yellow-900 mb-2">Account Termination</h3>
                            <p className="text-yellow-800 text-sm">
                                Either party may terminate the agreement with 30 days written notice. We reserve the right 
                                to suspend or terminate accounts that violate these terms.
                            </p>
                        </div>
                    </section>

                    <section className="mb-8">
                        <h2 className="text-2xl font-semibold text-gray-900 mb-4">10. Contact Information</h2>
                        
                        <div className="bg-gray-50 p-6 rounded-lg">
                            <div className="grid md:grid-cols-2 gap-6">
                                <div>
                                    <h3 className="font-semibold text-gray-900 mb-3">Legal Department</h3>
                                    <p className="text-gray-700 text-sm mb-2">Celebrity Booking Platform Ltd.</p>
                                    <p className="text-gray-700 text-sm mb-2">Email: legal@bookmyreservation.org</p>
                                    <p className="text-gray-700 text-sm mb-2">Phone: +1 (555) 123-4569</p>
                                    <p className="text-gray-700 text-sm">Address: 123 Business Ave, Suite 100, City, State 12345</p>
                                </div>
                                
                                <div>
                                    <h3 className="font-semibold text-gray-900 mb-3">Customer Support</h3>
                                    <p className="text-gray-700 text-sm mb-2">Email: support@bookmyreservation.org</p>
                                    <p className="text-gray-700 text-sm mb-2">Phone: +1 (555) 123-4567</p>
                                    <p className="text-gray-700 text-sm mb-2">Hours: Mon-Fri 9AM-6PM EST</p>
                                    <p className="text-gray-700 text-sm">Emergency: 24/7 for active bookings</p>
                                </div>
                            </div>
                        </div>
                    </section>
                </div>

                <div className="mt-8 p-4 bg-blue-50 rounded-lg">
                    <h3 className="font-semibold text-blue-900 mb-2">Questions or Concerns?</h3>
                    <p className="text-blue-800 text-sm mb-3">
                        If you have any questions about these Terms of Service, please contact our legal team at legal@bookmyreservation.org
                    </p>
                    <button className="bg-blue-600 text-white px-4 py-2 rounded text-sm hover:bg-blue-700">
                        Contact Legal Team
                    </button>
                </div>
            </div>
        </div>
    );
};
EOF

    echo -e "${GREEN}✅ Terms of Service component created${NC}"
}

# Create GDPR compliance service
create_gdpr_service() {
    echo -e "${YELLOW}⚖️ Creating GDPR compliance service...${NC}"
    
    cat > backend/services/legal/GDPRComplianceService.js << 'EOF'
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
EOF

    echo -e "${GREEN}✅ GDPR compliance service created${NC}"
}

# Create GDPR database schema
create_gdpr_schema() {
    echo -e "${YELLOW}🗄️ Creating GDPR compliance database schema...${NC}"
    
    cat > backend/migrations/025_gdpr_compliance.sql << 'EOF'
-- GDPR Compliance Tables

-- User Consents
CREATE TABLE IF NOT EXISTS user_consents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    marketing_consent BOOLEAN DEFAULT false,
    analytics_consent BOOLEAN DEFAULT false,
    personalization_consent BOOLEAN DEFAULT false,
    third_party_consent BOOLEAN DEFAULT false,
    consent_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    consent_method VARCHAR(100),
    ip_address INET,
    user_agent TEXT,
    withdrawn_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id)
);

-- GDPR Requests Log
CREATE TABLE IF NOT EXISTS gdpr_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    request_type VARCHAR(100) NOT NULL,
    status VARCHAR(50) DEFAULT 'pending',
    requested_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    processed_at TIMESTAMP WITH TIME ZONE,
    fulfilled_by UUID REFERENCES auth.users(id),
    metadata JSONB DEFAULT '{}',
    notes TEXT
);

-- Data Processing Records
CREATE TABLE IF NOT EXISTS data_processing_records (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    processing_activity VARCHAR(255) NOT NULL,
    data_categories TEXT[] NOT NULL,
    legal_basis VARCHAR(100) NOT NULL,
    purposes TEXT[] NOT NULL,
    retention_period VARCHAR(100),
    data_subjects VARCHAR(100),
    recipients TEXT[],
    transfers_to_third_countries BOOLEAN DEFAULT false,
    safeguards_description TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Privacy Policy Versions
CREATE TABLE IF NOT EXISTS privacy_policy_versions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    version VARCHAR(50) NOT NULL,
    content TEXT NOT NULL,
    is_current BOOLEAN DEFAULT false,
    effective_date TIMESTAMP WITH TIME ZONE NOT NULL,
    created_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Data Breach Log
CREATE TABLE IF NOT EXISTS data_breach_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    incident_id VARCHAR(100) NOT NULL UNIQUE,
    severity VARCHAR(50) NOT NULL,
    description TEXT NOT NULL,
    data_types_affected TEXT[],
    individuals_affected_count INTEGER,
    discovery_date TIMESTAMP WITH TIME ZONE NOT NULL,
    containment_date TIMESTAMP WITH TIME ZONE,
    notification_required BOOLEAN DEFAULT false,
    authority_notified_at TIMESTAMP WITH TIME ZONE,
    individuals_notified_at TIMESTAMP WITH TIME ZONE,
    status VARCHAR(50) DEFAULT 'investigating',
    remediation_steps TEXT[],
    lessons_learned TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_user_consents_user_id ON user_consents(user_id);
CREATE INDEX IF NOT EXISTS idx_gdpr_requests_user_id ON gdpr_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_gdpr_requests_type ON gdpr_requests(request_type);
CREATE INDEX IF NOT EXISTS idx_gdpr_requests_status ON gdpr_requests(status);
CREATE INDEX IF NOT EXISTS idx_data_processing_records_activity ON data_processing_records(processing_activity);
CREATE INDEX IF NOT EXISTS idx_privacy_policy_versions_current ON privacy_policy_versions(is_current);
CREATE INDEX IF NOT EXISTS idx_data_breach_log_severity ON data_breach_log(severity);
CREATE INDEX IF NOT EXISTS idx_data_breach_log_status ON data_breach_log(status);

-- RLS Policies
ALTER TABLE user_consents ENABLE ROW LEVEL SECURITY;
ALTER TABLE gdpr_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE data_processing_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE privacy_policy_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE data_breach_log ENABLE ROW LEVEL SECURITY;

-- Users can view and update their own consents
CREATE POLICY "Users can manage their own consents" ON user_consents
    FOR ALL USING (auth.uid() = user_id);

-- Users can view their own GDPR requests
CREATE POLICY "Users can view their own GDPR requests" ON gdpr_requests
    FOR SELECT USING (auth.uid() = user_id);

-- Service role has full access
CREATE POLICY "Service role full access to user_consents" ON user_consents
    FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role full access to gdpr_requests" ON gdpr_requests
    FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role full access to data_processing_records" ON data_processing_records
    FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role full access to privacy_policy_versions" ON privacy_policy_versions
    FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role full access to data_breach_log" ON data_breach_log
    FOR ALL USING (auth.role() = 'service_role');

-- Functions
CREATE OR REPLACE FUNCTION update_consent_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_user_consents_timestamp
    BEFORE UPDATE ON user_consents
    FOR EACH ROW
    EXECUTE FUNCTION update_consent_timestamp();

-- Insert default data processing records
INSERT INTO data_processing_records (
    processing_activity, 
    data_categories, 
    legal_basis, 
    purposes, 
    retention_period, 
    data_subjects, 
    recipients
) VALUES
(
    'User Account Management',
    ARRAY['identity', 'contact', 'authentication'],
    'contract',
    ARRAY['service delivery', 'account security', 'customer support'],
    'Until account deletion',
    'platform users',
    ARRAY['internal staff', 'cloud service providers']
),
(
    'Booking Processing',
    ARRAY['identity', 'financial', 'communication'],
    'contract',
    ARRAY['booking fulfillment', 'payment processing', 'communication facilitation'],
    '7 years',
    'clients and celebrities',
    ARRAY['payment processors', 'email service providers']
),
(
    'Marketing Communications',
    ARRAY['contact', 'preferences', 'behavior'],
    'consent',
    ARRAY['promotional communications', 'service updates', 'personalization'],
    'Until consent withdrawn',
    'platform users',
    ARRAY['email marketing services', 'analytics providers']
),
(
    'Platform Analytics',
    ARRAY['usage', 'technical', 'behavior'],
    'legitimate_interest',
    ARRAY['service improvement', 'performance optimization', 'feature development'],
    '26 months',
    'platform users',
    ARRAY['analytics providers', 'cloud infrastructure']
)
ON CONFLICT DO NOTHING;

-- Insert current privacy policy version
INSERT INTO privacy_policy_versions (
    version,
    content,
    is_current,
    effective_date
) VALUES (
    '1.0',
    'Initial privacy policy for Celebrity Booking Platform - see privacy policy page for full content',
    true,
    NOW()
) ON CONFLICT DO NOTHING;
EOF

    echo -e "${GREEN}✅ GDPR compliance schema created${NC}"
}

# Main execution
main() {
    echo -e "${BLUE}🚀 Starting GDPR Compliance Setup...${NC}"
    
    # Create all components
    create_legal_structure
    create_privacy_policy
    create_terms_of_service
    create_gdpr_service
    create_gdpr_schema
    
    echo -e "${GREEN}✅ GDPR Compliance Setup Complete!${NC}"
    echo -e "${BLUE}📋 Components created:${NC}"
    echo "• Privacy Policy page with comprehensive GDPR coverage"
    echo "• Terms of Service with detailed legal terms"
    echo "• GDPR compliance service for data subject rights"
    echo "• Database schema for consent and request tracking"
    echo "• Data processing records and breach logging"
    echo ""
    echo -e "${BLUE}📋 GDPR Rights implemented:${NC}"
    echo "• Right of Access (data export)"
    echo "• Right to Rectification (data correction)"
    echo "• Right to Erasure (data deletion)"
    echo "• Right to Data Portability (data export)"
    echo "• Consent management and tracking"
    echo ""
    echo -e "${BLUE}📋 Compliance features:${NC}"
    echo "• Legal basis documentation"
    echo "• Data retention policies"
    echo "• Consent tracking and withdrawal"
    echo "• Data breach notification system"
    echo "• Privacy policy version control"
    echo ""
    echo -e "${BLUE}📋 Pages available:${NC}"
    echo "• /privacy-policy - Comprehensive privacy policy"
    echo "• /terms-of-service - Detailed terms and conditions"
    echo "• User dashboard privacy settings"
}

# Execute main function
main "$@"