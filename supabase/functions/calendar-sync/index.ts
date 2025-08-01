import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface CalendarSyncPayload {
  action: 'create_event' | 'update_event' | 'delete_event' | 'sync_calendar'
  booking_id: string
  user_id: string
  calendar_provider?: 'google' | 'outlook' | 'apple'
  calendar_id?: string
  event_details?: {
    title: string
    description: string
    start_time: string
    end_time: string
    location?: string
    attendees?: string[]
    reminders?: number[] // minutes before event
  }
}

interface CalendarEvent {
  id: string
  title: string
  description: string
  start: string
  end: string
  location?: string
  attendees: string[]
  reminders: number[]
  provider: string
  calendar_id: string
  booking_id: string
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const payload: CalendarSyncPayload = await req.json()
    console.log('Processing calendar sync:', payload)

    let result: any = {}

    switch (payload.action) {
      case 'create_event':
        result = await createCalendarEvent(supabaseClient, payload)
        break
        
      case 'update_event':
        result = await updateCalendarEvent(supabaseClient, payload)
        break
        
      case 'delete_event':
        result = await deleteCalendarEvent(supabaseClient, payload)
        break
        
      case 'sync_calendar':
        result = await syncCalendar(supabaseClient, payload)
        break
        
      default:
        throw new Error(`Unknown action: ${payload.action}`)
    }

    // Log calendar activity
    await logCalendarActivity(supabaseClient, payload, result)

