-- Secure SQL Functions to Fix SQL Injection Vulnerabilities
-- This migration replaces vulnerable string concatenation with safe parameterized functions

-- Security utility functions for input validation and sanitization
CREATE OR REPLACE FUNCTION html_escape(input_text TEXT)
RETURNS TEXT
LANGUAGE plpgsql
IMMUTABLE
SECURITY DEFINER
AS $$
BEGIN
  -- Return empty string for NULL input
  IF input_text IS NULL THEN
    RETURN '';
  END IF;
  
  -- Escape HTML special characters to prevent XSS
  RETURN replace(
    replace(
      replace(
        replace(
          replace(
            replace(input_text, '&', '&amp;'),
            '<', '&lt;'),
          '>', '&gt;'),
        '"', '&quot;'),
      '''', '&#x27;'),
    '/', '&#x2F;');
END;
$$;

-- Validate email addresses
CREATE OR REPLACE FUNCTION is_valid_email(email_text TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
IMMUTABLE
SECURITY DEFINER
AS $$
BEGIN
  IF email_text IS NULL OR length(email_text) = 0 THEN
    RETURN false;
  END IF;
  
  -- Email validation regex - basic but secure
  RETURN email_text ~ '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$'
    AND length(email_text) <= 254;
END;
$$;

-- Validate UUIDs
CREATE OR REPLACE FUNCTION is_valid_uuid(uuid_text TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
IMMUTABLE
SECURITY DEFINER
AS $$
BEGIN
  IF uuid_text IS NULL THEN
    RETURN false;
  END IF;
  
  -- UUID validation regex
  RETURN uuid_text ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$';
END;
$$;

-- Validate and sanitize user names
CREATE OR REPLACE FUNCTION sanitize_user_name(user_name TEXT)
RETURNS TEXT
LANGUAGE plpgsql
IMMUTABLE
SECURITY DEFINER
AS $$
BEGIN
  IF user_name IS NULL THEN
    RETURN 'Unknown User';
  END IF;
  
  -- Remove potentially dangerous characters and limit length
  RETURN html_escape(
    regexp_replace(
      substring(trim(user_name), 1, 100),
      '[<>"\''&/\\]',
      '',
      'g'
    )
  );
END;
$$;

-- Validate monetary amounts
CREATE OR REPLACE FUNCTION validate_monetary_amount(amount NUMERIC)
RETURNS TEXT
LANGUAGE plpgsql
IMMUTABLE
SECURITY DEFINER
AS $$
BEGIN
  IF amount IS NULL OR amount < 0 THEN
    RETURN '$0.00';
  END IF;
  
  -- Format as currency with max reasonable value
  IF amount > 10000000 THEN  -- 10 million max
    RETURN '$10,000,000+';
  END IF;
  
  RETURN '$' || to_char(amount, 'FM999,999,999.00');
END;
$$;

-- Safe template rendering function
CREATE OR REPLACE FUNCTION safe_template_render(
  template_text TEXT,
  data_object JSONB
)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  result TEXT := template_text;
  key_value RECORD;
  safe_value TEXT;
BEGIN
  -- Return empty string for null template
  IF template_text IS NULL THEN
    RETURN '';
  END IF;
  
  -- Process each key-value pair from JSON
  FOR key_value IN SELECT * FROM jsonb_each_text(COALESCE(data_object, '{}'::jsonb)) LOOP
    -- Validate key format (only alphanumeric, underscore, hyphen)
    IF key_value.key ~ '^[a-zA-Z0-9_-]+$' AND length(key_value.key) <= 50 THEN
      
      -- Apply different sanitization based on key type
      CASE 
        WHEN key_value.key LIKE '%email%' THEN
          safe_value := CASE WHEN is_valid_email(key_value.value) 
                            THEN html_escape(key_value.value) 
                            ELSE 'Invalid Email' END;
        
        WHEN key_value.key LIKE '%name%' OR key_value.key LIKE '%user%' THEN
          safe_value := sanitize_user_name(key_value.value);
        
        WHEN key_value.key LIKE '%amount%' OR key_value.key LIKE '%budget%' OR key_value.key LIKE '%price%' THEN
          safe_value := validate_monetary_amount(key_value.value::numeric);
        
        WHEN key_value.key LIKE '%id%' THEN
          safe_value := CASE WHEN is_valid_uuid(key_value.value) 
                            THEN html_escape(key_value.value) 
                            ELSE 'Invalid ID' END;
        
        ELSE
          -- Default: HTML escape and truncate
          safe_value := html_escape(substring(key_value.value, 1, 500));
      END CASE;
      
      -- Replace template placeholder with safe value
      result := replace(result, '{{' || key_value.key || '}}', safe_value);
    END IF;
  END LOOP;
  
  -- Remove any remaining unreplaced placeholders for security
  result := regexp_replace(result, '\{\{[^}]*\}\}', '[REDACTED]', 'g');
  
  RETURN result;
END;
$$;

-- Secure email content builder
CREATE OR REPLACE FUNCTION build_secure_email_content(
  email_type TEXT,
  booking_record RECORD DEFAULT NULL,
  user_record RECORD DEFAULT NULL,
  additional_data JSONB DEFAULT '{}'::jsonb
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  template_data JSONB := '{}'::jsonb;
  safe_subject TEXT;
  safe_html TEXT;
  base_template TEXT;
BEGIN
  -- Build safe template data
  IF booking_record IS NOT NULL THEN
    template_data := jsonb_build_object(
      'booking_id', COALESCE(booking_record.id::text, 'Unknown'),
      'booking_amount', validate_monetary_amount(booking_record.total_amount),
      'event_type', html_escape(COALESCE(booking_record.event_type, 'Event')),
      'event_date', COALESCE(booking_record.event_date::text, 'TBD'),
      'contact_name', sanitize_user_name(booking_record.contact_name),
      'contact_email', CASE WHEN is_valid_email(booking_record.contact_email) 
                          THEN html_escape(booking_record.contact_email) 
                          ELSE 'Invalid Email' END
    );
  END IF;
  
  IF user_record IS NOT NULL THEN
    template_data := template_data || jsonb_build_object(
      'user_name', sanitize_user_name(COALESCE(user_record.first_name || ' ' || user_record.last_name, 'User')),
      'user_email', CASE WHEN is_valid_email(user_record.email) 
                        THEN html_escape(user_record.email) 
                        ELSE 'Invalid Email' END
    );
  END IF;
  
  -- Merge additional data safely
  template_data := template_data || additional_data;
  
  -- Add system variables
  template_data := template_data || jsonb_build_object(
    'dashboard_url', 'https://admin.bookmyreservation.org',
    'support_email', 'support@bookmyreservation.org',
    'company_name', 'Celebrity Booking Platform',
    'current_date', to_char(NOW(), 'YYYY-MM-DD'),
    'current_time', to_char(NOW(), 'HH24:MI:SS')
  );
  
  -- Select secure template based on type
  CASE email_type
    WHEN 'booking_confirmation' THEN
      safe_subject := 'Booking Confirmation - {{booking_id}}';
      base_template := '
        <h2>Booking Confirmation</h2>
        <p>Dear {{user_name}},</p>
        <p>Your booking has been confirmed with the following details:</p>
        <ul>
          <li><strong>Booking ID:</strong> {{booking_id}}</li>
          <li><strong>Event Type:</strong> {{event_type}}</li>
          <li><strong>Amount:</strong> {{booking_amount}}</li>
          <li><strong>Event Date:</strong> {{event_date}}</li>
        </ul>
        <p>Thank you for choosing {{company_name}}!</p>
      ';
    
    WHEN 'booking_alert' THEN
      safe_subject := 'New Booking Alert - {{booking_id}}';
      base_template := '
        <h2>New Booking Alert</h2>
        <p>A new booking has been submitted:</p>
        <ul>
          <li><strong>Booking ID:</strong> {{booking_id}}</li>
          <li><strong>Contact:</strong> {{contact_name}} ({{contact_email}})</li>
          <li><strong>Amount:</strong> {{booking_amount}}</li>
          <li><strong>Event Type:</strong> {{event_type}}</li>
        </ul>
        <p><a href="{{dashboard_url}}/bookings/{{booking_id}}">Review Booking</a></p>
      ';
    
    WHEN 'high_value_alert' THEN
      safe_subject := 'High Value Booking Alert - {{booking_amount}}';
      base_template := '
        <h2>🚨 High Value Booking Alert</h2>
        <p>A high-value booking has been submitted:</p>
        <ul>
          <li><strong>Amount:</strong> {{booking_amount}}</li>
          <li><strong>Booking ID:</strong> {{booking_id}}</li>
          <li><strong>Contact:</strong> {{contact_name}}</li>
        </ul>
        <p><strong>Immediate review recommended.</strong></p>
        <p><a href="{{dashboard_url}}/bookings/{{booking_id}}">Review Now</a></p>
      ';
    
    ELSE
      safe_subject := 'Notification from {{company_name}}';
      base_template := '
        <h2>Notification</h2>
        <p>This is a general notification from {{company_name}}.</p>
        <p>Date: {{current_date}} {{current_time}}</p>
      ';
  END CASE;
  
  -- Render templates with safe data
  safe_subject := safe_template_render(safe_subject, template_data);
  safe_html := safe_template_render(base_template, template_data);
  
  RETURN jsonb_build_object(
    'subject', safe_subject,
    'html', safe_html,
    'template_data', template_data,
    'email_type', email_type
  );
END;
$$;

-- Secure function to send notifications (replaces vulnerable email functions)
CREATE OR REPLACE FUNCTION send_secure_email_notification(
  p_email_type TEXT,
  p_to_email TEXT,
  p_booking_id UUID DEFAULT NULL,
  p_user_id UUID DEFAULT NULL,
  p_additional_data JSONB DEFAULT '{}'::jsonb
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  email_content JSONB;
  booking_record RECORD;
  user_record RECORD;
  notification_enabled BOOLEAN := true;
  result JSONB;
BEGIN
  -- Validate inputs
  IF NOT is_valid_email(p_to_email) THEN
    RETURN jsonb_build_object(
      'success', false, 
      'error', 'Invalid email address'
    );
  END IF;
  
  IF p_email_type IS NULL OR length(p_email_type) = 0 THEN
    RETURN jsonb_build_object(
      'success', false, 
      'error', 'Email type is required'
    );
  END IF;
  
  -- Get booking record if provided
  IF p_booking_id IS NOT NULL THEN
    SELECT * INTO booking_record 
    FROM bookings 
    WHERE id = p_booking_id;
  END IF;
  
  -- Get user record if provided
  IF p_user_id IS NOT NULL THEN
    SELECT * INTO user_record 
    FROM app_users 
    WHERE id = p_user_id;
  END IF;
  
  -- Check if notification type is enabled
  CASE p_email_type
    WHEN 'high_value_alert' THEN
      SELECT COALESCE(get_email_setting('high_value_alerts')::boolean, true) INTO notification_enabled;
    WHEN 'booking_confirmation', 'booking_alert' THEN
      SELECT COALESCE(get_email_setting('booking_alerts')::boolean, true) INTO notification_enabled;
    ELSE
      notification_enabled := true;
  END CASE;
  
  IF NOT notification_enabled THEN
    -- Log disabled notification
    INSERT INTO email_notifications (
      to_email, subject, body, notification_type, 
      status, created_at, metadata
    ) VALUES (
      p_to_email, 'Notification disabled', '', p_email_type, 
      'disabled', NOW(),
      jsonb_build_object('reason', 'Email type disabled in settings')
    );
    
    RETURN jsonb_build_object(
      'success', false, 
      'message', 'Email notifications disabled for this type'
    );
  END IF;
  
  -- Build secure email content
  email_content := build_secure_email_content(
    p_email_type, 
    booking_record, 
    user_record, 
    p_additional_data
  );
  
  -- Log the email notification
  INSERT INTO email_notifications (
    to_email, subject, body, notification_type, 
    status, created_at, metadata
  ) VALUES (
    p_to_email, 
    email_content->>'subject',
    email_content->>'html',
    p_email_type,
    'queued',
    NOW(),
    jsonb_build_object(
      'template_data', email_content->'template_data',
      'booking_id', p_booking_id,
      'user_id', p_user_id,
      'sanitized', true
    )
  );
  
  RETURN jsonb_build_object(
    'success', true,
    'message', 'Email notification queued successfully',
    'email_type', p_email_type,
    'to_email', p_to_email
  );
END;
$$;

-- Security audit function to detect potential injection attempts
CREATE OR REPLACE FUNCTION audit_email_security(email_content TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  security_issues TEXT[] := ARRAY[]::TEXT[];
  risk_level TEXT := 'low';
BEGIN
  -- Check for script injection
  IF email_content ~* '<script|javascript:|data:|vbscript:' THEN
    security_issues := array_append(security_issues, 'Script injection detected');
    risk_level := 'critical';
  END IF;
  
  -- Check for event handlers
  IF email_content ~* 'on(load|error|click|focus|blur|submit)=' THEN
    security_issues := array_append(security_issues, 'Event handler detected');
    risk_level := 'high';
  END IF;
  
  -- Check for suspicious URLs
  IF email_content ~* 'http://|ftp://|file://' THEN
    security_issues := array_append(security_issues, 'Potentially unsafe URL detected');
    IF risk_level = 'low' THEN risk_level := 'medium'; END IF;
  END IF;
  
  -- Check for HTML injection
  IF email_content ~* '<(iframe|embed|object|applet|meta)' THEN
    security_issues := array_append(security_issues, 'Potentially dangerous HTML tags');
    risk_level := 'high';
  END IF;
  
  RETURN jsonb_build_object(
    'risk_level', risk_level,
    'issues_found', array_length(security_issues, 1),
    'security_issues', security_issues,
    'is_safe', array_length(security_issues, 1) = 0,
    'audit_timestamp', NOW()
  );
END;
$$;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_email_notifications_type_status 
ON email_notifications(notification_type, status);

CREATE INDEX IF NOT EXISTS idx_email_notifications_created_at 
ON email_notifications(created_at);

-- Set proper permissions
REVOKE ALL ON FUNCTION html_escape(TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION html_escape(TEXT) TO authenticated;

REVOKE ALL ON FUNCTION safe_template_render(TEXT, JSONB) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION safe_template_render(TEXT, JSONB) TO authenticated;

REVOKE ALL ON FUNCTION send_secure_email_notification(TEXT, TEXT, UUID, UUID, JSONB) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION send_secure_email_notification(TEXT, TEXT, UUID, UUID, JSONB) TO authenticated;

-- Add comments for documentation
COMMENT ON FUNCTION html_escape(TEXT) IS 'Securely escapes HTML special characters to prevent XSS attacks';
COMMENT ON FUNCTION safe_template_render(TEXT, JSONB) IS 'Safely renders email templates with input validation and sanitization';
COMMENT ON FUNCTION send_secure_email_notification(TEXT, TEXT, UUID, UUID, JSONB) IS 'Secure email notification function that prevents SQL injection and XSS';
COMMENT ON FUNCTION audit_email_security(TEXT) IS 'Audits email content for potential security vulnerabilities';