import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface AnalyticsEvent {
  event_type: string
  table_name: string
  record_id: string
  old_record?: any
  new_record?: any
  user_id?: string
  organization_id?: string
  timestamp: string
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

    const event: AnalyticsEvent = await req.json()
    console.log('Processing analytics event:', event)

    // Process different types of analytics events
    switch (event.table_name) {
      case 'bookings':
        await processBookingAnalytics(supabaseClient, event)
        break
        
      case 'celebrities':
        await processCelebrityAnalytics(supabaseClient, event)
        break
        
      case 'chat_messages':
        await processChatAnalytics(supabaseClient, event)
        break
        
      case 'app_users':
        await processUserAnalytics(supabaseClient, event)
        break
        
      default:
        console.log('Unhandled table for analytics:', event.table_name)
    }

    // Update real-time metrics
    await updateRealtimeMetrics(supabaseClient, event)

    // Generate insights if needed
    await generateInsights(supabaseClient, event)

    // Trigger alerts for anomalies
    await checkForAnomalies(supabaseClient, event)

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Analytics event processed successfully',
        event_type: event.event_type,
        table: event.table_name
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    )

  } catch (error) {
    console.error('Error processing analytics:', error)
    
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

async function processBookingAnalytics(supabaseClient: any, event: AnalyticsEvent) {
  const { event_type, new_record, old_record } = event
  
  try {
    switch (event_type) {
      case 'INSERT':
        await handleNewBooking(supabaseClient, new_record)
        break
        
      case 'UPDATE':
        await handleBookingUpdate(supabaseClient, new_record, old_record)
        break
        
      case 'DELETE':
        await handleBookingDeletion(supabaseClient, old_record)
        break
    }
  } catch (error) {
    console.error('Error processing booking analytics:', error)
  }
}

async function handleNewBooking(supabaseClient: any, booking: any) {
  const today = new Date().toISOString().split('T')[0]
  
  // Update daily booking metrics
  await upsertDailyMetric(supabaseClient, {
    date: today,
    metric_type: 'bookings_created',
    organization_id: booking.organization_id,
    value: 1,
    metadata: {
      celebrity_id: booking.celebrity_id,
      event_type: booking.event_type || 'general',
      amount: booking.total_amount
    }
  })

  // Update celebrity popularity metrics
  await updateCelebrityMetrics(supabaseClient, booking.celebrity_id, 'booking_requests', 1)

  // Update category metrics
  const { data: celebrity } = await supabaseClient
    .from('celebrities')
    .select('category')
    .eq('id', booking.celebrity_id)
    .single()

  if (celebrity) {
    await updateCategoryMetrics(supabaseClient, celebrity.category, 'bookings', 1, booking.total_amount)
  }

  // Generate revenue forecasting data
  await updateRevenueForecast(supabaseClient, booking)
}

async function handleBookingUpdate(supabaseClient: any, newBooking: any, oldBooking: any) {
  // Check for status changes
  if (oldBooking.status !== newBooking.status) {
    await trackStatusTransition(supabaseClient, newBooking, oldBooking.status, newBooking.status)
  }

  // Check for amount changes
  if (oldBooking.total_amount !== newBooking.total_amount) {
    await trackAmountChange(supabaseClient, newBooking, oldBooking.total_amount, newBooking.total_amount)
  }

  // Update conversion metrics
  if (newBooking.status === 'confirmed' && oldBooking.status !== 'confirmed') {
    await updateConversionMetrics(supabaseClient, newBooking)
  }
}

async function handleBookingDeletion(supabaseClient: any, booking: any) {
  const today = new Date().toISOString().split('T')[0]
  
  // Track deletion metrics
  await upsertDailyMetric(supabaseClient, {
    date: today,
    metric_type: 'bookings_deleted',
    organization_id: booking.organization_id,
    value: 1,
    metadata: {
      celebrity_id: booking.celebrity_id,
      reason: 'deleted',
      original_amount: booking.total_amount
    }
  })
}

async function processCelebrityAnalytics(supabaseClient: any, event: AnalyticsEvent) {
  const { event_type, new_record, old_record } = event
  
  try {
    switch (event_type) {
      case 'INSERT':
        await trackNewCelebrity(supabaseClient, new_record)
        break
        
      case 'UPDATE':
        await trackCelebrityUpdates(supabaseClient, new_record, old_record)
        break
    }
  } catch (error) {
    console.error('Error processing celebrity analytics:', error)
  }
}

async function trackNewCelebrity(supabaseClient: any, celebrity: any) {
  const today = new Date().toISOString().split('T')[0]
  
  await upsertDailyMetric(supabaseClient, {
    date: today,
    metric_type: 'celebrities_added',
    organization_id: celebrity.organization_id,
    value: 1,
    metadata: {
      category: celebrity.category,
      base_price: celebrity.base_price
    }
  })

  // Update category metrics
  await updateCategoryMetrics(supabaseClient, celebrity.category, 'celebrities', 1, 0)
}

async function trackCelebrityUpdates(supabaseClient: any, newCelebrity: any, oldCelebrity: any) {
  // Track availability changes
  if (oldCelebrity.is_available !== newCelebrity.is_available) {
    await trackAvailabilityChange(supabaseClient, newCelebrity)
  }

  // Track price changes
  if (oldCelebrity.base_price !== newCelebrity.base_price) {
    await trackPriceChange(supabaseClient, newCelebrity, oldCelebrity.base_price, newCelebrity.base_price)
  }
}

async function processChatAnalytics(supabaseClient: any, event: AnalyticsEvent) {
  const { event_type, new_record } = event
  
  if (event_type === 'INSERT') {
    const today = new Date().toISOString().split('T')[0]
    
    await upsertDailyMetric(supabaseClient, {
      date: today,
      metric_type: 'chat_messages',
      organization_id: new_record.organization_id,
      value: 1,
      metadata: {
        room_id: new_record.room_id,
        message_type: new_record.message_type
      }
    })

    // Update user engagement metrics
    await updateUserEngagement(supabaseClient, new_record.sender_id, 'chat_message')
  }
}

async function processUserAnalytics(supabaseClient: any, event: AnalyticsEvent) {
  const { event_type, new_record, old_record } = event
  
  try {
    switch (event_type) {
      case 'INSERT':
        await trackNewUser(supabaseClient, new_record)
        break
        
      case 'UPDATE':
        await trackUserActivity(supabaseClient, new_record, old_record)
        break
    }
  } catch (error) {
    console.error('Error processing user analytics:', error)
  }
}

async function trackNewUser(supabaseClient: any, user: any) {
  const today = new Date().toISOString().split('T')[0]
  
  await upsertDailyMetric(supabaseClient, {
    date: today,
    metric_type: 'users_registered',
    organization_id: user.organization_id,
    value: 1,
    metadata: {
      role: user.role
    }
  })
}

async function trackUserActivity(supabaseClient: any, newUser: any, oldUser: any) {
  // Track login activity
  if (newUser.last_login !== oldUser.last_login) {
    await updateUserEngagement(supabaseClient, newUser.id, 'login')
  }

  // Track role changes
  if (newUser.role !== oldUser.role) {
    await trackRoleChange(supabaseClient, newUser, oldUser.role, newUser.role)
  }
}

async function upsertDailyMetric(supabaseClient: any, metric: any) {
  const { error } = await supabaseClient
    .from('daily_metrics')
    .upsert({
      date: metric.date,
      metric_type: metric.metric_type,
      organization_id: metric.organization_id,
      value: metric.value,
      metadata: metric.metadata
    }, {
      onConflict: 'date,metric_type,organization_id',
      ignoreDuplicates: false
    })

  if (error) {
    console.error('Error upserting daily metric:', error)
  }
}

async function updateCelebrityMetrics(supabaseClient: any, celebrityId: string, metricType: string, increment: number) {
  const { error } = await supabaseClient.rpc('increment_celebrity_metric', {
    celebrity_id: celebrityId,
    metric_type: metricType,
    increment_by: increment
  })

  if (error) {
    console.error('Error updating celebrity metrics:', error)
  }
}

async function updateCategoryMetrics(supabaseClient: any, category: string, metricType: string, count: number, revenue: number) {
  const today = new Date().toISOString().split('T')[0]
  
  const { error } = await supabaseClient
    .from('category_metrics')
    .upsert({
      date: today,
      category: category,
      metric_type: metricType,
      count: count,
      revenue: revenue
    }, {
      onConflict: 'date,category,metric_type'
    })

  if (error) {
    console.error('Error updating category metrics:', error)
  }
}

async function updateRevenueForecast(supabaseClient: any, booking: any) {
  const eventDate = new Date(booking.event_date)
  const month = eventDate.toISOString().substring(0, 7) // YYYY-MM format
  
  const { error } = await supabaseClient
    .from('revenue_forecasts')
    .upsert({
      month: month,
      organization_id: booking.organization_id,
      projected_revenue: booking.total_amount,
      booking_count: 1
    }, {
      onConflict: 'month,organization_id'
    })

  if (error) {
    console.error('Error updating revenue forecast:', error)
  }
}

async function updateRealtimeMetrics(supabaseClient: any, event: AnalyticsEvent) {
  // Update real-time dashboard metrics
  const realtimeData = {
    timestamp: new Date().toISOString(),
    event_type: event.event_type,
    table_name: event.table_name,
    organization_id: event.organization_id,
    metadata: {
      record_id: event.record_id,
      user_id: event.user_id
    }
  }

  // Broadcast to real-time dashboard
  const { error } = await supabaseClient
    .from('realtime_events')
    .insert(realtimeData)

  if (error) {
    console.error('Error updating realtime metrics:', error)
  }
}

async function generateInsights(supabaseClient: any, event: AnalyticsEvent) {
  // Generate AI insights for significant events
  if (shouldGenerateInsights(event)) {
    try {
      const insights = await generateEventInsights(event)
      
      const { error } = await supabaseClient
        .from('analytics_insights')
        .insert({
          event_type: event.event_type,
          table_name: event.table_name,
          organization_id: event.organization_id,
          insights: insights,
          confidence_score: 0.8,
          generated_at: new Date().toISOString()
        })

      if (error) {
        console.error('Error saving insights:', error)
      }
    } catch (error) {
      console.error('Error generating insights:', error)
    }
  }
}

async function checkForAnomalies(supabaseClient: any, event: AnalyticsEvent) {
  // Check for unusual patterns that might indicate issues
  try {
    const anomalies = await detectAnomalies(supabaseClient, event)
    
    for (const anomaly of anomalies) {
      await createAlert(supabaseClient, anomaly)
    }
  } catch (error) {
    console.error('Error checking for anomalies:', error)
  }
}

function shouldGenerateInsights(event: AnalyticsEvent): boolean {
  // Generate insights for significant events
  const significantEvents = [
    'booking_confirmed',
    'high_value_booking',
    'celebrity_price_change',
    'category_trend_change'
  ]
  
  return significantEvents.some(eventType => 
    event.event_type.includes(eventType) || 
    (event.new_record?.total_amount > 50000) ||
    (event.table_name === 'bookings' && event.event_type === 'INSERT')
  )
}

async function generateEventInsights(event: AnalyticsEvent): Promise<any> {
  // Generate insights based on the event
  const insights = {
    summary: `${event.event_type} event detected in ${event.table_name}`,
    recommendations: [],
    trends: [],
    alerts: []
  }

  // Add specific insights based on event type
  if (event.table_name === 'bookings' && event.event_type === 'INSERT') {
    insights.recommendations.push('Consider similar celebrities for future marketing')
    insights.trends.push('New booking created - monitor conversion rate')
  }

  return insights
}

async function detectAnomalies(supabaseClient: any, event: AnalyticsEvent): Promise<any[]> {
  const anomalies = []

  // Example: Detect unusually high booking amounts
  if (event.table_name === 'bookings' && event.new_record?.total_amount > 100000) {
    anomalies.push({
      type: 'high_value_booking',
      severity: 'medium',
      description: `Unusually high booking amount: $${event.new_record.total_amount}`,
      data: event.new_record
    })
  }

  // Example: Detect rapid booking creation
  if (event.table_name === 'bookings' && event.event_type === 'INSERT') {
    const recentBookings = await supabaseClient
      .from('bookings')
      .select('id')
      .eq('organization_id', event.organization_id)
      .gte('created_at', new Date(Date.now() - 60000).toISOString()) // Last minute
      .limit(10)

    if (recentBookings.data?.length > 5) {
      anomalies.push({
        type: 'rapid_booking_creation',
        severity: 'high',
        description: 'Unusual number of bookings created in short time period',
        data: { count: recentBookings.data.length }
      })
    }
  }

  return anomalies
}

async function createAlert(supabaseClient: any, anomaly: any) {
  const { error } = await supabaseClient
    .from('analytics_alerts')
    .insert({
      alert_type: anomaly.type,
      severity: anomaly.severity,
      description: anomaly.description,
      data: anomaly.data,
      is_resolved: false,
      created_at: new Date().toISOString()
    })

  if (error) {
    console.error('Error creating alert:', error)
  }
}

// Helper functions for specific tracking
async function trackStatusTransition(supabaseClient: any, booking: any, oldStatus: string, newStatus: string) {
  const { error } = await supabaseClient
    .from('booking_status_transitions')
    .insert({
      booking_id: booking.id,
      from_status: oldStatus,
      to_status: newStatus,
      organization_id: booking.organization_id,
      transitioned_at: new Date().toISOString()
    })

  if (error) {
    console.error('Error tracking status transition:', error)
  }
}

async function trackAmountChange(supabaseClient: any, booking: any, oldAmount: number, newAmount: number) {
  const today = new Date().toISOString().split('T')[0]
  
  await upsertDailyMetric(supabaseClient, {
    date: today,
    metric_type: 'booking_amount_changes',
    organization_id: booking.organization_id,
    value: 1,
    metadata: {
      booking_id: booking.id,
      old_amount: oldAmount,
      new_amount: newAmount,
      difference: newAmount - oldAmount
    }
  })
}

async function updateConversionMetrics(supabaseClient: any, booking: any) {
  const today = new Date().toISOString().split('T')[0]
  
  await upsertDailyMetric(supabaseClient, {
    date: today,
    metric_type: 'booking_conversions',
    organization_id: booking.organization_id,
    value: 1,
    metadata: {
      celebrity_id: booking.celebrity_id,
      amount: booking.total_amount
    }
  })
}

async function trackAvailabilityChange(supabaseClient: any, celebrity: any) {
  const today = new Date().toISOString().split('T')[0]
  
  await upsertDailyMetric(supabaseClient, {
    date: today,
    metric_type: 'celebrity_availability_changes',
    organization_id: celebrity.organization_id,
    value: 1,
    metadata: {
      celebrity_id: celebrity.id,
      is_available: celebrity.is_available
    }
  })
}

async function trackPriceChange(supabaseClient: any, celebrity: any, oldPrice: number, newPrice: number) {
  const today = new Date().toISOString().split('T')[0]
  
  await upsertDailyMetric(supabaseClient, {
    date: today,
    metric_type: 'celebrity_price_changes',
    organization_id: celebrity.organization_id,
    value: 1,
    metadata: {
      celebrity_id: celebrity.id,
      old_price: oldPrice,
      new_price: newPrice,
      change_percentage: ((newPrice - oldPrice) / oldPrice) * 100
    }
  })
}

async function updateUserEngagement(supabaseClient: any, userId: string, action: string) {
  const today = new Date().toISOString().split('T')[0]
  
  const { error } = await supabaseClient
    .from('user_engagement')
    .upsert({
      user_id: userId,
      date: today,
      action_type: action,
      count: 1
    }, {
      onConflict: 'user_id,date,action_type'
    })

  if (error) {
    console.error('Error updating user engagement:', error)
  }
}

async function trackRoleChange(supabaseClient: any, user: any, oldRole: string, newRole: string) {
  const { error } = await supabaseClient
    .from('user_role_changes')
    .insert({
      user_id: user.id,
      organization_id: user.organization_id,
      old_role: oldRole,
      new_role: newRole,
      changed_at: new Date().toISOString()
    })

  if (error) {
    console.error('Error tracking role change:', error)
  }
}