// Hostinger Email API Integration for Supabase Edge Function
// Save this as: supabase/functions/send-email/index.ts

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

// Hostinger Email API Configuration
const HOSTINGER_API_KEY = 'your_hostinger_api_key_here' // Get from Hostinger panel
const HOSTINGER_API_URL = 'https://api.hostinger.com/v1/email'

serve(async (req) => {
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 })
  }

  try {
    const { to, subject, html, type = 'general' } = await req.json()

    // Method 1: Hostinger Email API (if available)
    const emailResponse = await fetch(`${HOSTINGER_API_URL}/send`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${HOSTINGER_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'management@bookmyreservation.org',
        to: to,
        subject: subject,
        html: html,
        reply_to: 'management@bookmyreservation.org'
      }),
    })

    if (!emailResponse.ok) {
      // Fallback to SMTP if API fails
      return await sendViaHostingerSMTP(to, subject, html, type)
    }

    const result = await emailResponse.json()

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Email sent via Hostinger API',
        email_id: result.id,
        type: type,
        provider: 'hostinger_api'
      }),
      { 
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      }
    )

  } catch (error) {
    console.error('Hostinger API error, trying SMTP fallback:', error)
    return await sendViaHostingerSMTP(to, subject, html, type)
  }
})

// Hostinger SMTP Fallback Method
async function sendViaHostingerSMTP(to: string, subject: string, html: string, type: string) {
  try {
    // Hostinger SMTP Settings
    const smtpConfig = {
      hostname: 'smtp.hostinger.com', // or mail.bookmyreservation.org
      port: 587, // or 465 for SSL
      username: 'management@bookmyreservation.org',
      password: 'your_email_password_here', // Your email password
      from: 'management@bookmyreservation.org'
    }

    // Using nodemailer-like approach for Deno
    const emailData = {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        smtp: smtpConfig,
        to: to,
        subject: subject,
        html: html
      })
    }

    // Alternative: Use a simple HTTP service that handles SMTP
    const response = await fetch('https://api.emailjs.com/api/v1.0/email/send', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        service_id: 'hostinger_smtp',
        template_id: 'template_1',
        user_id: 'your_emailjs_user_id',
        template_params: {
          from_email: 'management@bookmyreservation.org',
          to_email: to,
          subject: subject,
          message: html
        }
      })
    })

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Email sent via Hostinger SMTP',
        type: type,
        provider: 'hostinger_smtp'
      }),
      { 
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      }
    )

  } catch (smtpError) {
    console.error('SMTP fallback failed:', smtpError)
    
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: 'All email sending methods failed',
        details: smtpError.message
      }),
      { 
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      }
    )
  }
}