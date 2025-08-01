-- Email Settings Management
CREATE TABLE IF NOT EXISTS email_settings (
    id BIGSERIAL PRIMARY KEY,
    setting_key VARCHAR(100) UNIQUE NOT NULL,
    setting_value TEXT NOT NULL,
    display_name VARCHAR(255) NOT NULL,
    description TEXT,
    setting_type VARCHAR(50) DEFAULT 'text',
    is_required BOOLEAN DEFAULT true,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    INDEX idx_email_settings_key (setting_key),
    INDEX idx_email_settings_active (is_active)
);

-- Insert default email settings
INSERT INTO email_settings (setting_key, setting_value, display_name, description, setting_type, is_required) VALUES
('primary_email', 'management@bookmyreservation.org', 'Primary Email Address', 'Main email for receiving all automation notifications', 'email', true),
('notification_email', 'management@bookmyreservation.org', 'Notification Email', 'Email for booking alerts and notifications', 'email', true),
('support_email', 'management@bookmyreservation.org', 'Support Email', 'Email displayed to customers for support', 'email', true),
('booking_alerts', 'true', 'Booking Alerts', 'Send email alerts for new bookings', 'boolean', false),
('high_value_alerts', 'true', 'High Value Alerts', 'Send immediate alerts for high-value bookings (>$50K)', 'boolean', false),
('abandonment_alerts', 'true', 'Abandonment Alerts', 'Send alerts when bookings are abandoned', 'boolean', false),
('auto_approval_notifications', 'true', 'Auto-Approval Notifications', 'Notify when bookings are auto-approved', 'boolean', false),
('daily_summary', 'true', 'Daily Summary Email', 'Send daily summary of activities', 'boolean', false),
('email_signature', 'Best regards,\nThe BookMyReservation Team\nmanagement@bookmyreservation.org', 'Email Signature', 'Default signature for automated emails', 'textarea', false)
ON CONFLICT (setting_key) DO UPDATE SET 
    setting_value = EXCLUDED.setting_value,
    updated_at = NOW();

-- Function to get email setting
CREATE OR REPLACE FUNCTION get_email_setting(p_setting_key TEXT)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  setting_value TEXT;
BEGIN
  SELECT es.setting_value INTO setting_value
  FROM email_settings es
  WHERE es.setting_key = p_setting_key
  AND es.is_active = true;
  
  RETURN COALESCE(setting_value, '');
END;
$$;

-- Function to update email setting
CREATE OR REPLACE FUNCTION update_email_setting(
  p_setting_key TEXT,
  p_setting_value TEXT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE email_settings 
  SET setting_value = p_setting_value,
      updated_at = NOW()
  WHERE setting_key = p_setting_key;
  
  RETURN FOUND;
END;
$$;

-- Update the email notification function to use settings
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
  target_email TEXT;
  email_enabled BOOLEAN;
BEGIN
  -- Get the target email from settings
  IF p_to_email = 'ADMIN' OR p_to_email IS NULL THEN
    target_email := get_email_setting('primary_email');
  ELSE
    target_email := p_to_email;
  END IF;
  
  -- Check if this type of notification is enabled
  CASE p_notification_type
    WHEN 'high_value_alert' THEN
      email_enabled := get_email_setting('high_value_alerts')::BOOLEAN;
    WHEN 'booking_abandoned' THEN
      email_enabled := get_email_setting('abandonment_alerts')::BOOLEAN;
    WHEN 'auto_approval' THEN
      email_enabled := get_email_setting('auto_approval_notifications')::BOOLEAN;
    WHEN 'booking_success' THEN
      email_enabled := get_email_setting('booking_alerts')::BOOLEAN;
    ELSE
      email_enabled := true; -- Default to enabled for other types
  END CASE;
  
  -- Only send if enabled
  IF email_enabled THEN
    -- Call Supabase Edge Function for email sending
    SELECT content::JSONB INTO result
    FROM http((
      'POST',
      'https://rhatsyvvhizeqzusyblu.supabase.co/functions/v1/send-email',
      ARRAY[
        http_header('Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJoYXRzeXZ2aGl6ZXF6dXN5Ymx1Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1Mjg1MDI2MSwiZXhwIjoyMDY4NDI2MjYxfQ.7_JeyY35h3QfQmdJ3ms4IxIZrog6JS446HuJPIdUSv8'),
        http_header('Content-Type', 'application/json')
      ],
      json_build_object(
        'to', target_email,
        'subject', p_subject,
        'html', p_body || '<br><br>' || get_email_setting('email_signature'),
        'type', p_notification_type
      )::TEXT
    ));
  ELSE
    result := json_build_object('success', false, 'message', 'Email type disabled in settings');
  END IF;

  -- Log the email notification
  INSERT INTO email_notifications (
    to_email, subject, body, notification_type, 
    status, created_at, metadata
  ) VALUES (
    target_email, p_subject, p_body, p_notification_type, 
    CASE WHEN email_enabled THEN 'sent' ELSE 'disabled' END, 
    NOW(),
    json_build_object('settings_check', email_enabled)
  );

  RETURN COALESCE(result, json_build_object('success', false, 'message', 'Email disabled'));
END;
$$;

-- Update triggers to use ADMIN email
CREATE OR REPLACE FUNCTION trigger_booking_automation()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  email_subject TEXT;
  email_body TEXT;
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
    
    PERFORM send_email_notification('ADMIN', email_subject, email_body, 'auto_approval');
    
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
    
    PERFORM send_email_notification('ADMIN', email_subject, email_body, 'high_value_alert');
    
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
    
    PERFORM send_email_notification('ADMIN', email_subject, email_body, 'standard_review');
  END IF;

  RETURN NEW;
END;
$$;

-- Grant permissions
GRANT ALL ON email_settings TO authenticated;
GRANT EXECUTE ON FUNCTION get_email_setting(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION update_email_setting(TEXT, TEXT) TO authenticated;