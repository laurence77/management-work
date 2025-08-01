const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

const templates = [
    {
        name: 'welcome',
        subject: 'Welcome to Celebrity Booking Platform, {{firstName}}!',
        template_type: 'welcome',
        html_content: fs.readFileSync(path.join(__dirname, '../email-templates/welcome/welcome.html'), 'utf8'),
        text_content: 'Welcome {{firstName}}! Thank you for joining Celebrity Booking Platform.',
        variables: ['firstName', 'dashboardUrl', 'unsubscribeUrl', 'supportUrl']
    },
    {
        name: 'booking-confirmation',
        subject: 'Booking Confirmed - {{celebrityName}} on {{eventDate}}',
        template_type: 'booking',
        html_content: fs.readFileSync(path.join(__dirname, '../email-templates/booking/confirmation.html'), 'utf8'),
        text_content: 'Your booking for {{celebrityName}} on {{eventDate}} has been confirmed. Booking ID: {{bookingId}}',
        variables: ['clientName', 'bookingId', 'celebrityName', 'eventDate', 'eventTime', 'eventLocation', 'duration', 'totalAmount', 'status', 'bookingUrl', 'supportUrl']
    },
    {
        name: 'payment-receipt',
        subject: 'Payment Receipt - ${{totalAmount}} for {{celebrityName}}',
        template_type: 'payment',
        html_content: fs.readFileSync(path.join(__dirname, '../email-templates/payment/receipt.html'), 'utf8'),
        text_content: 'Payment receipt for ${{totalAmount}}. Transaction ID: {{transactionId}}',
        variables: ['clientName', 'transactionId', 'paymentDate', 'amountPaid', 'paymentMethod', 'paymentStatus', 'celebrityName', 'eventDate', 'bookingAmount', 'platformFee', 'taxes', 'totalAmount', 'supportUrl']
    }
];

async function seedTemplates() {
    console.log('🌱 Seeding email templates...');
    
    for (const template of templates) {
        try {
            const { data, error } = await supabase
                .from('email_templates')
                .upsert(template, { 
                    onConflict: 'name',
                    ignoreDuplicates: false 
                });

            if (error) {
                console.error(`❌ Failed to seed template ${template.name}:`, error);
            } else {
                console.log(`✅ Seeded template: ${template.name}`);
            }
        } catch (error) {
            console.error(`❌ Error seeding template ${template.name}:`, error);
        }
    }
    
    console.log('🎉 Template seeding completed!');
}

seedTemplates().catch(console.error);