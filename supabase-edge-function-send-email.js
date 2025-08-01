// Supabase Edge Function: send-email
// Save this as: supabase/functions/send-email/index.ts

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

const RESEND_API_KEY = 'your_resend_api_key_here' // Get free API key from resend.com

serve(async (req) => {
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 })
  }

  try {
    const { to, subject, html, type = 'general' } = await req.json()

    // Send email using Resend API (free tier: 3000 emails/month)
    const emailResponse = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'BookMyReservation <management@bookmyreservation.org>',
        to: [to],
        subject: subject,
        html: html,
      }),
    })

    const result = await emailResponse.json()

    if (!emailResponse.ok) {
      throw new Error(`Email sending failed: ${result.message}`)
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Email sent successfully',
        email_id: result.id,
        type: type
      }),
      { 
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      }
    )

  } catch (error) {
    console.error('Email sending error:', error)
    
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message 
      }),
      { 
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      }
    )
  }
})

// Alternative using SMTP (if you prefer Gmail/Outlook)
/*
import { SMTPClient } from 'https://deno.land/x/denomailer@1.6.0/mod.ts'

const client = new SMTPClient({
  connection: {
    hostname: 'smtp.gmail.com',
    port: 587,
    tls: true,
    auth: {
      username: 'your-email@gmail.com',
      password: 'your-app-password', // Use App Password for Gmail
    },
  },
})

// In the serve function:
await client.send({
  from: 'BookMyReservation <your-email@gmail.com>',
  to: to,
  subject: subject,
  content: html,
  html: html,
})
*/