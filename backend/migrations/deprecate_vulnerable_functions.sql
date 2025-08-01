-- Deprecate and Replace Vulnerable Email Functions
-- This migration safely replaces vulnerable functions with secure alternatives

-- Mark old functions as deprecated and create secure replacements

-- 1. Replace the vulnerable send_templated_email_notification function
DROP FUNCTION IF EXISTS send_templated_email_notification(TEXT, JSONB, TEXT);

-- Create a secure wrapper that calls our new secure function
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
  primary_email TEXT;
  result JSONB;
BEGIN
  -- Get the primary email from settings
  primary_email := get_email_setting('primary_email');
  
  -- Validate inputs
  IF primary_email IS NULL OR NOT is_valid_email(primary_email) THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Primary email not configured or invalid'
    );
  END IF;
  
  -- Call the secure email function
  result := send_secure_email_notification(
    p_notification_type,
    primary_email,
    (p_template_data->>'booking_id')::UUID,
    (p_template_data->>'user_id')::UUID,
    p_template_data
  );
  
  RETURN result;
END;
$$;

-- 2. Secure the trigger_booking_automation function
CREATE OR REPLACE FUNCTION trigger_booking_automation()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  template_data JSONB;
  email_result JSONB;
  celebrity_name TEXT;
  is_high_value BOOLEAN := false;
BEGIN
  -- Get celebrity name safely
  SELECT name INTO celebrity_name 
  FROM celebrities 
  WHERE id = NEW.celebrity_id;
  
  -- Determine if this is a high-value booking
  is_high_value := NEW.total_amount > 50000;
  
  -- Build secure template data
  template_data := jsonb_build_object(
    'booking_id', NEW.id,
    'user_name', NEW.contact_name,
    'user_email', NEW.contact_email,
    'celebrity_name', COALESCE(celebrity_name, 'Unknown Celebrity'),
    'event_type', NEW.event_type,
    'event_date', NEW.event_date,
    'event_location', NEW.event_location,
    'total_amount', NEW.total_amount,
    'status', NEW.status,
    'is_high_value', is_high_value
  );
  
  -- Send appropriate notifications based on booking value and status
  CASE NEW.status
    WHEN 'confirmed' THEN
      -- Send booking confirmation
      email_result := send_secure_email_notification(
        'booking_confirmation',
        NEW.contact_email,
        NEW.id,
        NEW.user_id,
        template_data
      );
      
      -- Send admin alert for new booking
      email_result := send_secure_email_notification(
        CASE WHEN is_high_value THEN 'high_value_alert' ELSE 'booking_alert' END,
        get_email_setting('primary_email'),
        NEW.id,
        NEW.user_id,
        template_data
      );
      
    WHEN 'pending' THEN
      -- Send admin notification for pending booking
      email_result := send_secure_email_notification(
        CASE WHEN is_high_value THEN 'high_value_alert' ELSE 'booking_alert' END,
        get_email_setting('primary_email'),
        NEW.id,
        NEW.user_id,
        template_data
      );
  END CASE;
  
  RETURN NEW;
END;
$$;

-- 3. Secure the trigger_user_behavior_email function
CREATE OR REPLACE FUNCTION trigger_user_behavior_email()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  template_data JSONB;
  user_email TEXT;
  email_result JSONB;
