-- Calendar Integration Migration
-- Add calendar-related tables and columns

-- Table to store user calendar tokens
CREATE TABLE IF NOT EXISTS user_calendar_tokens (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  access_token TEXT NOT NULL,
  refresh_token TEXT,
  token_type VARCHAR(50) DEFAULT 'Bearer',
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  scope TEXT,
  email VARCHAR(255),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Ensure one token record per user
  UNIQUE(user_id)
);

-- Add calendar event ID to bookings table
ALTER TABLE bookings 
ADD COLUMN IF NOT EXISTS calendar_event_id VARCHAR(255),
ADD COLUMN IF NOT EXISTS timezone VARCHAR(100) DEFAULT 'America/New_York',
ADD COLUMN IF NOT EXISTS celebrity_contact_email VARCHAR(255);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_bookings_calendar_event_id ON bookings(calendar_event_id);
CREATE INDEX IF NOT EXISTS idx_user_calendar_tokens_user_id ON user_calendar_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_user_calendar_tokens_expires_at ON user_calendar_tokens(expires_at);

-- Create calendar sync logs table for tracking
CREATE TABLE IF NOT EXISTS calendar_sync_logs (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  booking_id INTEGER REFERENCES bookings(id) ON DELETE CASCADE,
  action VARCHAR(50) NOT NULL, -- 'create', 'update', 'delete', 'sync_all'
  calendar_event_id VARCHAR(255),
  status VARCHAR(50) NOT NULL, -- 'success', 'failed', 'pending'
  error_message TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for sync logs
CREATE INDEX IF NOT EXISTS idx_calendar_sync_logs_user_id ON calendar_sync_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_calendar_sync_logs_booking_id ON calendar_sync_logs(booking_id);
CREATE INDEX IF NOT EXISTS idx_calendar_sync_logs_status ON calendar_sync_logs(status);
CREATE INDEX IF NOT EXISTS idx_calendar_sync_logs_created_at ON calendar_sync_logs(created_at);

-- Add calendar preferences to user_settings table
ALTER TABLE user_settings 
ADD COLUMN IF NOT EXISTS calendar_auto_sync BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS calendar_reminder_minutes INTEGER DEFAULT 60,
ADD COLUMN IF NOT EXISTS calendar_timezone VARCHAR(100) DEFAULT 'America/New_York',
ADD COLUMN IF NOT EXISTS calendar_color_id VARCHAR(10) DEFAULT '11';

-- Create function to log calendar sync operations
CREATE OR REPLACE FUNCTION log_calendar_sync(
  p_user_id INTEGER,
  p_booking_id INTEGER,
  p_action VARCHAR(50),
  p_calendar_event_id VARCHAR(255),
  p_status VARCHAR(50),
  p_error_message TEXT DEFAULT NULL,
  p_metadata JSONB DEFAULT '{}'
)
RETURNS INTEGER AS $$
DECLARE
  log_id INTEGER;
BEGIN
  INSERT INTO calendar_sync_logs (
    user_id,
    booking_id,
    action,
    calendar_event_id,
    status,
    error_message,
    metadata
  ) VALUES (
    p_user_id,
    p_booking_id,
    p_action,
    p_calendar_event_id,
    p_status,
    p_error_message,
    p_metadata
  ) RETURNING id INTO log_id;
  
  RETURN log_id;
END;
$$ LANGUAGE plpgsql;

-- Create function to update booking calendar event ID
CREATE OR REPLACE FUNCTION update_booking_calendar_event(
  p_booking_id INTEGER,
  p_calendar_event_id VARCHAR(255)
)
RETURNS BOOLEAN AS $$
BEGIN
  UPDATE bookings 
  SET 
    calendar_event_id = p_calendar_event_id,
    updated_at = NOW()
  WHERE id = p_booking_id;
  
  RETURN FOUND;
END;
$$ LANGUAGE plpgsql;

-- Create function to get calendar integration status
CREATE OR REPLACE FUNCTION get_calendar_integration_status(p_user_id INTEGER)
RETURNS TABLE(
  is_connected BOOLEAN,
  last_sync TIMESTAMP WITH TIME ZONE,
  token_expires_at TIMESTAMP WITH TIME ZONE,
  total_synced_bookings INTEGER,
  last_sync_status VARCHAR(50)
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    CASE WHEN uct.user_id IS NOT NULL THEN true ELSE false END as is_connected,
    uct.updated_at as last_sync,
    uct.expires_at as token_expires_at,
    COUNT(b.calendar_event_id)::INTEGER as total_synced_bookings,
    (
      SELECT csl.status 
      FROM calendar_sync_logs csl 
      WHERE csl.user_id = p_user_id 
      ORDER BY csl.created_at DESC 
      LIMIT 1
    ) as last_sync_status
  FROM user_calendar_tokens uct
  FULL OUTER JOIN bookings b ON b.user_id = uct.user_id AND b.calendar_event_id IS NOT NULL
  WHERE uct.user_id = p_user_id OR b.user_id = p_user_id
  GROUP BY uct.user_id, uct.updated_at, uct.expires_at;
END;
$$ LANGUAGE plpgsql;

-- Create function to clean up expired tokens
CREATE OR REPLACE FUNCTION cleanup_expired_calendar_tokens()
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM user_calendar_tokens 
  WHERE expires_at < NOW() - INTERVAL '30 days';
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically log calendar operations
CREATE OR REPLACE FUNCTION trigger_log_calendar_event_changes()
RETURNS TRIGGER AS $$
BEGIN
  -- Log when calendar_event_id is added or changed
  IF TG_OP = 'UPDATE' AND (
    OLD.calendar_event_id IS DISTINCT FROM NEW.calendar_event_id
  ) THEN
    -- Log the change
    IF NEW.calendar_event_id IS NOT NULL AND OLD.calendar_event_id IS NULL THEN
      -- New calendar event created
      PERFORM log_calendar_sync(
        NEW.user_id,
        NEW.id,
        'create',
        NEW.calendar_event_id,
        'success',
        NULL,
        jsonb_build_object('booking_status', NEW.status)
      );
    ELSIF NEW.calendar_event_id IS NOT NULL AND OLD.calendar_event_id IS NOT NULL THEN
      -- Calendar event updated
      PERFORM log_calendar_sync(
        NEW.user_id,
        NEW.id,
        'update',
        NEW.calendar_event_id,
        'success',
        NULL,
        jsonb_build_object('old_event_id', OLD.calendar_event_id, 'booking_status', NEW.status)
      );
    ELSIF NEW.calendar_event_id IS NULL AND OLD.calendar_event_id IS NOT NULL THEN
      -- Calendar event deleted
      PERFORM log_calendar_sync(
        NEW.user_id,
        NEW.id,
        'delete',
        OLD.calendar_event_id,
        'success',
        NULL,
        jsonb_build_object('booking_status', NEW.status)
      );
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create the trigger
DROP TRIGGER IF EXISTS trigger_booking_calendar_changes ON bookings;
CREATE TRIGGER trigger_booking_calendar_changes
  AFTER UPDATE ON bookings
  FOR EACH ROW
  EXECUTE FUNCTION trigger_log_calendar_event_changes();

-- Add RLS policies for calendar tables
ALTER TABLE user_calendar_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE calendar_sync_logs ENABLE ROW LEVEL SECURITY;

-- Policy for user_calendar_tokens
DROP POLICY IF EXISTS "Users can manage their own calendar tokens" ON user_calendar_tokens;
CREATE POLICY "Users can manage their own calendar tokens" ON user_calendar_tokens
  FOR ALL 
  USING (auth.uid()::text = user_id::text);

-- Policy for calendar_sync_logs
DROP POLICY IF EXISTS "Users can view their own calendar sync logs" ON calendar_sync_logs;
CREATE POLICY "Users can view their own calendar sync logs" ON calendar_sync_logs
  FOR SELECT 
  USING (auth.uid()::text = user_id::text);

-- Insert permission for calendar sync logs (system can insert)
DROP POLICY IF EXISTS "System can insert calendar sync logs" ON calendar_sync_logs;
CREATE POLICY "System can insert calendar sync logs" ON calendar_sync_logs
  FOR INSERT 
  WITH CHECK (true);

-- Add calendar integration feature flag
INSERT INTO feature_flags (name, is_enabled, description, created_at, updated_at)
VALUES (
  'calendar_integration',
  true,
  'Enable Google Calendar integration for booking synchronization',
  NOW(),
  NOW()
) ON CONFLICT (name) DO UPDATE SET
  is_enabled = EXCLUDED.is_enabled,
  description = EXCLUDED.description,
  updated_at = NOW();

-- Create view for calendar integration dashboard
CREATE OR REPLACE VIEW calendar_integration_dashboard AS
SELECT 
  u.id as user_id,
  u.email,
  uct.email as calendar_email,
  CASE WHEN uct.user_id IS NOT NULL THEN true ELSE false END as is_connected,
  uct.expires_at as token_expires_at,
  CASE WHEN uct.expires_at < NOW() THEN true ELSE false END as token_expired,
  COUNT(b.id) as total_bookings,
  COUNT(b.calendar_event_id) as synced_bookings,
  COUNT(CASE WHEN b.calendar_event_id IS NULL AND b.status IN ('confirmed', 'pending') THEN 1 END) as unsynced_bookings,
  MAX(csl.created_at) as last_sync_attempt,
  (
    SELECT csl2.status 
    FROM calendar_sync_logs csl2 
    WHERE csl2.user_id = u.id 
    ORDER BY csl2.created_at DESC 
    LIMIT 1
  ) as last_sync_status
FROM users u
LEFT JOIN user_calendar_tokens uct ON uct.user_id = u.id
LEFT JOIN bookings b ON b.user_id = u.id
LEFT JOIN calendar_sync_logs csl ON csl.user_id = u.id
GROUP BY u.id, u.email, uct.email, uct.user_id, uct.expires_at;

-- Create indexes for the view
CREATE INDEX IF NOT EXISTS idx_calendar_dashboard_user_id ON users(id);
CREATE INDEX IF NOT EXISTS idx_calendar_dashboard_booking_user_id ON bookings(user_id);

-- Add comments for documentation
COMMENT ON TABLE user_calendar_tokens IS 'Stores Google Calendar OAuth tokens for users';
COMMENT ON TABLE calendar_sync_logs IS 'Logs all calendar synchronization operations';
COMMENT ON FUNCTION log_calendar_sync IS 'Logs calendar sync operations for audit trail';
COMMENT ON FUNCTION get_calendar_integration_status IS 'Returns calendar integration status for a user';
COMMENT ON VIEW calendar_integration_dashboard IS 'Dashboard view for calendar integration statistics';