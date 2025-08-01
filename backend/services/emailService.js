const nodemailer = require('nodemailer');
const { supabase } = require('../config/supabase');

class EmailService {
  constructor() {
    this.transporter = null;
    this.initialized = false;
    this.init();
  }

  async init() {
    try {
      // Configure email transporter based on environment
      if (process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS) {
        // Production SMTP configuration
        this.transporter = nodemailer.createTransport({
          host: process.env.SMTP_HOST,
          port: parseInt(process.env.SMTP_PORT) || 587,
          secure: process.env.SMTP_SECURE === 'true',
          auth: {
            user: process.env.SMTP_USER,
            pass: process.env.SMTP_PASS
          },
          tls: {
            rejectUnauthorized: false
          }
        });
      } else if (process.env.NODE_ENV === 'development') {
        // Development with Ethereal Email (fake SMTP)
        const testAccount = await nodemailer.createTestAccount();
        this.transporter = nodemailer.createTransport({
          host: 'smtp.ethereal.email',
          port: 587,
          secure: false,
          auth: {
            user: testAccount.user,
            pass: testAccount.pass
          }
        });
        console.log('📧 Using Ethereal Email for development');
      } else {
        console.warn('⚠️ No email configuration found - email sending disabled');
        return;
      }

      // Verify transporter configuration
      await this.transporter.verify();
      this.initialized = true;
      console.log('✅ Email service initialized successfully');

    } catch (error) {
      console.error('❌ Email service initialization failed:', error.message);
      this.initialized = false;
    }
  }

  async sendEmail({ to, subject, html, text, attachments = [] }) {
    if (!this.initialized) {
      console.warn('Email service not initialized - skipping email send');
      return { success: false, message: 'Email service not available' };
    }

    try {
      const mailOptions = {
        from: process.env.EMAIL_FROM || '"Celebrity Booking Platform" <noreply@example.com>',
        to,
        subject,
        html,
        text: text || this.stripHtml(html),
        attachments
      };

      const info = await this.transporter.sendMail(mailOptions);
      
      // Log email for development
      if (process.env.NODE_ENV === 'development') {
        console.log('📧 Email sent:', nodemailer.getTestMessageUrl(info));
      }

      // Store email log in database
      await this.logEmail({
        recipient: to,
        subject,
        status: 'sent',
        messageId: info.messageId,
        providerResponse: info
      });

      return { 
        success: true, 
        messageId: info.messageId,
        previewUrl: process.env.NODE_ENV === 'development' ? nodemailer.getTestMessageUrl(info) : null
      };

    } catch (error) {
      console.error('Email sending failed:', error);
      
      // Store failed email log
      await this.logEmail({
        recipient: to,
        subject,
        status: 'failed',
        error: error.message
      });

      return { success: false, message: error.message };
    }
  }

  async logEmail({ recipient, subject, status, messageId, providerResponse, error }) {
    try {
      await supabase
        .from('email_logs')
        .insert([{
          recipient,
          subject,
          status,
          message_id: messageId,
          provider_response: providerResponse,
          error_message: error,
          created_at: new Date().toISOString()
        }]);
    } catch (logError) {
      console.error('Failed to log email:', logError);
    }
  }

  stripHtml(html) {
    if (!html) return '';
    return html.replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim();
  }

