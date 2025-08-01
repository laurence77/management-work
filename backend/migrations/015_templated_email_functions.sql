-- Enhanced email functions that use professional templates
-- This replaces hardcoded HTML with template-based system

-- Function to send templated emails from SQL
CREATE OR REPLACE FUNCTION send_templated_email_notification(
  p_template_key TEXT,
  p_template_data JSONB,
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
  template_record RECORD;
  rendered_subject TEXT;
  rendered_html TEXT;
  rendered_text TEXT;
BEGIN
  -- Get template from database
  SELECT * INTO template_record
  FROM email_templates
  WHERE template_key = p_template_key
  AND is_active = true;
  
  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'error', 'Template not found: ' || p_template_key);
  END IF;
  
  -- Get target email from settings
  target_email := get_email_setting('primary_email');
  
  -- Check if this type of notification is enabled
  CASE p_notification_type
    WHEN 'high_value_alert' THEN
      email_enabled := get_email_setting('high_value_alerts')::BOOLEAN;
    WHEN 'auto_approval' THEN
      email_enabled := get_email_setting('auto_approval_notifications')::BOOLEAN;
    WHEN 'booking_abandoned' THEN
      email_enabled := get_email_setting('abandonment_alerts')::BOOLEAN;
    WHEN 'booking_success' THEN
      email_enabled := get_email_setting('booking_alerts')::BOOLEAN;
    ELSE
      email_enabled := true; -- Default enabled for other types
  END CASE;
  
  -- Only send if enabled
  IF NOT email_enabled THEN
    -- Still log the notification
    INSERT INTO email_notifications (
      to_email, subject, body, notification_type, 
      status, created_at, metadata
    ) VALUES (
      target_email, 'Email disabled', '', p_notification_type, 
      'disabled', NOW(),
      json_build_object('template_key', p_template_key, 'reason', 'Email type disabled in settings')
    );
    
    RETURN json_build_object('success', false, 'message', 'Email type disabled in settings');
  END IF;
  
  -- Render templates by replacing variables
  rendered_subject := template_record.subject_template;
  rendered_html := template_record.html_template;
  rendered_text := COALESCE(template_record.text_template, '');
  
  -- Replace template variables with actual data
  FOR key_value IN SELECT * FROM jsonb_each_text(p_template_data) LOOP
    rendered_subject := replace(rendered_subject, '{{' || key_value.key || '}}', key_value.value);
    rendered_html := replace(rendered_html, '{{' || key_value.key || '}}', key_value.value);
    rendered_text := replace(rendered_text, '{{' || key_value.key || '}}', key_value.value);
  END LOOP;
  
  -- Add default values for common variables if not provided
  IF rendered_subject LIKE '%{{dashboard_url}}%' THEN
    rendered_subject := replace(rendered_subject, '{{dashboard_url}}', 'http://localhost:5173');
    rendered_html := replace(rendered_html, '{{dashboard_url}}', 'http://localhost:5173');
    rendered_text := replace(rendered_text, '{{dashboard_url}}', 'http://localhost:5173');
  END IF;
  
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
      'subject', rendered_subject,
      'html', rendered_html,
      'type', p_notification_type
    )::TEXT
  ));

  -- Log the email notification with template info
  INSERT INTO email_notifications (
    to_email, subject, body, notification_type, 
    status, created_at, metadata
  ) VALUES (
    target_email, rendered_subject, rendered_html, p_notification_type, 
    CASE WHEN (result->>'success')::BOOLEAN THEN 'sent' ELSE 'failed' END, 
    NOW(),
    json_build_object(
      'template_key', p_template_key,
      'template_name', template_record.template_name,
      'template_data', p_template_data,
      'edge_function_result', result
    )
  );

  RETURN COALESCE(result, json_build_object('success', false, 'message', 'Failed to send email'));
END;
$$;