BEGIN
  -- Only trigger for specific behavior types
  IF NEW.behavior_type NOT IN ('booking_abandoned', 'high_engagement', 'repeat_customer') THEN
    RETURN NEW;
  END IF;
  
  -- Get user email safely
  SELECT email INTO user_email 
  FROM app_users 
  WHERE id = NEW.user_id;
  
  -- Skip if email is invalid
  IF NOT is_valid_email(user_email) THEN
    RETURN NEW;
  END IF;
  
  -- Build secure template data
  template_data := jsonb_build_object(
    'user_id', NEW.user_id,
    'behavior_type', NEW.behavior_type,
    'metadata', NEW.metadata,
    'created_at', NEW.created_at
  );
  
  -- Send appropriate email based on behavior type
  CASE NEW.behavior_type
    WHEN 'booking_abandoned' THEN
      email_result := send_secure_email_notification(
        'booking_reminder',
        user_email,
        (NEW.metadata->>'booking_id')::UUID,
        NEW.user_id,
        template_data
      );
      
    WHEN 'high_engagement' THEN
      email_result := send_secure_email_notification(
        'engagement_reward',
        user_email,
        NULL,
        NEW.user_id,
        template_data
      );
      
    WHEN 'repeat_customer' THEN
      email_result := send_secure_email_notification(
        'loyalty_appreciation',
        user_email,
        NULL,
        NEW.user_id,
        template_data
      );
  END CASE;
  
  RETURN NEW;
END;
$$;

