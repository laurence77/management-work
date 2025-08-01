import { serve } from 'https://deno.land/std@0.208.0/http/server.ts'
import { SMTPClient } from 'https://deno.land/x/denomailer@1.6.0/mod.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

interface EmailRequest {
  to: string | string[]
  subject: string
  html?: string
  text?: string
  type?: string
  priority?: 'high' | 'normal' | 'low'
  template?: string
  variables?: Record<string, any>
}

interface EmailTemplate {
  id: string
  name: string
  subject: string
  html_content: string
  text_content?: string
  variables: string[]
}

// Initialize Supabase client for logging
const supabaseUrl = Deno.env.get('SUPABASE_URL')!
const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const supabase = createClient(supabaseUrl, supabaseKey)

// Email templates
const templates: Record<string, EmailTemplate> = {
  welcome: {
    id: 'welcome',
    name: 'Welcome Email',
    subject: 'Welcome to Celebrity Booking Platform!',
    html_content: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h1 style="color: #333;">Welcome, {{name}}!</h1>
        <p>Thank you for joining our celebrity booking platform.</p>
        <p>You can now browse and book amazing celebrities for your events.</p>
        <a href="{{dashboard_url}}" style="background: #007bff; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">
          Go to Dashboard
        </a>
      </div>
    `,
    variables: ['name', 'dashboard_url']
  },
  booking_confirmation: {
    id: 'booking_confirmation',
    name: 'Booking Confirmation',
    subject: 'Booking Confirmed - {{celebrity_name}}',
    html_content: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h1 style="color: #28a745;">Booking Confirmed!</h1>
        <p>Hi {{customer_name}},</p>
        <p>Your booking with <strong>{{celebrity_name}}</strong> has been confirmed.</p>
        <div style="background: #f8f9fa; padding: 20px; border-radius: 5px; margin: 20px 0;">
          <h3>Booking Details:</h3>
          <p><strong>Event Date:</strong> {{event_date}}</p>
          <p><strong>Event Type:</strong> {{event_type}}</p>
          <p><strong>Duration:</strong> {{duration}}</p>
          <p><strong>Total Amount:</strong> {{total_amount}}</p>
        </div>
        <p>We'll be in touch with more details soon!</p>
      </div>
    `,
    variables: ['customer_name', 'celebrity_name', 'event_date', 'event_type', 'duration', 'total_amount']
  },
  password_reset: {
    id: 'password_reset',
    name: 'Password Reset',
    subject: 'Reset Your Password',
    html_content: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h1 style="color: #333;">Password Reset Request</h1>
        <p>You requested to reset your password. Click the button below to set a new password:</p>
        <a href="{{reset_url}}" style="background: #dc3545; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">
          Reset Password
        </a>
        <p><small>This link will expire in 1 hour. If you didn't request this, please ignore this email.</small></p>
      </div>
    `,
    variables: ['reset_url']
  },
  admin_notification: {
    id: 'admin_notification',
    name: 'Admin Notification',
    subject: 'Admin Alert: {{alert_type}}',
    html_content: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h1 style="color: #ffc107;">Admin Alert</h1>
        <p><strong>Alert Type:</strong> {{alert_type}}</p>
        <p><strong>Message:</strong> {{message}}</p>
        <div style="background: #f8f9fa; padding: 15px; border-left: 4px solid #ffc107;">
          {{details}}
        </div>
        <p><small>Timestamp: {{timestamp}}</small></p>
      </div>
    `,
    variables: ['alert_type', 'message', 'details', 'timestamp']
  }
}

function replaceVariables(content: string, variables: Record<string, any>): string {
  return content.replace(/\{\{(\w+)\}\}/g, (match, key) => {
    return variables[key] || match
  })
}

function validateEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailRegex.test(email)
}

