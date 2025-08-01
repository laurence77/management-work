import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface BookingNotificationPayload {
  type: 'created' | 'updated' | 'cancelled' | 'confirmed'
  record: {
    id: string
    event_name: string
    event_date: string
    status: string
    total_amount: number
    created_by: string
    celebrity_id: string
    organization_id: string
  }
  old_record?: any
}

interface EmailTemplate {
  subject: string
  html: string
  text: string
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const payload: BookingNotificationPayload = await req.json()
    console.log('Processing booking notification:', payload)

    // Get user and celebrity details
    const [userResult, celebrityResult] = await Promise.all([
      supabaseClient
        .from('app_users')
        .select('email, first_name, last_name, organization_id')
        .eq('id', payload.record.created_by)
        .single(),
      
      supabaseClient
        .from('celebrities')
        .select('name, category, base_price')
        .eq('id', payload.record.celebrity_id)
        .single()
    ])

    if (userResult.error || celebrityResult.error) {
      throw new Error('Failed to fetch user or celebrity details')
    }

    const user = userResult.data
    const celebrity = celebrityResult.data

    // Generate email template based on notification type
    const emailTemplate = generateEmailTemplate(payload, user, celebrity)

    // Send email notification
    await sendEmailNotification(user.email, emailTemplate)

    // Send in-app notification
    await createInAppNotification(supabaseClient, payload, user)

    // Send webhook to external systems if configured
    await sendWebhookNotification(payload, user, celebrity)

    // Log notification activity
    await logNotificationActivity(supabaseClient, payload, user)

    // For confirmed bookings, trigger additional automations
    if (payload.type === 'confirmed') {
      await triggerConfirmationAutomations(supabaseClient, payload, user, celebrity)
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Notification processed successfully',
        type: payload.type,
        booking_id: payload.record.id
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    )

  } catch (error) {
    console.error('Error processing booking notification:', error)
    
    return new Response(
      JSON.stringify({ 
        error: error.message,
        success: false
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    )
  }
})