-- 4. Create a secure email template validation function
CREATE OR REPLACE FUNCTION validate_email_template(
  template_key TEXT,
  subject_template TEXT,
  html_template TEXT,
  text_template TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  validation_result JSONB;
  security_audit JSONB;
  validation_errors TEXT[] := ARRAY[]::TEXT[];
BEGIN
  -- Validate template key format
  IF template_key !~ '^[a-zA-Z0-9_-]+$' OR length(template_key) > 50 THEN
    validation_errors := array_append(validation_errors, 'Invalid template key format');
  END IF;
  
  -- Validate template content length
  IF length(subject_template) > 200 THEN
    validation_errors := array_append(validation_errors, 'Subject template too long (max 200 characters)');
  END IF;
  
  IF length(html_template) > 50000 THEN
    validation_errors := array_append(validation_errors, 'HTML template too long (max 50,000 characters)');
  END IF;
  
  -- Security audit for HTML template
  security_audit := audit_email_security(html_template);
  
  IF NOT (security_audit->>'is_safe')::boolean THEN
    validation_errors := array_append(validation_errors, 'Template contains security risks');
  END IF;
  
  -- Check for required placeholders
  IF html_template !~ '\{\{.*\}\}' THEN
    validation_errors := array_append(validation_errors, 'Template should contain at least one placeholder');
  END IF;
  
  RETURN jsonb_build_object(
    'is_valid', array_length(validation_errors, 1) = 0,
    'validation_errors', validation_errors,
    'security_audit', security_audit,
    'template_key', template_key,
    'validated_at', NOW()
  );
END;
$$;

-- 5. Create secure function to update email templates
CREATE OR REPLACE FUNCTION update_email_template_secure(
  p_template_key TEXT,
  p_subject_template TEXT,
  p_html_template TEXT,
  p_text_template TEXT DEFAULT NULL,
  p_description TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  validation_result JSONB;
  template_id UUID;
BEGIN
  -- Validate the template
  validation_result := validate_email_template(
    p_template_key,
    p_subject_template,
    p_html_template,
    p_text_template
  );
  
  -- Return validation errors if invalid
  IF NOT (validation_result->>'is_valid')::boolean THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Template validation failed',
      'validation_result', validation_result
    );
  END IF;
  
  -- Insert or update the template
  INSERT INTO email_templates (
    template_key,
    subject_template,
    html_template,
    text_template,
    description,
    is_active,
    created_at,
    updated_at
  ) VALUES (
    p_template_key,
    p_subject_template,
    p_html_template,
    p_text_template,
    p_description,
    true,
    NOW(),
    NOW()
  )
  ON CONFLICT (template_key) DO UPDATE SET
    subject_template = EXCLUDED.subject_template,
    html_template = EXCLUDED.html_template,
    text_template = EXCLUDED.text_template,
    description = EXCLUDED.description,
    updated_at = NOW()
  RETURNING id INTO template_id;
  
  RETURN jsonb_build_object(
    'success', true,
    'template_id', template_id,
    'template_key', p_template_key,
    'validation_result', validation_result
  );
END;
$$;

-- 6. Create trigger to audit email template changes
CREATE OR REPLACE FUNCTION audit_email_template_changes()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Log template changes for security auditing
  INSERT INTO audit_logs (
    user_id, action, resource, resource_id,
    old_values, new_values, created_at
  ) VALUES (
    NULL, -- System change
    TG_OP,
    'email_template',
    COALESCE(NEW.id, OLD.id),
    CASE WHEN TG_OP = 'DELETE' THEN to_jsonb(OLD) ELSE NULL END,
    CASE WHEN TG_OP != 'DELETE' THEN to_jsonb(NEW) ELSE NULL END,
    NOW()
  );
  
  RETURN COALESCE(NEW, OLD);
END;
$$;

-- Apply the audit trigger
DROP TRIGGER IF EXISTS email_template_audit_trigger ON email_templates;
CREATE TRIGGER email_template_audit_trigger
  AFTER INSERT OR UPDATE OR DELETE ON email_templates
  FOR EACH ROW
  EXECUTE FUNCTION audit_email_template_changes();

-- 7. Update existing triggers to use secure functions
DROP TRIGGER IF EXISTS booking_automation_trigger ON bookings;
CREATE TRIGGER booking_automation_trigger
  AFTER INSERT OR UPDATE ON bookings
  FOR EACH ROW
  EXECUTE FUNCTION trigger_booking_automation();

DROP TRIGGER IF EXISTS user_behavior_email_trigger ON user_behavior;
CREATE TRIGGER user_behavior_email_trigger
  AFTER INSERT ON user_behavior
  FOR EACH ROW
  EXECUTE FUNCTION trigger_user_behavior_email();

-- 8. Create function to migrate existing vulnerable email data
CREATE OR REPLACE FUNCTION migrate_existing_email_data()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  processed_count INTEGER := 0;
  error_count INTEGER := 0;
  email_record RECORD;
  security_audit JSONB;
BEGIN
  -- Audit existing email notifications for security issues
  FOR email_record IN 
    SELECT id, body, notification_type, created_at 
    FROM email_notifications 
    WHERE created_at > NOW() - INTERVAL '30 days'
    AND status != 'migrated'
  LOOP
    BEGIN
      -- Audit the email content
      security_audit := audit_email_security(email_record.body);
      
      -- Update with audit results
      UPDATE email_notifications 
      SET metadata = COALESCE(metadata, '{}'::jsonb) || jsonb_build_object(
        'security_audit', security_audit,
        'migration_date', NOW()
      ),
      status = 'migrated'
      WHERE id = email_record.id;
      
      processed_count := processed_count + 1;
      
    EXCEPTION WHEN OTHERS THEN
      error_count := error_count + 1;
    END;
  END LOOP;
  
  RETURN jsonb_build_object(
    'processed_count', processed_count,
    'error_count', error_count,
    'migration_completed_at', NOW()
  );
END;
$$;

-- Set proper permissions for new functions
REVOKE ALL ON FUNCTION send_templated_email_notification(TEXT, JSONB, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION send_templated_email_notification(TEXT, JSONB, TEXT) TO authenticated;

REVOKE ALL ON FUNCTION validate_email_template(TEXT, TEXT, TEXT, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION validate_email_template(TEXT, TEXT, TEXT, TEXT) TO authenticated;

REVOKE ALL ON FUNCTION update_email_template_secure(TEXT, TEXT, TEXT, TEXT, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION update_email_template_secure(TEXT, TEXT, TEXT, TEXT, TEXT) TO service_role;

-- Add documentation
COMMENT ON FUNCTION send_templated_email_notification(TEXT, JSONB, TEXT) IS 'Secure replacement for vulnerable email notification function';
COMMENT ON FUNCTION validate_email_template(TEXT, TEXT, TEXT, TEXT) IS 'Validates email templates for security vulnerabilities';
COMMENT ON FUNCTION update_email_template_secure(TEXT, TEXT, TEXT, TEXT, TEXT) IS 'Securely updates email templates with validation';
COMMENT ON FUNCTION migrate_existing_email_data() IS 'Migrates and audits existing email data for security issues';