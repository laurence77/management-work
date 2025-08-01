-- Supabase Email Automation with Database Functions
-- This will send emails directly from Supabase and show everything in your admin dashboard

-- First, create the email notification function
CREATE OR REPLACE FUNCTION send_email_notification(
  p_to_email TEXT,
  p_subject TEXT,
  p_body TEXT,
  p_notification_type TEXT DEFAULT 'general'
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  result JSONB;
BEGIN
  -- Call Supabase Edge Function for email sending (Hostinger integration)
  SELECT content::JSONB INTO result
  FROM http((
    'POST',
    'https://rhatsyvvhizeqzusyblu.supabase.co/functions/v1/send-email',
    ARRAY[
      http_header('Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJoYXRzeXZ2aGl6ZXF6dXN5Ymx1Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1Mjg1MDI2MSwiZXhwIjoyMDY4NDI2MjYxfQ.7_JeyY35h3QfQmdJ3ms4IxIZrog6JS446HuJPIdUSv8'),
      http_header('Content-Type', 'application/json')
    ],
    json_build_object(
      'to', p_to_email,
      'subject', p_subject,
      'html', p_body,
      'type', p_notification_type
    )::TEXT
  ));

  -- Log the email notification
  INSERT INTO email_notifications (
    to_email, subject, body, notification_type, status, created_at
  ) VALUES (
    p_to_email, p_subject, p_body, p_notification_type, 'sent', NOW()
  );

  RETURN result;
END;
$$;

-- Email notifications log table
CREATE TABLE IF NOT EXISTS email_notifications (
    id BIGSERIAL PRIMARY KEY,
    to_email VARCHAR(255) NOT NULL,
    subject TEXT NOT NULL,
    body TEXT,
    notification_type VARCHAR(100) DEFAULT 'general',
    status VARCHAR(50) DEFAULT 'pending',
    sent_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    metadata JSONB,
    
    INDEX idx_email_notifications_type (notification_type),
    INDEX idx_email_notifications_status (status),
    INDEX idx_email_notifications_created (created_at)
);

-- Booking automation trigger
CREATE OR REPLACE FUNCTION trigger_booking_automation()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  email_subject TEXT;
  email_body TEXT;
  admin_email TEXT := 'management@bookmyreservation.org';
BEGIN
  -- Auto-approve logic
  IF NEW.budget < 10000 AND (NEW.fraud_score IS NULL OR NEW.fraud_score < 0.3) THEN
    NEW.status := 'approved';
    NEW.approval_type := 'auto_approved';
    
    email_subject := '✅ Booking Auto-Approved: ' || NEW.id;
    email_body := '<h2>Booking Auto-Approved</h2>
                   <p><strong>Booking ID:</strong> ' || NEW.id || '</p>
                   <p><strong>User:</strong> ' || COALESCE(NEW.user_name, 'Unknown') || '</p>
                   <p><strong>Budget:</strong> $' || NEW.budget || '</p>
                   <p><strong>Celebrity:</strong> ' || COALESCE(NEW.celebrity_name, 'TBD') || '</p>
                   <p><strong>Status:</strong> Auto-approved (low value, low risk)</p>
                   <p><strong>Time:</strong> ' || NOW() || '</p>';
    
    PERFORM send_email_notification(admin_email, email_subject, email_body, 'auto_approval');
    
  ELSIF NEW.budget > 50000 THEN
    NEW.status := 'pending_review';
    NEW.approval_type := 'high_value_review';
    
    email_subject := '🚨 HIGH VALUE Booking Requires Review: $' || NEW.budget;
    email_body := '<h2 style="color: #e74c3c;">HIGH VALUE BOOKING - IMMEDIATE ATTENTION REQUIRED</h2>
                   <p><strong>Booking ID:</strong> ' || NEW.id || '</p>
                   <p><strong>User:</strong> ' || COALESCE(NEW.user_name, 'Unknown') || '</p>
                   <p><strong>Budget:</strong> <span style="color: #e74c3c; font-size: 18px;">$' || NEW.budget || '</span></p>
                   <p><strong>Celebrity:</strong> ' || COALESCE(NEW.celebrity_name, 'TBD') || '</p>
                   <p><strong>Event Type:</strong> ' || COALESCE(NEW.event_type, 'Not specified') || '</p>
                   <p><strong>Priority:</strong> <span style="color: #e74c3c;">HIGH</span></p>
                   <p><strong>Action Required:</strong> Manual review and approval</p>
                   <p><a href="http://localhost:8080/dashboard?tab=bookings&id=' || NEW.id || '">Review Booking Now</a></p>';
    
    PERFORM send_email_notification(admin_email, email_subject, email_body, 'high_value_alert');
    
  ELSE
    NEW.status := 'pending_review';
    NEW.approval_type := 'standard_review';
    
    email_subject := '📋 Standard Booking Review: ' || NEW.id;
    email_body := '<h2>Standard Booking Review Required</h2>
                   <p><strong>Booking ID:</strong> ' || NEW.id || '</p>
                   <p><strong>User:</strong> ' || COALESCE(NEW.user_name, 'Unknown') || '</p>
                   <p><strong>Budget:</strong> $' || NEW.budget || '</p>
                   <p><strong>Celebrity:</strong> ' || COALESCE(NEW.celebrity_name, 'TBD') || '</p>
                   <p><strong>Priority:</strong> Medium</p>
                   <p><a href="http://localhost:8080/dashboard?tab=bookings&id=' || NEW.id || '">Review Booking</a></p>';
    
    PERFORM send_email_notification(admin_email, email_subject, email_body, 'standard_review');
  END IF;

  RETURN NEW;
END;
$$;

-- User behavior email trigger
CREATE OR REPLACE FUNCTION trigger_user_behavior_email()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  email_subject TEXT;
  email_body TEXT;
  admin_email TEXT := 'management@bookmyreservation.org';
  hours_since_event INTEGER;
BEGIN
  hours_since_event := EXTRACT(EPOCH FROM (NOW() - NEW.timestamp))/3600;
  
  CASE NEW.event_type
    WHEN 'booking_abandoned' THEN
      email_subject := '😱 Booking Abandoned - Recovery Needed: User ' || NEW.user_id;
      email_body := '<h2 style="color: #f39c12;">Booking Abandonment Alert</h2>
                     <p><strong>User ID:</strong> ' || NEW.user_id || '</p>
                     <p><strong>Celebrity:</strong> ' || COALESCE(NEW.event_data->>"celebrity_name", 'Unknown') || '</p>
                     <p><strong>Budget:</strong> $' || COALESCE(NEW.event_data->>"budget", '0') || '</p>
                     <p><strong>Email:</strong> ' || COALESCE(NEW.event_data->>"user_email", 'Not provided') || '</p>
                     <p><strong>Time Since Abandonment:</strong> ' || hours_since_event || ' hours</p>
                     <p><strong>Recovery Action:</strong> Send personalized follow-up email</p>
                     <p><a href="http://localhost:8080/dashboard?tab=automation">View User Journey</a></p>';
      
      PERFORM send_email_notification(admin_email, email_subject, email_body, 'booking_abandoned');
      
    WHEN 'booking_completed' THEN
      email_subject := '🎉 Booking Completed Successfully: $' || COALESCE(NEW.event_data->>"budget", '0');
      email_body := '<h2 style="color: #27ae60;">Successful Booking Conversion</h2>
                     <p><strong>User ID:</strong> ' || NEW.user_id || '</p>
                     <p><strong>Booking ID:</strong> ' || COALESCE(NEW.booking_id, 'Unknown') || '</p>
                     <p><strong>Revenue:</strong> $' || COALESCE(NEW.event_data->>"budget", '0') || '</p>
                     <p><strong>Celebrity:</strong> ' || COALESCE(NEW.event_data->>"celebrity_name", 'Unknown') || '</p>
                     <p><strong>Conversion Time:</strong> ' || NEW.timestamp || '</p>';
      
      PERFORM send_email_notification(admin_email, email_subject, email_body, 'booking_success');
      
    WHEN 'high_interest_detected' THEN
      IF COALESCE((NEW.event_data->>"view_duration")::INTEGER, 0) > 60 THEN
        email_subject := '🔥 High Interest User Detected: ' || NEW.user_id;
        email_body := '<h2 style="color: #3498db;">High Interest User Alert</h2>
                       <p><strong>User ID:</strong> ' || NEW.user_id || '</p>
                       <p><strong>Celebrity Viewed:</strong> ' || COALESCE(NEW.celebrity_id, 'Unknown') || '</p>
                       <p><strong>View Duration:</strong> ' || COALESCE(NEW.event_data->>"view_duration", '0') || ' seconds</p>
                       <p><strong>Recommendation:</strong> Send targeted offer or personal outreach</p>';
        
        PERFORM send_email_notification(admin_email, email_subject, email_body, 'high_interest');
      END IF;
  END CASE;
  
  RETURN NEW;
END;
$$;

-- Create triggers
DROP TRIGGER IF EXISTS booking_automation_trigger ON bookings;
CREATE TRIGGER booking_automation_trigger
  BEFORE INSERT OR UPDATE ON bookings
  FOR EACH ROW
  EXECUTE FUNCTION trigger_booking_automation();

DROP TRIGGER IF EXISTS user_behavior_email_trigger ON user_behavior;
CREATE TRIGGER user_behavior_email_trigger
  AFTER INSERT ON user_behavior
  FOR EACH ROW
  EXECUTE FUNCTION trigger_user_behavior_email();

-- Admin dashboard view for all automation activity
CREATE OR REPLACE VIEW automation_dashboard_view AS
SELECT 
  'booking' as activity_type,
  b.id::TEXT as reference_id,
  b.user_name as user_identifier,
  b.status as current_status,
  b.budget::TEXT as value,
  b.approval_type as automation_action,
  b.created_at as activity_time,
  json_build_object(
    'celebrity', b.celebrity_name,
    'event_type', b.event_type,
    'budget', b.budget,
    'fraud_score', b.fraud_score
  ) as details
FROM bookings b
WHERE b.created_at > NOW() - INTERVAL '30 days'

UNION ALL

SELECT 
  'user_behavior' as activity_type,
  ub.id::TEXT as reference_id,
  ub.user_id as user_identifier,
  ub.event_type as current_status,
  COALESCE(ub.event_data->>"budget", 'N/A') as value,
  CASE 
    WHEN ub.event_type = 'booking_abandoned' THEN 'recovery_needed'
    WHEN ub.event_type = 'booking_completed' THEN 'conversion_success'
    WHEN ub.event_type = 'booking_view' AND (ub.event_data->>"view_duration")::INTEGER > 60 THEN 'high_interest'
    ELSE 'tracked'
  END as automation_action,
  ub.timestamp as activity_time,
  ub.event_data as details
FROM user_behavior ub
WHERE ub.timestamp > NOW() - INTERVAL '30 days'

UNION ALL

SELECT 
  'email_notification' as activity_type,
  en.id::TEXT as reference_id,
  en.to_email as user_identifier,
  en.status as current_status,
  en.notification_type as value,
  'email_sent' as automation_action,
  en.created_at as activity_time,
  json_build_object(
    'subject', en.subject,
    'type', en.notification_type
  ) as details
FROM email_notifications en
WHERE en.created_at > NOW() - INTERVAL '30 days'

ORDER BY activity_time DESC;

-- Grant permissions
GRANT ALL ON email_notifications TO authenticated;
GRANT ALL ON automation_dashboard_view TO authenticated;