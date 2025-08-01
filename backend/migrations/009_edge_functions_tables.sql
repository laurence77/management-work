-- Database tables to support Supabase Edge Functions

-- Notifications table for in-app notifications
CREATE TABLE IF NOT EXISTS notifications (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES app_users(id) ON DELETE CASCADE,
  type VARCHAR(50) NOT NULL,
  title VARCHAR(255) NOT NULL,
  message TEXT NOT NULL,
  data JSONB DEFAULT '{}',
  is_read BOOLEAN DEFAULT false,
  read_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Notification logs for tracking sent notifications
CREATE TABLE IF NOT EXISTS notification_logs (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  booking_id UUID REFERENCES bookings(id) ON DELETE CASCADE,
  user_id UUID REFERENCES app_users(id) ON DELETE CASCADE,
  notification_type VARCHAR(50) NOT NULL,
  status VARCHAR(20) DEFAULT 'sent',
  metadata JSONB DEFAULT '{}',
  sent_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Files table for file processing
CREATE TABLE IF NOT EXISTS files (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  file_name VARCHAR(255) NOT NULL,
  file_path TEXT NOT NULL UNIQUE,
  file_size BIGINT NOT NULL,
  mime_type VARCHAR(100) NOT NULL,
  user_id UUID REFERENCES app_users(id) ON DELETE SET NULL,
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  metadata JSONB DEFAULT '{}',
  thumbnail_path TEXT,
  status VARCHAR(20) DEFAULT 'uploaded',
  is_processed BOOLEAN DEFAULT false,
  processed_at TIMESTAMP WITH TIME ZONE,
  processing_results JSONB,
  scan_status VARCHAR(20) DEFAULT 'pending',
  metadata_extracted BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- File text content for searchable text extraction
CREATE TABLE IF NOT EXISTS file_text_content (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  file_path TEXT REFERENCES files(file_path) ON DELETE CASCADE,
  extracted_text TEXT,
  word_count INTEGER,
  extracted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- File processing logs
CREATE TABLE IF NOT EXISTS file_processing_logs (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  file_path TEXT NOT NULL,
  action VARCHAR(50) NOT NULL,
  user_id UUID REFERENCES app_users(id) ON DELETE SET NULL,
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  success BOOLEAN NOT NULL,
  result JSONB DEFAULT '{}',
  processed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Security incidents table
CREATE TABLE IF NOT EXISTS security_incidents (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  incident_type VARCHAR(50) NOT NULL,
  file_path TEXT,
  user_id UUID REFERENCES app_users(id) ON DELETE SET NULL,
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  details TEXT,
  severity VARCHAR(20) DEFAULT 'medium',
  status VARCHAR(20) DEFAULT 'open',
  resolved_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Calendar events for calendar sync
CREATE TABLE IF NOT EXISTS calendar_events (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  booking_id UUID REFERENCES bookings(id) ON DELETE CASCADE,
  user_id UUID REFERENCES app_users(id) ON DELETE CASCADE,
  external_event_id VARCHAR(255) NOT NULL,
  calendar_provider VARCHAR(20) NOT NULL,
  calendar_id VARCHAR(255) NOT NULL,
  event_title VARCHAR(255) NOT NULL,
  event_description TEXT,
  start_time TIMESTAMP WITH TIME ZONE NOT NULL,
  end_time TIMESTAMP WITH TIME ZONE NOT NULL,
  location TEXT,
  attendees TEXT[] DEFAULT '{}',
  reminders INTEGER[] DEFAULT '{60, 1440}',
  calendar_url TEXT,
  sync_status VARCHAR(20) DEFAULT 'pending',
  last_synced TIMESTAMP WITH TIME ZONE,
  deleted_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- User calendar settings
CREATE TABLE IF NOT EXISTS user_calendar_settings (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES app_users(id) ON DELETE CASCADE UNIQUE,
  default_provider VARCHAR(20) DEFAULT 'google',
  default_calendar_id VARCHAR(255),
  google_access_token TEXT,
  google_refresh_token TEXT,
  outlook_access_token TEXT,
  outlook_refresh_token TEXT,
  apple_credentials JSONB,
  auto_sync BOOLEAN DEFAULT true,
  reminder_preferences INTEGER[] DEFAULT '{60, 1440}',
  timezone VARCHAR(50) DEFAULT 'UTC',
  last_sync TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Calendar sync logs
CREATE TABLE IF NOT EXISTS calendar_sync_logs (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  booking_id UUID REFERENCES bookings(id) ON DELETE CASCADE,
  user_id UUID REFERENCES app_users(id) ON DELETE CASCADE,
  action VARCHAR(50) NOT NULL,
  calendar_provider VARCHAR(20),
  success BOOLEAN NOT NULL,
  result JSONB DEFAULT '{}',
  synced_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Daily metrics for analytics
CREATE TABLE IF NOT EXISTS daily_metrics (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  date DATE NOT NULL,
  metric_type VARCHAR(50) NOT NULL,
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  value NUMERIC NOT NULL DEFAULT 0,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(date, metric_type, organization_id)
);

-- Celebrity metrics
CREATE TABLE IF NOT EXISTS celebrity_metrics (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  celebrity_id UUID REFERENCES celebrities(id) ON DELETE CASCADE,
  metric_type VARCHAR(50) NOT NULL,
  value NUMERIC NOT NULL DEFAULT 0,
  last_updated TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(celebrity_id, metric_type)
);

-- Category metrics
CREATE TABLE IF NOT EXISTS category_metrics (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  date DATE NOT NULL,
  category VARCHAR(50) NOT NULL,
  metric_type VARCHAR(50) NOT NULL,
  count INTEGER DEFAULT 0,
  revenue NUMERIC DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(date, category, metric_type)
);

-- Revenue forecasts
CREATE TABLE IF NOT EXISTS revenue_forecasts (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  month VARCHAR(7) NOT NULL, -- YYYY-MM format
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  projected_revenue NUMERIC DEFAULT 0,
  actual_revenue NUMERIC DEFAULT 0,
  booking_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(month, organization_id)
);

-- Realtime events for dashboard
CREATE TABLE IF NOT EXISTS realtime_events (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  event_type VARCHAR(50) NOT NULL,
  table_name VARCHAR(50) NOT NULL,
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Analytics insights
CREATE TABLE IF NOT EXISTS analytics_insights (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  event_type VARCHAR(50) NOT NULL,
  table_name VARCHAR(50) NOT NULL,
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  insights JSONB NOT NULL,
  confidence_score NUMERIC DEFAULT 0.5,
  generated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Analytics alerts
CREATE TABLE IF NOT EXISTS analytics_alerts (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  alert_type VARCHAR(50) NOT NULL,
  severity VARCHAR(20) NOT NULL,
  description TEXT NOT NULL,
  data JSONB DEFAULT '{}',
  is_resolved BOOLEAN DEFAULT false,
  resolved_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Booking status transitions
CREATE TABLE IF NOT EXISTS booking_status_transitions (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  booking_id UUID REFERENCES bookings(id) ON DELETE CASCADE,
  from_status VARCHAR(50) NOT NULL,
  to_status VARCHAR(50) NOT NULL,
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  transitioned_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- User engagement tracking
CREATE TABLE IF NOT EXISTS user_engagement (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES app_users(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  action_type VARCHAR(50) NOT NULL,
  count INTEGER DEFAULT 1,
  last_updated TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, date, action_type)
);

-- User role changes history
CREATE TABLE IF NOT EXISTS user_role_changes (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES app_users(id) ON DELETE CASCADE,
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  old_role VARCHAR(50) NOT NULL,
  new_role VARCHAR(50) NOT NULL,
  changed_by UUID REFERENCES app_users(id) ON DELETE SET NULL,
  changed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_is_read ON notifications(is_read);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at);

CREATE INDEX IF NOT EXISTS idx_notification_logs_booking_id ON notification_logs(booking_id);
CREATE INDEX IF NOT EXISTS idx_notification_logs_user_id ON notification_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_notification_logs_sent_at ON notification_logs(sent_at);

CREATE INDEX IF NOT EXISTS idx_files_user_id ON files(user_id);
CREATE INDEX IF NOT EXISTS idx_files_organization_id ON files(organization_id);
CREATE INDEX IF NOT EXISTS idx_files_status ON files(status);
CREATE INDEX IF NOT EXISTS idx_files_is_processed ON files(is_processed);
CREATE INDEX IF NOT EXISTS idx_files_mime_type ON files(mime_type);

CREATE INDEX IF NOT EXISTS idx_calendar_events_booking_id ON calendar_events(booking_id);
CREATE INDEX IF NOT EXISTS idx_calendar_events_user_id ON calendar_events(user_id);
CREATE INDEX IF NOT EXISTS idx_calendar_events_start_time ON calendar_events(start_time);
CREATE INDEX IF NOT EXISTS idx_calendar_events_sync_status ON calendar_events(sync_status);

CREATE INDEX IF NOT EXISTS idx_daily_metrics_date ON daily_metrics(date);
CREATE INDEX IF NOT EXISTS idx_daily_metrics_organization_id ON daily_metrics(organization_id);
CREATE INDEX IF NOT EXISTS idx_daily_metrics_metric_type ON daily_metrics(metric_type);

CREATE INDEX IF NOT EXISTS idx_celebrity_metrics_celebrity_id ON celebrity_metrics(celebrity_id);
CREATE INDEX IF NOT EXISTS idx_celebrity_metrics_metric_type ON celebrity_metrics(metric_type);

CREATE INDEX IF NOT EXISTS idx_realtime_events_timestamp ON realtime_events(timestamp);
CREATE INDEX IF NOT EXISTS idx_realtime_events_organization_id ON realtime_events(organization_id);
CREATE INDEX IF NOT EXISTS idx_realtime_events_event_type ON realtime_events(event_type);

CREATE INDEX IF NOT EXISTS idx_booking_status_transitions_booking_id ON booking_status_transitions(booking_id);
CREATE INDEX IF NOT EXISTS idx_booking_status_transitions_organization_id ON booking_status_transitions(organization_id);

-- Enable RLS on all tables
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE files ENABLE ROW LEVEL SECURITY;
ALTER TABLE file_text_content ENABLE ROW LEVEL SECURITY;
ALTER TABLE file_processing_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE security_incidents ENABLE ROW LEVEL SECURITY;
ALTER TABLE calendar_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_calendar_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE calendar_sync_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE celebrity_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE category_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE revenue_forecasts ENABLE ROW LEVEL SECURITY;
ALTER TABLE realtime_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE analytics_insights ENABLE ROW LEVEL SECURITY;
ALTER TABLE analytics_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE booking_status_transitions ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_engagement ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_role_changes ENABLE ROW LEVEL SECURITY;

-- RLS Policies for notifications
CREATE POLICY "Users can view their own notifications" ON notifications
  FOR SELECT USING (
    user_id IN (
      SELECT au.id FROM app_users au WHERE au.auth_id = auth.uid()
    )
  );

CREATE POLICY "Users can update their own notifications" ON notifications
  FOR UPDATE USING (
    user_id IN (
      SELECT au.id FROM app_users au WHERE au.auth_id = auth.uid()
    )
  );

-- RLS Policies for files
CREATE POLICY "Users can view files in their organization" ON files
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM app_users au 
      WHERE au.auth_id = auth.uid()
      AND (
        au.role = 'super_admin'
        OR au.organization_id = files.organization_id
      )
    )
  );

CREATE POLICY "Users can upload files to their organization" ON files
  FOR INSERT WITH CHECK (
    user_id IN (
      SELECT au.id FROM app_users au WHERE au.auth_id = auth.uid()
    )
    AND organization_id IN (
      SELECT au.organization_id FROM app_users au WHERE au.auth_id = auth.uid()
    )
  );

-- RLS Policies for calendar events
CREATE POLICY "Users can view their own calendar events" ON calendar_events
  FOR SELECT USING (
    user_id IN (
      SELECT au.id FROM app_users au WHERE au.auth_id = auth.uid()
    )
  );

CREATE POLICY "Users can manage their own calendar events" ON calendar_events
  FOR ALL USING (
    user_id IN (
      SELECT au.id FROM app_users au WHERE au.auth_id = auth.uid()
    )
  );

-- RLS Policies for analytics (organization-based)
CREATE POLICY "Users can view analytics for their organization" ON daily_metrics
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM app_users au 
      WHERE au.auth_id = auth.uid()
      AND (
        au.role = 'super_admin'
        OR au.organization_id = daily_metrics.organization_id
      )
    )
  );

-- Functions for analytics processing
CREATE OR REPLACE FUNCTION increment_celebrity_metric(
  celebrity_id UUID,
  metric_type TEXT,
  increment_by NUMERIC DEFAULT 1
) RETURNS VOID AS $$
BEGIN
  INSERT INTO celebrity_metrics (celebrity_id, metric_type, value)
  VALUES (celebrity_id, metric_type, increment_by)
  ON CONFLICT (celebrity_id, metric_type)
  DO UPDATE SET 
    value = celebrity_metrics.value + increment_by,
    last_updated = NOW();
END;
$$ LANGUAGE plpgsql;

-- Function to clean up old realtime events
CREATE OR REPLACE FUNCTION cleanup_old_realtime_events()
RETURNS VOID AS $$
BEGIN
  DELETE FROM realtime_events 
  WHERE created_at < NOW() - INTERVAL '7 days';
END;
$$ LANGUAGE plpgsql;

-- Function to mark notifications as read
CREATE OR REPLACE FUNCTION mark_notification_read(notification_id UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE notifications 
  SET is_read = true, read_at = NOW()
  WHERE id = notification_id
  AND user_id IN (
    SELECT au.id FROM app_users au WHERE au.auth_id = auth.uid()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Triggers for updated_at columns
DROP TRIGGER IF EXISTS update_files_updated_at ON files;
CREATE TRIGGER update_files_updated_at 
    BEFORE UPDATE ON files
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_user_calendar_settings_updated_at ON user_calendar_settings;
CREATE TRIGGER update_user_calendar_settings_updated_at 
    BEFORE UPDATE ON user_calendar_settings
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_revenue_forecasts_updated_at ON revenue_forecasts;
CREATE TRIGGER update_revenue_forecasts_updated_at 
    BEFORE UPDATE ON revenue_forecasts
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();