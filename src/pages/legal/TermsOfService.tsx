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