    return new Response(
      JSON.stringify({ 
        success: true, 
        data: result,
        action: payload.action,
        booking_id: payload.booking_id
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    )

  } catch (error) {
    console.error('Error processing calendar sync:', error)
    
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

async function createCalendarEvent(supabaseClient: any, payload: CalendarSyncPayload) {
  console.log('Creating calendar event for booking:', payload.booking_id)

  // Get booking details
  const booking = await getBookingDetails(supabaseClient, payload.booking_id)
  if (!booking) {
    throw new Error('Booking not found')
  }

  // Get user's calendar settings
  const calendarSettings = await getUserCalendarSettings(supabaseClient, payload.user_id)
  
  // Determine calendar provider and settings
  const provider = payload.calendar_provider || calendarSettings?.default_provider || 'google'
  const calendarId = payload.calendar_id || calendarSettings?.default_calendar_id

  if (!calendarId) {
    throw new Error('No calendar configured for user')
  }

  // Create event details
  const eventDetails = payload.event_details || generateEventDetails(booking)

  // Create event in external calendar
  let externalEventId: string
  let calendarUrl: string

  switch (provider) {
    case 'google':
      const googleResult = await createGoogleCalendarEvent(calendarId, eventDetails, calendarSettings)
      externalEventId = googleResult.eventId
      calendarUrl = googleResult.eventUrl
      break
      
    case 'outlook':
      const outlookResult = await createOutlookCalendarEvent(calendarId, eventDetails, calendarSettings)
      externalEventId = outlookResult.eventId
      calendarUrl = outlookResult.eventUrl
      break
      
    case 'apple':
      const appleResult = await createAppleCalendarEvent(calendarId, eventDetails, calendarSettings)
      externalEventId = appleResult.eventId
      calendarUrl = appleResult.eventUrl
      break
      
    default:
      throw new Error(`Unsupported calendar provider: ${provider}`)
  }

  // Save calendar event record
  const { data: calendarEvent, error } = await supabaseClient
    .from('calendar_events')
    .insert({
      booking_id: payload.booking_id,
      user_id: payload.user_id,
      external_event_id: externalEventId,
      calendar_provider: provider,
      calendar_id: calendarId,
      event_title: eventDetails.title,
      event_description: eventDetails.description,
      start_time: eventDetails.start_time,
      end_time: eventDetails.end_time,
      location: eventDetails.location,
      attendees: eventDetails.attendees || [],
      reminders: eventDetails.reminders || [60, 1440], // 1 hour and 1 day before
      calendar_url: calendarUrl,
      sync_status: 'synced'
    })
    .select()
    .single()

  if (error) {
    throw new Error(`Failed to save calendar event: ${error.message}`)
  }

  // Update booking with calendar event reference
  await supabaseClient
    .from('bookings')
    .update({ 
      calendar_event_id: calendarEvent.id,
      calendar_synced: true 
    })
    .eq('id', payload.booking_id)

  // Send calendar invitation to attendees
  await sendCalendarInvitations(supabaseClient, calendarEvent, booking)

  return {
    calendar_event_id: calendarEvent.id,
    external_event_id: externalEventId,
    calendar_url: calendarUrl,
    provider: provider,
    attendees_notified: eventDetails.attendees?.length || 0
  }
}

async function updateCalendarEvent(supabaseClient: any, payload: CalendarSyncPayload) {
  console.log('Updating calendar event for booking:', payload.booking_id)

  // Get existing calendar event
  const { data: existingEvent, error } = await supabaseClient
    .from('calendar_events')
    .select('*')
    .eq('booking_id', payload.booking_id)
    .single()

  if (error || !existingEvent) {
    throw new Error('Calendar event not found')
  }

  // Get updated booking details
  const booking = await getBookingDetails(supabaseClient, payload.booking_id)
  const eventDetails = payload.event_details || generateEventDetails(booking)

  // Update event in external calendar
  let updateResult: any

  switch (existingEvent.calendar_provider) {
    case 'google':
      updateResult = await updateGoogleCalendarEvent(
        existingEvent.calendar_id,
        existingEvent.external_event_id,
        eventDetails
      )
      break
      
    case 'outlook':
      updateResult = await updateOutlookCalendarEvent(
        existingEvent.calendar_id,
        existingEvent.external_event_id,
        eventDetails
      )
      break
      
    case 'apple':
      updateResult = await updateAppleCalendarEvent(
        existingEvent.calendar_id,
        existingEvent.external_event_id,
        eventDetails
      )
      break
  }

  // Update calendar event record
  const { data: updatedEvent, error: updateError } = await supabaseClient
    .from('calendar_events')
    .update({
      event_title: eventDetails.title,
      event_description: eventDetails.description,
      start_time: eventDetails.start_time,
      end_time: eventDetails.end_time,
      location: eventDetails.location,
      attendees: eventDetails.attendees || [],
      sync_status: 'synced',
      last_synced: new Date().toISOString()
    })
    .eq('id', existingEvent.id)
    .select()
    .single()

  if (updateError) {
    throw new Error(`Failed to update calendar event: ${updateError.message}`)
  }

  // Notify attendees of changes
  await notifyAttendeesOfUpdate(supabaseClient, updatedEvent, booking)

  return {
    calendar_event_id: updatedEvent.id,
    external_event_id: existingEvent.external_event_id,
    updated: true,
    attendees_notified: eventDetails.attendees?.length || 0
  }
}

async function deleteCalendarEvent(supabaseClient: any, payload: CalendarSyncPayload) {
  console.log('Deleting calendar event for booking:', payload.booking_id)

  // Get existing calendar event
  const { data: existingEvent, error } = await supabaseClient
    .from('calendar_events')
    .select('*')
    .eq('booking_id', payload.booking_id)
    .single()

  if (error || !existingEvent) {
    throw new Error('Calendar event not found')
  }

  // Delete event from external calendar
  switch (existingEvent.calendar_provider) {
    case 'google':
      await deleteGoogleCalendarEvent(existingEvent.calendar_id, existingEvent.external_event_id)
      break
      
    case 'outlook':
      await deleteOutlookCalendarEvent(existingEvent.calendar_id, existingEvent.external_event_id)
      break
      
    case 'apple':
      await deleteAppleCalendarEvent(existingEvent.calendar_id, existingEvent.external_event_id)
      break
  }

  // Mark calendar event as deleted
  await supabaseClient
    .from('calendar_events')
    .update({
      sync_status: 'deleted',
      deleted_at: new Date().toISOString()
    })
    .eq('id', existingEvent.id)

  // Update booking
  await supabaseClient
    .from('bookings')
    .update({ 
      calendar_synced: false,
      calendar_event_id: null 
    })
    .eq('id', payload.booking_id)

  // Notify attendees of cancellation
  await notifyAttendeesOfCancellation(supabaseClient, existingEvent)

  return {
    calendar_event_id: existingEvent.id,
    deleted: true,
    attendees_notified: existingEvent.attendees?.length || 0
  }
}

async function syncCalendar(supabaseClient: any, payload: CalendarSyncPayload) {
  console.log('Syncing calendar for user:', payload.user_id)

  // Get user's calendar settings
  const calendarSettings = await getUserCalendarSettings(supabaseClient, payload.user_id)
  
  if (!calendarSettings) {
    throw new Error('No calendar settings found for user')
  }

  const results = []

  // Get all bookings that need calendar sync
  const { data: bookings, error } = await supabaseClient
    .from('bookings')
    .select(`
      *,
      calendar_events(*)
    `)
    .eq('created_by', payload.user_id)
    .eq('status', 'confirmed')
    .gte('event_date', new Date().toISOString())

  if (error) {
    throw new Error(`Failed to get bookings: ${error.message}`)
  }

  for (const booking of bookings) {
    try {
      if (!booking.calendar_events || booking.calendar_events.length === 0) {
        // Create calendar event for booking without one
        const result = await createCalendarEvent(supabaseClient, {
          action: 'create_event',
          booking_id: booking.id,
          user_id: payload.user_id,
          calendar_provider: calendarSettings.default_provider,
          calendar_id: calendarSettings.default_calendar_id
        })
        
        results.push({
          booking_id: booking.id,
          action: 'created',
          result
        })
      } else {
        // Update existing calendar event
        const result = await updateCalendarEvent(supabaseClient, {
          action: 'update_event',
          booking_id: booking.id,
          user_id: payload.user_id
        })
        
        results.push({
          booking_id: booking.id,
          action: 'updated',
          result
        })
      }
    } catch (error) {
      results.push({
        booking_id: booking.id,
        action: 'failed',
        error: error.message
      })
    }
  }

  // Update sync timestamp
  await supabaseClient
    .from('user_calendar_settings')
    .update({ last_sync: new Date().toISOString() })
    .eq('user_id', payload.user_id)

  return {
    synced_bookings: results.length,
    successful: results.filter(r => r.action !== 'failed').length,
    failed: results.filter(r => r.action === 'failed').length,
    results
  }
}

// Helper functions

async function getBookingDetails(supabaseClient: any, bookingId: string) {
  const { data: booking, error } = await supabaseClient
    .from('bookings')
    .select(`
      *,
      celebrities(name, category),
      app_users(first_name, last_name, email)
    `)
    .eq('id', bookingId)
    .single()

  if (error) {
    throw new Error(`Failed to get booking details: ${error.message}`)
  }

  return booking
}

async function getUserCalendarSettings(supabaseClient: any, userId: string) {
  const { data: settings } = await supabaseClient
    .from('user_calendar_settings')
    .select('*')
    .eq('user_id', userId)
    .single()

  return settings
}

function generateEventDetails(booking: any) {
  const eventDate = new Date(booking.event_date)
  const endDate = new Date(eventDate.getTime() + (3 * 60 * 60 * 1000)) // 3 hours later

  return {
    title: `${booking.event_name} - ${booking.celebrities.name}`,
    description: `Celebrity booking event featuring ${booking.celebrities.name}\n\nEvent: ${booking.event_name}\nCategory: ${booking.celebrities.category}\nAmount: $${booking.total_amount.toLocaleString()}\nStatus: ${booking.status}`,
    start_time: eventDate.toISOString(),
    end_time: endDate.toISOString(),
    location: booking.venue || 'TBD',
    attendees: [booking.app_users.email],
    reminders: [60, 1440] // 1 hour and 1 day before
  }
}

// Calendar provider implementations (simplified)

async function createGoogleCalendarEvent(calendarId: string, eventDetails: any, settings: any) {
  console.log('Creating Google Calendar event')
  
  // In production, use Google Calendar API
  const eventId = `google_${Date.now()}`
  const eventUrl = `https://calendar.google.com/calendar/event?eid=${eventId}`

  // Simulate API call
  const event = {
    summary: eventDetails.title,
    description: eventDetails.description,
    start: {
      dateTime: eventDetails.start_time,
      timeZone: 'UTC'
    },
    end: {
      dateTime: eventDetails.end_time,
      timeZone: 'UTC'
    },
    location: eventDetails.location,
    attendees: eventDetails.attendees.map((email: string) => ({ email })),
    reminders: {
      useDefault: false,
      overrides: eventDetails.reminders.map((minutes: number) => ({
        method: 'popup',
        minutes
      }))
    }
  }

  return {
    eventId,
    eventUrl,
    event
  }
}

async function createOutlookCalendarEvent(calendarId: string, eventDetails: any, settings: any) {
  console.log('Creating Outlook Calendar event')
  
  // In production, use Microsoft Graph API
  const eventId = `outlook_${Date.now()}`
  const eventUrl = `https://outlook.live.com/calendar/deeplink/event?id=${eventId}`

  return {
    eventId,
    eventUrl
  }
}

async function createAppleCalendarEvent(calendarId: string, eventDetails: any, settings: any) {
  console.log('Creating Apple Calendar event')
  
  // In production, use CalDAV or Apple's APIs
  const eventId = `apple_${Date.now()}`
  const eventUrl = `https://calendar.apple.com/event/${eventId}`

  return {
    eventId,
    eventUrl
  }
}

async function updateGoogleCalendarEvent(calendarId: string, eventId: string, eventDetails: any) {
  console.log('Updating Google Calendar event:', eventId)
  return { updated: true }
}

async function updateOutlookCalendarEvent(calendarId: string, eventId: string, eventDetails: any) {
  console.log('Updating Outlook Calendar event:', eventId)
  return { updated: true }
}

async function updateAppleCalendarEvent(calendarId: string, eventId: string, eventDetails: any) {
  console.log('Updating Apple Calendar event:', eventId)
  return { updated: true }
}

async function deleteGoogleCalendarEvent(calendarId: string, eventId: string) {
  console.log('Deleting Google Calendar event:', eventId)
}

async function deleteOutlookCalendarEvent(calendarId: string, eventId: string) {
  console.log('Deleting Outlook Calendar event:', eventId)
}

async function deleteAppleCalendarEvent(calendarId: string, eventId: string) {
  console.log('Deleting Apple Calendar event:', eventId)
}

async function sendCalendarInvitations(supabaseClient: any, calendarEvent: any, booking: any) {
  console.log('Sending calendar invitations for event:', calendarEvent.id)
  
  // Implementation would send email invitations with calendar attachments
  for (const attendee of calendarEvent.attendees) {
    console.log('Sending invitation to:', attendee)
  }
}

async function notifyAttendeesOfUpdate(supabaseClient: any, calendarEvent: any, booking: any) {
  console.log('Notifying attendees of calendar update:', calendarEvent.id)
  
  // Implementation would send update notifications
}

async function notifyAttendeesOfCancellation(supabaseClient: any, calendarEvent: any) {
  console.log('Notifying attendees of calendar cancellation:', calendarEvent.id)
  
  // Implementation would send cancellation notifications
}

async function logCalendarActivity(supabaseClient: any, payload: CalendarSyncPayload, result: any) {
  const { error } = await supabaseClient
    .from('calendar_sync_logs')
    .insert({
      booking_id: payload.booking_id,
      user_id: payload.user_id,
      action: payload.action,
      calendar_provider: payload.calendar_provider,
      success: result.success !== false,
      result: result,
      synced_at: new Date().toISOString()
    })

  if (error) {
    console.error('Failed to log calendar activity:', error)
  }
}