  // Email Templates
  getWelcomeTemplate(userInfo) {
    return {
      subject: 'Welcome to Celebrity Booking Platform!',
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
            .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
            .button { display: inline-block; background: #667eea; color: white; padding: 12px 25px; text-decoration: none; border-radius: 5px; margin: 15px 0; }
            .footer { text-align: center; margin-top: 30px; color: #666; font-size: 14px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>Welcome to Celebrity Booking Platform!</h1>
            </div>
            <div class="content">
              <h2>Hello ${userInfo.firstName}!</h2>
              <p>Thank you for joining our exclusive celebrity booking platform. You now have access to:</p>
              <ul>
                <li>🌟 Book A-list celebrities for your events</li>
                <li>🎭 Access exclusive entertainment services</li>
                <li>📅 Manage your bookings and events</li>
                <li>💎 VIP membership benefits</li>
              </ul>
              <p>Ready to get started?</p>
              <a href="${process.env.FRONTEND_URL}/dashboard" class="button">Explore Platform</a>
            </div>
            <div class="footer">
              <p>Need help? Contact us at support@celebritybooking.com</p>
            </div>
          </div>
        </body>
        </html>
      `
    };
  }

  getBookingConfirmationTemplate(bookingInfo) {
    return {
      subject: `Booking Confirmed - ${bookingInfo.title}`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: #28a745; color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
            .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
            .booking-details { background: white; padding: 20px; border-radius: 8px; margin: 20px 0; }
            .detail-row { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #eee; }
            .button { display: inline-block; background: #28a745; color: white; padding: 12px 25px; text-decoration: none; border-radius: 5px; margin: 15px 0; }
            .footer { text-align: center; margin-top: 30px; color: #666; font-size: 14px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>✅ Booking Confirmed!</h1>
            </div>
            <div class="content">
              <h2>Great news, ${bookingInfo.customerName}!</h2>
              <p>Your booking has been confirmed. Here are the details:</p>
              
              <div class="booking-details">
                <div class="detail-row">
                  <strong>Booking ID:</strong>
                  <span>${bookingInfo.bookingId}</span>
                </div>
                <div class="detail-row">
                  <strong>Event/Celebrity:</strong>
                  <span>${bookingInfo.title}</span>
                </div>
                <div class="detail-row">
                  <strong>Date:</strong>
                  <span>${new Date(bookingInfo.date).toLocaleDateString()}</span>
                </div>
                <div class="detail-row">
                  <strong>Time:</strong>
                  <span>${bookingInfo.time || 'TBD'}</span>
                </div>
                <div class="detail-row">
                  <strong>Location:</strong>
                  <span>${bookingInfo.location}</span>
                </div>
                <div class="detail-row">
                  <strong>Total Amount:</strong>
                  <span>$${bookingInfo.amount}</span>
                </div>
                <div class="detail-row">
                  <strong>Payment Status:</strong>
                  <span>${bookingInfo.paymentStatus}</span>
                </div>
              </div>

              <p><strong>Next Steps:</strong></p>
              <ul>
                <li>You'll receive a calendar invite within 24 hours</li>
                <li>Our team will contact you 48 hours before the event</li>
                <li>Any special requests will be confirmed separately</li>
              </ul>

              <a href="${process.env.FRONTEND_URL}/bookings/${bookingInfo.id}" class="button">View Booking Details</a>
            </div>
            <div class="footer">
              <p>Questions? Contact us at bookings@celebritybooking.com or call (555) 123-4567</p>
            </div>
          </div>
        </body>
        </html>
      `
    };
  }

  getPaymentConfirmationTemplate(paymentInfo) {
    return {
      subject: 'Payment Confirmed - Thank You!',
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: #007bff; color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
            .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
            .payment-details { background: white; padding: 20px; border-radius: 8px; margin: 20px 0; }
            .detail-row { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #eee; }
            .amount { font-size: 24px; font-weight: bold; color: #007bff; text-align: center; margin: 20px 0; }
            .button { display: inline-block; background: #007bff; color: white; padding: 12px 25px; text-decoration: none; border-radius: 5px; margin: 15px 0; }
            .footer { text-align: center; margin-top: 30px; color: #666; font-size: 14px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>💳 Payment Confirmed!</h1>
            </div>
            <div class="content">
              <h2>Thank you, ${paymentInfo.customerName}!</h2>
              <p>Your payment has been successfully processed and confirmed.</p>
              
              <div class="amount">$${paymentInfo.amount}</div>
              
              <div class="payment-details">
                <div class="detail-row">
                  <strong>Transaction ID:</strong>
                  <span>${paymentInfo.transactionId}</span>
                </div>
                <div class="detail-row">
                  <strong>Payment Method:</strong>
                  <span>${paymentInfo.paymentMethod}</span>
                </div>
                <div class="detail-row">
                  <strong>Date Processed:</strong>
                  <span>${new Date(paymentInfo.processedAt).toLocaleDateString()}</span>
                </div>
                <div class="detail-row">
                  <strong>Booking Reference:</strong>
                  <span>${paymentInfo.bookingId}</span>
                </div>
              </div>

              <p>Your booking is now fully confirmed and our team will be in touch with final details.</p>
              
              <a href="${process.env.FRONTEND_URL}/bookings/${paymentInfo.bookingId}" class="button">View Booking</a>
            </div>
            <div class="footer">
              <p>Keep this email for your records. For questions, contact finance@celebritybooking.com</p>
            </div>
          </div>
        </body>
        </html>
      `
    };
  }

  getCancellationTemplate(cancellationInfo) {
    return {
      subject: 'Booking Cancelled - Refund Information',
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: #dc3545; color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
            .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
            .refund-info { background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #28a745; }
            .detail-row { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #eee; }
            .refund-amount { font-size: 20px; font-weight: bold; color: #28a745; }
            .button { display: inline-block; background: #6c757d; color: white; padding: 12px 25px; text-decoration: none; border-radius: 5px; margin: 15px 0; }
            .footer { text-align: center; margin-top: 30px; color: #666; font-size: 14px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>Booking Cancelled</h1>
            </div>
            <div class="content">
              <h2>Hello ${cancellationInfo.customerName},</h2>
              <p>Your booking has been cancelled as requested. Here are the details:</p>
              
              <div class="detail-row">
                <strong>Booking ID:</strong>
                <span>${cancellationInfo.bookingId}</span>
              </div>
              <div class="detail-row">
                <strong>Event/Celebrity:</strong>
                <span>${cancellationInfo.title}</span>
              </div>
              <div class="detail-row">
                <strong>Original Date:</strong>
                <span>${new Date(cancellationInfo.date).toLocaleDateString()}</span>
              </div>
              <div class="detail-row">
                <strong>Cancelled On:</strong>
                <span>${new Date().toLocaleDateString()}</span>
              </div>

              ${cancellationInfo.refundAmount > 0 ? `
                <div class="refund-info">
                  <h3>Refund Information</h3>
                  <div class="detail-row">
                    <strong>Refund Amount:</strong>
                    <span class="refund-amount">$${cancellationInfo.refundAmount}</span>
                  </div>
                  <div class="detail-row">
                    <strong>Processing Time:</strong>
                    <span>3-5 business days</span>
                  </div>
                  <div class="detail-row">
                    <strong>Refund Method:</strong>
                    <span>Original payment method</span>
                  </div>
                </div>
              ` : `
                <div class="refund-info">
                  <h3>Refund Policy</h3>
                  <p>Unfortunately, no refund is applicable based on our cancellation policy for bookings cancelled within 24 hours of the event.</p>
                </div>
              `}

              <p>We're sorry to see you cancel and hope to serve you again in the future.</p>
              
              <a href="${process.env.FRONTEND_URL}/support" class="button">Contact Support</a>
            </div>
            <div class="footer">
              <p>If you have questions about this cancellation, contact support@celebritybooking.com</p>
            </div>
          </div>
        </body>
        </html>
      `
    };
  }

  getPasswordResetTemplate(resetInfo) {
    return {
      subject: 'Password Reset Request',
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: #fd7e14; color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
            .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
            .security-info { background: #fff3cd; border: 1px solid #ffeaa7; padding: 15px; border-radius: 5px; margin: 20px 0; }
            .button { display: inline-block; background: #fd7e14; color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; margin: 20px 0; font-size: 16px; }
            .footer { text-align: center; margin-top: 30px; color: #666; font-size: 14px; }
            .expire-note { color: #dc3545; font-weight: bold; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>🔒 Password Reset Request</h1>
            </div>
            <div class="content">
              <h2>Hello ${resetInfo.userName},</h2>
              <p>We received a request to reset your password. If you made this request, click the button below to set a new password:</p>
              
              <div style="text-align: center;">
                <a href="${resetInfo.resetUrl}" class="button">Reset Password</a>
              </div>

              <div class="security-info">
                <h4>Security Information:</h4>
                <ul>
                  <li>This link will expire in <span class="expire-note">1 hour</span></li>
                  <li>You can only use this link once</li>
                  <li>If you didn't request this, please ignore this email</li>
                </ul>
              </div>

              <p>For security reasons, if you didn't request this password reset, please contact our support team immediately.</p>
              
              <p><strong>Request Details:</strong></p>
              <ul>
                <li>Requested at: ${new Date(resetInfo.requestedAt).toLocaleString()}</li>
                <li>IP Address: ${resetInfo.ipAddress}</li>
                <li>User Agent: ${resetInfo.userAgent?.substring(0, 50)}...</li>
              </ul>
            </div>
            <div class="footer">
              <p>If you need help, contact security@celebritybooking.com</p>
              <p>This is an automated email - please do not reply</p>
            </div>
          </div>
        </body>
        </html>
      `
    };
  }

  // Convenience methods for common email types
  async sendWelcomeEmail(userInfo) {
    const template = this.getWelcomeTemplate(userInfo);
    return await this.sendEmail({
      to: userInfo.email,
      ...template
    });
  }

  async sendBookingConfirmation(bookingInfo) {
    const template = this.getBookingConfirmationTemplate(bookingInfo);
    return await this.sendEmail({
      to: bookingInfo.customerEmail,
      ...template
    });
  }

  async sendPaymentConfirmation(paymentInfo) {
    const template = this.getPaymentConfirmationTemplate(paymentInfo);
    return await this.sendEmail({
      to: paymentInfo.customerEmail,
      ...template
    });
  }

  async sendCancellationNotice(cancellationInfo) {
    const template = this.getCancellationTemplate(cancellationInfo);
    return await this.sendEmail({
      to: cancellationInfo.customerEmail,
      ...template
    });
  }

  async sendPasswordReset(resetInfo) {
    const template = this.getPasswordResetTemplate(resetInfo);
    return await this.sendEmail({
      to: resetInfo.email,
      ...template
    });
  }
}

// Export singleton instance
module.exports = new EmailService();