function generateEmailTemplate(
  payload: BookingNotificationPayload, 
  user: any, 
  celebrity: any
): EmailTemplate {
  const { record, type } = payload
  const eventDate = new Date(record.event_date).toLocaleDateString()
  const amount = new Intl.NumberFormat('en-US', { 
    style: 'currency', 
    currency: 'USD' 
  }).format(record.total_amount)

  switch (type) {
    case 'created':
      return {
        subject: `Booking Request Created: ${record.event_name}`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #2563eb;">Booking Request Created</h2>
            <p>Hi ${user.first_name},</p>
            <p>Your booking request has been successfully created!</p>
            
            <div style="background: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <h3 style="margin-top: 0;">Booking Details</h3>
              <p><strong>Event:</strong> ${record.event_name}</p>
              <p><strong>Celebrity:</strong> ${celebrity.name}</p>
              <p><strong>Date:</strong> ${eventDate}</p>
              <p><strong>Amount:</strong> ${amount}</p>
              <p><strong>Status:</strong> ${record.status}</p>
            </div>
            
            <p>We'll review your request and get back to you within 24 hours.</p>
            <p>Best regards,<br>The Celebrity Booking Team</p>
          </div>
        `,
        text: `Booking Request Created: ${record.event_name}\n\nHi ${user.first_name},\n\nYour booking request for ${celebrity.name} on ${eventDate} has been created. Amount: ${amount}\n\nWe'll review your request and get back to you within 24 hours.`
      }

    case 'confirmed':
      return {
        subject: `Booking Confirmed: ${record.event_name}`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #16a34a;">🎉 Booking Confirmed!</h2>
            <p>Hi ${user.first_name},</p>
            <p>Great news! Your booking has been confirmed.</p>
            
            <div style="background: #dcfce7; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #16a34a;">
              <h3 style="margin-top: 0; color: #166534;">Confirmed Booking Details</h3>
              <p><strong>Event:</strong> ${record.event_name}</p>
              <p><strong>Celebrity:</strong> ${celebrity.name}</p>
              <p><strong>Date:</strong> ${eventDate}</p>
              <p><strong>Amount:</strong> ${amount}</p>
            </div>
            
            <p>Next steps:</p>
            <ul>
              <li>Contract documents will be sent within 2 business days</li>
              <li>Payment instructions will follow</li>
              <li>Our event coordinator will contact you soon</li>
            </ul>
            
            <p>Thank you for choosing our platform!</p>
            <p>Best regards,<br>The Celebrity Booking Team</p>
          </div>
        `,
        text: `🎉 Booking Confirmed: ${record.event_name}\n\nHi ${user.first_name},\n\nYour booking for ${celebrity.name} on ${eventDate} has been confirmed! Amount: ${amount}\n\nContract documents and payment instructions will follow soon.`
      }

    case 'cancelled':
      return {
        subject: `Booking Cancelled: ${record.event_name}`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #dc2626;">Booking Cancelled</h2>
            <p>Hi ${user.first_name},</p>
            <p>We regret to inform you that your booking has been cancelled.</p>
            
            <div style="background: #fef2f2; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #dc2626;">
              <h3 style="margin-top: 0; color: #991b1b;">Cancelled Booking Details</h3>
              <p><strong>Event:</strong> ${record.event_name}</p>
              <p><strong>Celebrity:</strong> ${celebrity.name}</p>
              <p><strong>Date:</strong> ${eventDate}</p>
            </div>
            
            <p>If you have any questions or would like to discuss alternative options, please don't hesitate to contact us.</p>
            <p>Best regards,<br>The Celebrity Booking Team</p>
          </div>
        `,
        text: `Booking Cancelled: ${record.event_name}\n\nHi ${user.first_name},\n\nYour booking for ${celebrity.name} on ${eventDate} has been cancelled. Please contact us if you have any questions.`
      }

    default:
      return {
        subject: `Booking Update: ${record.event_name}`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #2563eb;">Booking Update</h2>
            <p>Hi ${user.first_name},</p>
            <p>Your booking has been updated.</p>
            
            <div style="background: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <h3 style="margin-top: 0;">Updated Booking Details</h3>
              <p><strong>Event:</strong> ${record.event_name}</p>
              <p><strong>Celebrity:</strong> ${celebrity.name}</p>
              <p><strong>Date:</strong> ${eventDate}</p>
              <p><strong>Status:</strong> ${record.status}</p>
            </div>
            
            <p>Best regards,<br>The Celebrity Booking Team</p>
          </div>
        `,
        text: `Booking Update: ${record.event_name}\n\nHi ${user.first_name},\n\nYour booking for ${celebrity.name} has been updated. Current status: ${record.status}`
      }
  }
}

async function sendEmailNotification(email: string, template: EmailTemplate) {
  // In production, integrate with email service like SendGrid, Resend, or AWS SES
  const emailServiceUrl = Deno.env.get('EMAIL_SERVICE_URL')
  const emailApiKey = Deno.env.get('EMAIL_API_KEY')

  if (!emailServiceUrl || !emailApiKey) {
    console.log('Email service not configured, skipping email notification')
    return
  }

  try {
    const response = await fetch(emailServiceUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${emailApiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        to: email,
        subject: template.subject,
        html: template.html,
        text: template.text
      })
    })

    if (!response.ok) {
      throw new Error(`Email service responded with ${response.status}`)
    }

    console.log('Email notification sent successfully to:', email)
  } catch (error) {
    console.error('Failed to send email notification:', error)
    // Don't throw - email failure shouldn't break the entire notification flow
  }
}

async function createInAppNotification(
  supabaseClient: any, 
  payload: BookingNotificationPayload, 
  user: any
) {
  try {
    const notificationData = {
      user_id: user.id,
      type: 'booking_update',
      title: getNotificationTitle(payload.type),
      message: getNotificationMessage(payload),
      data: {
        booking_id: payload.record.id,
        event_name: payload.record.event_name,
        type: payload.type
      },
      is_read: false
    }

    const { error } = await supabaseClient
      .from('notifications')
      .insert(notificationData)

    if (error) {
      console.error('Failed to create in-app notification:', error)
    } else {
      console.log('In-app notification created successfully')
    }
  } catch (error) {
    console.error('Error creating in-app notification:', error)
  }
}

async function sendWebhookNotification(
  payload: BookingNotificationPayload, 
  user: any, 
  celebrity: any
) {
  const webhookUrl = Deno.env.get('WEBHOOK_URL')
  
  if (!webhookUrl) {
    console.log('Webhook URL not configured, skipping webhook notification')
    return
  }

  try {
    const webhookPayload = {
      event: `booking.${payload.type}`,
      data: {
        booking: payload.record,
        user: {
          id: user.id,
          email: user.email,
          name: `${user.first_name} ${user.last_name}`
        },
        celebrity: {
          id: celebrity.id,
          name: celebrity.name,
          category: celebrity.category
        }
      },
      timestamp: new Date().toISOString()
    }

    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Webhook-Source': 'celebrity-booking-platform'
      },
      body: JSON.stringify(webhookPayload)
    })

    if (!response.ok) {
      throw new Error(`Webhook responded with ${response.status}`)
    }

    console.log('Webhook notification sent successfully')
  } catch (error) {
    console.error('Failed to send webhook notification:', error)
  }
}

async function logNotificationActivity(
  supabaseClient: any, 
  payload: BookingNotificationPayload, 
  user: any
) {
  try {
    const logData = {
      booking_id: payload.record.id,
      user_id: user.id,
      notification_type: payload.type,
      status: 'sent',
      metadata: {
        event_name: payload.record.event_name,
        celebrity_id: payload.record.celebrity_id,
        organization_id: payload.record.organization_id
      }
    }

    const { error } = await supabaseClient
      .from('notification_logs')
      .insert(logData)

    if (error) {
      console.error('Failed to log notification activity:', error)
    }
  } catch (error) {
    console.error('Error logging notification activity:', error)
  }
}

async function triggerConfirmationAutomations(
  supabaseClient: any,
  payload: BookingNotificationPayload,
  user: any,
  celebrity: any
) {
  console.log('Triggering confirmation automations for booking:', payload.record.id)

  // Create calendar event
  await createCalendarEvent(payload.record, user, celebrity)

  // Schedule contract generation
  await scheduleContractGeneration(supabaseClient, payload.record)

  // Create payment reminder
  await schedulePaymentReminder(supabaseClient, payload.record, user)

  // Notify celebrity management
  await notifyCelebrityManagement(celebrity, payload.record)
}

async function createCalendarEvent(booking: any, user: any, celebrity: any) {
  // Integration with Google Calendar or other calendar services
  console.log('Creating calendar event for booking:', booking.id)
  // Implementation would go here
}

async function scheduleContractGeneration(supabaseClient: any, booking: any) {
  // Schedule contract generation task
  console.log('Scheduling contract generation for booking:', booking.id)
  // Implementation would go here
}

async function schedulePaymentReminder(supabaseClient: any, booking: any, user: any) {
  // Schedule payment reminder notifications
  console.log('Scheduling payment reminders for booking:', booking.id)
  // Implementation would go here
}

async function notifyCelebrityManagement(celebrity: any, booking: any) {
  // Notify celebrity's management team
  console.log('Notifying celebrity management for:', celebrity.name)
  // Implementation would go here
}

function getNotificationTitle(type: string): string {
  switch (type) {
    case 'created': return 'Booking Request Created'
    case 'confirmed': return 'Booking Confirmed!'
    case 'cancelled': return 'Booking Cancelled'
    case 'updated': return 'Booking Updated'
    default: return 'Booking Update'
  }
}

function getNotificationMessage(payload: BookingNotificationPayload): string {
  const { record, type } = payload
  
  switch (type) {
    case 'created':
      return `Your booking request for "${record.event_name}" has been created and is under review.`
    case 'confirmed':
      return `Great news! Your booking for "${record.event_name}" has been confirmed.`
    case 'cancelled':
      return `Your booking for "${record.event_name}" has been cancelled.`
    case 'updated':
      return `Your booking for "${record.event_name}" has been updated to ${record.status}.`
    default:
      return `Your booking for "${record.event_name}" has been updated.`
  }
}