-- Updated booking automation trigger using professional templates
CREATE OR REPLACE FUNCTION trigger_booking_automation()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  template_data JSONB;
BEGIN
  -- Prepare common template data
  template_data := json_build_object(
    'booking_id', NEW.id,
    'client_name', COALESCE(NEW.user_name, 'Unknown'),
    'client_email', COALESCE(NEW.user_email, 'No email provided'),
    'celebrity_name', COALESCE(NEW.celebrity_name, 'TBD'),
    'event_type', COALESCE(NEW.event_type, 'Not specified'),
    'budget', NEW.budget::TEXT,
    'event_date', COALESCE(NEW.event_date::TEXT, 'TBD'),
    'dashboard_url', 'http://localhost:5173',
    'approved_at', NOW()::TEXT
  );
  
  -- Auto-approve logic
  IF NEW.budget < 10000 AND (NEW.fraud_score IS NULL OR NEW.fraud_score < 0.3) THEN
    NEW.status := 'approved';
    NEW.approval_type := 'auto_approved';
    
    -- Send auto-approval notification using template
    PERFORM send_templated_email_notification(
      'auto_approval',
      template_data,
      'auto_approval'
    );
    
  ELSIF NEW.budget > 50000 THEN
    NEW.status := 'pending_review';
    NEW.approval_type := 'high_value_review';
    
    -- Send high-value alert using template
    PERFORM send_templated_email_notification(
      'high_value_alert',
      template_data,
      'high_value_alert'
    );
    
  ELSE
    NEW.status := 'pending_review';
    NEW.approval_type := 'standard_review';
    
    -- For standard bookings, we can create a general booking notification
    -- or use the auto_approval template with different data
    PERFORM send_templated_email_notification(
      'auto_approval', -- Reuse template but with different context
      json_build_object(
        'booking_id', NEW.id,
        'client_name', COALESCE(NEW.user_name, 'Unknown'),
        'client_email', COALESCE(NEW.user_email, 'No email provided'),
        'celebrity_name', COALESCE(NEW.celebrity_name, 'TBD'),
        'event_type', COALESCE(NEW.event_type, 'Not specified'),
        'budget', NEW.budget::TEXT,
        'event_date', COALESCE(NEW.event_date::TEXT, 'TBD'),
        'dashboard_url', 'http://localhost:5173',
        'approved_at', 'Pending manual review'
      ),
      'standard_review'
    );
  END IF;

  RETURN NEW;
END;
$$;

-- Updated user behavior trigger using templates
CREATE OR REPLACE FUNCTION trigger_user_behavior_email()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  template_data JSONB;
  hours_since_action INTEGER;
BEGIN
  -- Calculate hours since the action
  hours_since_action := EXTRACT(EPOCH FROM (NOW() - NEW.created_at)) / 3600;
  
  -- Prepare template data
  template_data := json_build_object(
    'user_name', COALESCE(NEW.user_name, 'Unknown User'),
    'user_email', COALESCE(NEW.user_email, 'No email provided'),
    'user_id', NEW.user_id,
    'hours_since', hours_since_action::TEXT,
    'dashboard_url', 'http://localhost:5173'
  );
  
  -- Check for abandonment (user came back after leaving)
  IF NEW.action_type = 'abandonment_alert' THEN
    -- Use a general template for now, can create specific abandonment template later
    PERFORM send_templated_email_notification(
      'auto_approval', -- Reuse existing template
      json_build_object(
        'booking_id', 'ABANDONED-' || NEW.user_id,
        'client_name', COALESCE(NEW.user_name, 'Unknown User'),
        'client_email', COALESCE(NEW.user_email, 'No email provided'),
        'celebrity_name', 'Various celebrities',
        'event_type', 'Abandoned booking process',
        'budget', 'Unknown',
        'event_date', 'Not completed',
        'dashboard_url', 'http://localhost:5173',
        'approved_at', 'User abandoned booking after ' || hours_since_action || ' hours'
      ),
      'booking_abandoned'
    );
  END IF;
  
  RETURN NEW;
END;
$$;

-- Grant permissions
GRANT EXECUTE ON FUNCTION send_templated_email_notification(TEXT, JSONB, TEXT) TO authenticated;