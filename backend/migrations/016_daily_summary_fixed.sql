-- Fixed Daily Summary SQL with proper syntax

-- Daily Summary Email Template
INSERT INTO email_templates (
  template_key,
  template_name,
  subject_template,
  html_template,
  text_template,
  description,
  variables,
  is_active
) VALUES (
  'daily_summary',
  'Daily Booking Summary',
  'Daily Booking Summary - {{date}} ({{total_bookings}} bookings, ${{total_revenue}})',
  '<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Daily Booking Summary</title>
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white;
      padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
    .content { background: #f8f9fa; padding: 30px; border-radius: 0 0 10px 10px; }
    .metric-card { background: white; padding: 20px; margin: 10px 0; border-radius: 8px;
      border-left: 4px solid #667eea; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
    .metric-value { font-size: 24px; font-weight: bold; color: #667eea; }
    .metric-label { color: #666; font-size: 14px; margin-top: 5px; }
    .booking-list { background: white; padding: 20px; margin: 20px 0; border-radius: 8px;
      box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
    .booking-item { padding: 15px 0; border-bottom: 1px solid #eee; }
    .booking-item:last-child { border-bottom: none; }
    .footer { text-align: center; margin-top: 30px; color: #666; font-size: 14px; }
    .cta-button { display: inline-block; background: #667eea; color: white; padding: 12px 30px;
      text-decoration: none; border-radius: 6px; margin: 20px 0; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>📊 Daily Booking Summary</h1>
      <p>{{date}}</p>
    </div>
    <div class="content">
      <h2>Today''s Performance</h2>
      <div class="metric-card">
        <div class="metric-value">{{total_bookings}}</div>
        <div class="metric-label">Total Bookings</div>
      </div>
      <div class="metric-card">
        <div class="metric-value">${{total_revenue}}</div>
        <div class="metric-label">Total Revenue</div>
      </div>
      <div class="metric-card">
        <div class="metric-value">{{avg_booking_value}}</div>
        <div class="metric-label">Average Booking Value</div>
      </div>
      <div class="metric-card">
        <div class="metric-value">{{high_value_count}}</div>
        <div class="metric-label">High-Value Bookings (>$50K)</div>
      </div>
      <h3>Status Breakdown</h3>
      <p><strong>Approved:</strong> {{approved_count}} | <strong>Pending:</strong> {{pending_count}} | <strong>Auto-Approved:</strong> {{auto_approved_count}}</p>
      <div class="booking-list">
        <h3>Recent Bookings</h3>
        {{recent_bookings}}
      </div>
      <div style="text-align: center;">
        <a href="{{dashboard_url}}" class="cta-button">View Full Dashboard</a>
      </div>
    </div>
    <div class="footer">
      <p>Generated at {{timestamp}}</p>
    </div>
  </div>
</body>
</html>',
  'Daily Booking Summary - {{date}}

Performance:
- Total Bookings: {{total_bookings}}
- Total Revenue: ${{total_revenue}}
- Average Value: {{avg_booking_value}}
- High-Value Count: {{high_value_count}}

Status Breakdown:
- Approved: {{approved_count}}
- Pending: {{pending_count}}
- Auto-Approved: {{auto_approved_count}}

{{recent_bookings_text}}

Dashboard: {{dashboard_url}}
Generated: {{timestamp}}',
  'Automated daily summary of booking activities and performance metrics',
  '["date", "total_bookings", "total_revenue", "avg_booking_value", "high_value_count", "approved_count", "pending_count", "auto_approved_count", "recent_bookings", "recent_bookings_text", "dashboard_url", "timestamp"]'::jsonb,
  true
)
ON CONFLICT (template_key) DO UPDATE SET
  subject_template = EXCLUDED.subject_template,
  html_template = EXCLUDED.html_template,
  text_template = EXCLUDED.text_template,
  variables = EXCLUDED.variables,
  updated_at = NOW();

-- Generate Daily Booking Summary Function
CREATE OR REPLACE FUNCTION generate_daily_booking_summary(p_target_date DATE DEFAULT CURRENT_DATE)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  summary_data JSONB;
  total_bookings INTEGER;
  total_revenue NUMERIC;
  avg_booking_value NUMERIC;
  high_value_count INTEGER;
  approved_count INTEGER;
  pending_count INTEGER;
  auto_approved_count INTEGER;
  recent_bookings_html TEXT;
  recent_bookings_text TEXT;
  booking_record RECORD;
BEGIN
  -- Calculate daily metrics
  SELECT 
    COUNT(*) as total,
    COALESCE(SUM(budget), 0),
    COALESCE(AVG(budget), 0),
    COUNT(*) FILTER (WHERE budget > 50000),
    COUNT(*) FILTER (WHERE status = 'approved'),
    COUNT(*) FILTER (WHERE status = 'pending_review'),
    COUNT(*) FILTER (WHERE approval_type = 'auto_approved')
  INTO 
    total_bookings, total_revenue, avg_booking_value, high_value_count,
    approved_count, pending_count, auto_approved_count
  FROM bookings
  WHERE DATE(created_at) = p_target_date;

  -- Build recent bookings lists
  recent_bookings_html := '';
  recent_bookings_text := E'\nRecent Bookings:\n';

  FOR booking_record IN
    SELECT id, user_name, celebrity_name, budget, status, approval_type, created_at, event_type
    FROM bookings
    WHERE DATE(created_at) = p_target_date
    ORDER BY created_at DESC
    LIMIT 10
  LOOP
    recent_bookings_html := recent_bookings_html || 
      '<p><strong>' || booking_record.id || '</strong> - ' || 
      COALESCE(booking_record.user_name, 'Unknown') || ' | $' || 
      booking_record.budget || ' | ' || 
      COALESCE(booking_record.celebrity_name, 'TBD') || ' | ' ||
      UPPER(booking_record.status) || '</p>';

    recent_bookings_text := recent_bookings_text || 
      '- ' || booking_record.id || ': ' || 
      COALESCE(booking_record.user_name, 'Unknown') || ' | $' || 
      booking_record.budget || ' | ' || 
      UPPER(booking_record.status) || E'\n';
  END LOOP;

  IF recent_bookings_html = '' THEN
    recent_bookings_html := '<p>No bookings today</p>';
    recent_bookings_text := recent_bookings_text || 'No bookings today';
  END IF;

  -- Build summary data object
  summary_data := json_build_object(
    'date', p_target_date::TEXT,
    'total_bookings', total_bookings::TEXT,
    'total_revenue', ROUND(total_revenue, 2)::TEXT,
    'avg_booking_value', '$' || ROUND(avg_booking_value, 2)::TEXT,
    'high_value_count', high_value_count::TEXT,
    'approved_count', approved_count::TEXT,
    'pending_count', pending_count::TEXT,
    'auto_approved_count', auto_approved_count::TEXT,
    'recent_bookings', recent_bookings_html,
    'recent_bookings_text', recent_bookings_text,
    'dashboard_url', 'http://localhost:5173',
    'timestamp', NOW()::TEXT
  );

  RETURN summary_data;
END;
$$;

-- Send Daily Summary Email Function
CREATE OR REPLACE FUNCTION send_daily_summary_email(p_target_date DATE DEFAULT CURRENT_DATE)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  summary_data JSONB;
  email_result JSONB;
  daily_summary_enabled BOOLEAN;
BEGIN
  -- Check if daily summary emails are enabled
  daily_summary_enabled := get_email_setting('daily_summary')::BOOLEAN;

  IF NOT daily_summary_enabled THEN
    RETURN json_build_object('success', false, 'message', 'Daily summary emails are disabled');
  END IF;

  -- Generate summary data
  summary_data := generate_daily_booking_summary(p_target_date);

  -- Send email using template system
  email_result := send_templated_email_notification(
    'daily_summary',
    summary_data,
    'daily_summary'
  );

  RETURN email_result;
END;
$$;

-- Grant permissions
GRANT EXECUTE ON FUNCTION generate_daily_booking_summary(DATE) TO authenticated;
GRANT EXECUTE ON FUNCTION send_daily_summary_email(DATE) TO authenticated;

-- Test the function manually with:
-- SELECT send_daily_summary_email();

-- Schedule daily at 8 AM (requires pg_cron extension)
-- SELECT cron.schedule('daily-booking-summary', '0 8 * * *', 'SELECT send_daily_summary_email();');