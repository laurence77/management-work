-- Corrected SQL function for your smooth-endpoint
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
  -- Call Supabase Edge Function via HTTP to send email
  SELECT content::JSONB INTO result
  FROM http((
    'POST',
    'https://rhatsyvvhizeqzusyblu.supabase.co/functions/v1/smooth-endpoint',
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

  -- Log the email
  INSERT INTO email_notifications (
    to_email, subject, body, notification_type, status, created_at
  ) VALUES (
    p_to_email, p_subject, p_body, p_notification_type, 'sent', NOW()
  );

  RETURN result;
END;
$$;