async function logEmailActivity(
  type: string,
  to: string | string[],
  subject: string,
  success: boolean,
  error?: string
) {
  try {
    await supabase.from('email_logs').insert({
      type,
      recipient: Array.isArray(to) ? to.join(', ') : to,
      subject,
      success,
      error_message: error,
      sent_at: new Date().toISOString()
    })
  } catch (logError) {
    console.error('Failed to log email activity:', logError)
  }
}

async function createSMTPClient(): Promise<SMTPClient> {
  const smtpUsername = Deno.env.get('SMTP_USERNAME')
  const smtpPassword = Deno.env.get('SMTP_PASSWORD')
  
  if (!smtpUsername || !smtpPassword) {
    throw new Error('SMTP credentials not configured')
  }

  return new SMTPClient({
    connection: {
      hostname: 'smtp.hostinger.com',
      port: 587,
      tls: true,
      auth: {
        username: smtpUsername,
        password: smtpPassword,
      },
    },
  })
}

serve(async (req) => {
  // CORS headers
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
  }

  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 200, headers: corsHeaders })
  }

  if (req.method !== 'POST') {
    return new Response(
      JSON.stringify({ success: false, error: 'Method not allowed' }),
      { 
        status: 405,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  }

  try {
    const emailRequest: EmailRequest = await req.json()
    const { to, subject, html, text, type = 'general', priority = 'normal', template, variables = {} } = emailRequest

    // Validate required fields
    if (!to || !subject) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Missing required fields: to, subject' 
        }),
        { 
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    // Validate email addresses
    const recipients = Array.isArray(to) ? to : [to]
    for (const email of recipients) {
      if (!validateEmail(email)) {
        return new Response(
          JSON.stringify({ 
            success: false, 
            error: `Invalid email address: ${email}` 
          }),
          { 
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          }
        )
      }
    }

    let emailHtml = html
    let emailSubject = subject

    // Use template if specified
    if (template && templates[template]) {
      const templateData = templates[template]
      emailHtml = replaceVariables(templateData.html_content, variables)
      emailSubject = replaceVariables(templateData.subject, variables)
    }

    // Ensure we have content
    if (!emailHtml && !text) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Email content (html or text) is required' 
        }),
        { 
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    // Create and configure SMTP client
    const client = await createSMTPClient()

    // Prepare email options
    const fromAddress = Deno.env.get('SMTP_USERNAME') || 'management@bookmyreservation.org'
    const fromName = 'Celebrity Booking Platform'

    // Send email
    const emailOptions: any = {
      from: `${fromName} <${fromAddress}>`,
      to: recipients,
      subject: emailSubject,
    }

    if (emailHtml) {
      emailOptions.html = emailHtml
    }
    if (text) {
      emailOptions.content = text
    }

    // Set priority headers
    if (priority === 'high') {
      emailOptions.headers = {
        'X-Priority': '1',
        'X-MSMail-Priority': 'High',
        'Importance': 'high'
      }
    }

    await client.send(emailOptions)
    await client.close()

    // Log successful email
    await logEmailActivity(type, to, emailSubject, true)

    const response = {
      success: true,
      message: 'Email sent successfully',
      details: {
        to: recipients,
        subject: emailSubject,
        type,
        priority,
        template: template || null,
        provider: 'hostinger_smtp',
        timestamp: new Date().toISOString()
      }
    }

    return new Response(
      JSON.stringify(response),
      { 
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )

  } catch (error) {
    console.error('Email sending error:', error)

    // Log failed email attempt
    try {
      const body = await req.clone().json()
      await logEmailActivity(
        body.type || 'general',
        body.to || 'unknown',
        body.subject || 'unknown',
        false,
        error.message
      )
    } catch (logError) {
      console.error('Failed to log error:', logError)
    }

    const errorResponse = {
      success: false,
      error: error.message,
      provider: 'hostinger_smtp',
      timestamp: new Date().toISOString()
    }

    return new Response(
      JSON.stringify(errorResponse),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  }
})