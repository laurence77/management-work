-- Fraud Detection System Migration
-- Create tables and functions for fraud detection and smart alerts

-- Fraud assessments table
CREATE TABLE IF NOT EXISTS fraud_assessments (
  id SERIAL PRIMARY KEY,
  booking_id INTEGER REFERENCES bookings(id) ON DELETE CASCADE,
  user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  risk_score DECIMAL(5,2) NOT NULL DEFAULT 0,
  risk_level VARCHAR(10) NOT NULL CHECK (risk_level IN ('LOW', 'MEDIUM', 'HIGH')),
  risk_factors JSONB DEFAULT '[]',
  analysis_data JSONB DEFAULT '{}',
  requires_review BOOLEAN DEFAULT false,
  auto_block BOOLEAN DEFAULT false,
  review_status VARCHAR(20) DEFAULT 'pending' CHECK (review_status IN ('pending', 'approved', 'rejected', 'under_review', 'escalated')),
  reviewer_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  reviewer_notes TEXT,
  reviewed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Smart alerts table
CREATE TABLE IF NOT EXISTS alerts (
  id SERIAL PRIMARY KEY,
  type VARCHAR(50) NOT NULL,
  severity VARCHAR(10) NOT NULL CHECK (severity IN ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL')),
  title VARCHAR(255) NOT NULL,
  message TEXT NOT NULL,
  booking_id INTEGER REFERENCES bookings(id) ON DELETE CASCADE,
  user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  metadata JSONB DEFAULT '{}',
  is_read BOOLEAN DEFAULT false,
  read_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
  read_at TIMESTAMP WITH TIME ZONE,
  expires_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Email blacklist table
CREATE TABLE IF NOT EXISTS email_blacklist (
  id SERIAL PRIMARY KEY,
  email VARCHAR(255) NOT NULL UNIQUE,
  reason TEXT,
  added_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- IP blacklist table
CREATE TABLE IF NOT EXISTS ip_blacklist (
  id SERIAL PRIMARY KEY,
  ip_address INET NOT NULL UNIQUE,
  reason TEXT,
  added_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
  expires_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Booking sessions for tracking user behavior
CREATE TABLE IF NOT EXISTS booking_sessions (
  id SERIAL PRIMARY KEY,
  session_id VARCHAR(255) NOT NULL,
  user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  ip_address INET,
  user_agent TEXT,
  country VARCHAR(100),
  city VARCHAR(100),
  is_proxy BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  expires_at TIMESTAMP WITH TIME ZONE DEFAULT (NOW() + INTERVAL '24 hours')
);

-- Payment attempts tracking
CREATE TABLE IF NOT EXISTS payment_attempts (
  id SERIAL PRIMARY KEY,
  booking_id INTEGER REFERENCES bookings(id) ON DELETE CASCADE,
  user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  amount DECIMAL(10,2),
  payment_method VARCHAR(50),
  status VARCHAR(20) NOT NULL CHECK (status IN ('pending', 'success', 'failed', 'cancelled')),
  failure_reason TEXT,
  ip_address INET,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Fraud rules configuration
CREATE TABLE IF NOT EXISTS fraud_rules (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL UNIQUE,
  description TEXT,
  rule_type VARCHAR(50) NOT NULL,
  conditions JSONB NOT NULL,
  actions JSONB NOT NULL,
  weight INTEGER DEFAULT 10,
  is_active BOOLEAN DEFAULT true,
  created_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add fraud assessment reference to bookings
ALTER TABLE bookings 
ADD COLUMN IF NOT EXISTS fraud_assessment_id INTEGER REFERENCES fraud_assessments(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS is_flagged BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS flag_reason TEXT;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_fraud_assessments_booking_id ON fraud_assessments(booking_id);
CREATE INDEX IF NOT EXISTS idx_fraud_assessments_risk_level ON fraud_assessments(risk_level);
CREATE INDEX IF NOT EXISTS idx_fraud_assessments_created_at ON fraud_assessments(created_at);
CREATE INDEX IF NOT EXISTS idx_fraud_assessments_requires_review ON fraud_assessments(requires_review);

CREATE INDEX IF NOT EXISTS idx_alerts_type ON alerts(type);
CREATE INDEX IF NOT EXISTS idx_alerts_severity ON alerts(severity);
CREATE INDEX IF NOT EXISTS idx_alerts_is_read ON alerts(is_read);
CREATE INDEX IF NOT EXISTS idx_alerts_created_at ON alerts(created_at);
CREATE INDEX IF NOT EXISTS idx_alerts_booking_id ON alerts(booking_id);

CREATE INDEX IF NOT EXISTS idx_email_blacklist_email ON email_blacklist(email);
CREATE INDEX IF NOT EXISTS idx_ip_blacklist_ip ON ip_blacklist(ip_address);

CREATE INDEX IF NOT EXISTS idx_booking_sessions_user_id ON booking_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_booking_sessions_ip_address ON booking_sessions(ip_address);
CREATE INDEX IF NOT EXISTS idx_booking_sessions_created_at ON booking_sessions(created_at);

CREATE INDEX IF NOT EXISTS idx_payment_attempts_user_id ON payment_attempts(user_id);
CREATE INDEX IF NOT EXISTS idx_payment_attempts_booking_id ON payment_attempts(booking_id);
CREATE INDEX IF NOT EXISTS idx_payment_attempts_created_at ON payment_attempts(created_at);
CREATE INDEX IF NOT EXISTS idx_payment_attempts_status ON payment_attempts(status);

CREATE INDEX IF NOT EXISTS idx_fraud_rules_is_active ON fraud_rules(is_active);
CREATE INDEX IF NOT EXISTS idx_fraud_rules_rule_type ON fraud_rules(rule_type);

-- Create composite indexes
CREATE INDEX IF NOT EXISTS idx_bookings_fraud_flagged ON bookings(user_id, is_flagged, created_at);
CREATE INDEX IF NOT EXISTS idx_alerts_user_unread ON alerts(user_id, is_read, created_at) WHERE is_read = false;

-- Function to create fraud alert
CREATE OR REPLACE FUNCTION create_fraud_alert(
  p_type VARCHAR(50),
  p_severity VARCHAR(10),
  p_title VARCHAR(255),
  p_message TEXT,
  p_booking_id INTEGER DEFAULT NULL,
  p_user_id INTEGER DEFAULT NULL,
  p_metadata JSONB DEFAULT '{}'
)
RETURNS INTEGER AS $$
DECLARE
  alert_id INTEGER;
BEGIN
  INSERT INTO alerts (
    type,
    severity,
    title,
    message,
    booking_id,
    user_id,
    metadata
  ) VALUES (
    p_type,
    p_severity,
    p_title,
    p_message,
    p_booking_id,
    p_user_id,
    p_metadata
  ) RETURNING id INTO alert_id;
  
  RETURN alert_id;
END;
$$ LANGUAGE plpgsql;

-- Function to get fraud statistics
CREATE OR REPLACE FUNCTION get_fraud_statistics(p_days INTEGER DEFAULT 30)
RETURNS TABLE(
  total_assessments INTEGER,
  high_risk INTEGER,
  medium_risk INTEGER,
  low_risk INTEGER,
  average_risk_score DECIMAL(5,2),
  fraud_rate DECIMAL(5,2),
  blocked_bookings INTEGER
) AS $$
DECLARE
  since_date TIMESTAMP WITH TIME ZONE;
BEGIN
  since_date := NOW() - (p_days || ' days')::INTERVAL;
  
  RETURN QUERY
  SELECT 
    COUNT(*)::INTEGER as total_assessments,
    COUNT(CASE WHEN fa.risk_level = 'HIGH' THEN 1 END)::INTEGER as high_risk,
    COUNT(CASE WHEN fa.risk_level = 'MEDIUM' THEN 1 END)::INTEGER as medium_risk,
    COUNT(CASE WHEN fa.risk_level = 'LOW' THEN 1 END)::INTEGER as low_risk,
    ROUND(AVG(fa.risk_score), 2) as average_risk_score,
    ROUND(
      (COUNT(CASE WHEN fa.risk_level = 'HIGH' THEN 1 END)::DECIMAL / 
       NULLIF(COUNT(*), 0)) * 100, 2
    ) as fraud_rate,
    COUNT(CASE WHEN fa.auto_block = true THEN 1 END)::INTEGER as blocked_bookings
  FROM fraud_assessments fa
  WHERE fa.created_at >= since_date;
END;
$$ LANGUAGE plpgsql;

-- Function to check if email is blacklisted
CREATE OR REPLACE FUNCTION is_email_blacklisted(p_email VARCHAR(255))
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM email_blacklist 
    WHERE email = LOWER(p_email)
  );
END;
$$ LANGUAGE plpgsql;

-- Function to check if IP is blacklisted
CREATE OR REPLACE FUNCTION is_ip_blacklisted(p_ip_address INET)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM ip_blacklist 
    WHERE ip_address = p_ip_address 
    AND (expires_at IS NULL OR expires_at > NOW())
  );
END;
$$ LANGUAGE plpgsql;

-- Function to get unread alerts count
CREATE OR REPLACE FUNCTION get_unread_alerts_count(p_user_id INTEGER DEFAULT NULL)
RETURNS INTEGER AS $$
BEGIN
  IF p_user_id IS NULL THEN
    -- Get total unread alerts
    RETURN (SELECT COUNT(*) FROM alerts WHERE is_read = false);
  ELSE
    -- Get unread alerts for specific user
    RETURN (SELECT COUNT(*) FROM alerts WHERE user_id = p_user_id AND is_read = false);
  END IF;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update fraud assessment timestamp
CREATE OR REPLACE FUNCTION update_fraud_assessment_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_fraud_assessment_timestamp ON fraud_assessments;
CREATE TRIGGER trigger_update_fraud_assessment_timestamp
  BEFORE UPDATE ON fraud_assessments
  FOR EACH ROW
  EXECUTE FUNCTION update_fraud_assessment_timestamp();

-- Trigger to auto-flag high risk bookings
CREATE OR REPLACE FUNCTION auto_flag_high_risk_booking()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.risk_level = 'HIGH' AND NEW.requires_review = true THEN
    UPDATE bookings 
    SET 
      is_flagged = true,
      flag_reason = 'High fraud risk detected (score: ' || NEW.risk_score || ')',
      fraud_assessment_id = NEW.id
    WHERE id = NEW.booking_id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_auto_flag_high_risk_booking ON fraud_assessments;
CREATE TRIGGER trigger_auto_flag_high_risk_booking
  AFTER INSERT ON fraud_assessments
  FOR EACH ROW
  EXECUTE FUNCTION auto_flag_high_risk_booking();

-- Function to clean up old records
CREATE OR REPLACE FUNCTION cleanup_fraud_data()
RETURNS INTEGER AS $$
DECLARE
  cleaned_count INTEGER := 0;
  temp_count INTEGER;
BEGIN
  -- Clean up old booking sessions (older than 30 days)
  DELETE FROM booking_sessions 
  WHERE created_at < NOW() - INTERVAL '30 days';
  GET DIAGNOSTICS temp_count = ROW_COUNT;
  cleaned_count := cleaned_count + temp_count;
  
  -- Clean up old payment attempts (older than 90 days)
  DELETE FROM payment_attempts 
  WHERE created_at < NOW() - INTERVAL '90 days';
  GET DIAGNOSTICS temp_count = ROW_COUNT;
  cleaned_count := cleaned_count + temp_count;
  
  -- Clean up old alerts (older than 6 months)
  DELETE FROM alerts 
  WHERE created_at < NOW() - INTERVAL '6 months';
  GET DIAGNOSTICS temp_count = ROW_COUNT;
  cleaned_count := cleaned_count + temp_count;
  
  -- Clean up expired IP blacklist entries
  DELETE FROM ip_blacklist 
  WHERE expires_at IS NOT NULL AND expires_at < NOW();
  GET DIAGNOSTICS temp_count = ROW_COUNT;
  cleaned_count := cleaned_count + temp_count;
  
  RETURN cleaned_count;
END;
$$ LANGUAGE plpgsql;

-- Insert default fraud rules
INSERT INTO fraud_rules (name, description, rule_type, conditions, actions, weight, is_active) VALUES
('High Value Rush Booking', 'Detect high value bookings with short notice', 'pattern', 
 '{"min_amount": 50000, "max_days_notice": 7}', 
 '{"add_risk_score": 30, "flag_for_review": true}', 30, true),

('Suspicious Email Domain', 'Flag bookings from suspicious email domains', 'email',
 '{"suspicious_domains": ["tempmail.com", "10minutemail.com", "guerrillamail.com"]}',
 '{"add_risk_score": 40, "create_alert": true}', 40, true),

('Multiple Booking Attempts', 'Detect multiple booking attempts from same email', 'velocity',
 '{"max_attempts": 3, "time_window_hours": 24}',
 '{"add_risk_score": 20, "flag_for_review": true}', 20, true),

('IP Velocity Check', 'Detect multiple bookings from same IP address', 'velocity',
 '{"max_bookings": 5, "time_window_hours": 1}',
 '{"add_risk_score": 35, "create_alert": true}', 35, true),

('High Cancellation Rate', 'Flag users with high booking cancellation rate', 'history',
 '{"min_bookings": 3, "cancellation_threshold": 0.6}',
 '{"add_risk_score": 30, "flag_for_review": true}', 30, true)

ON CONFLICT (name) DO UPDATE SET
  description = EXCLUDED.description,
  conditions = EXCLUDED.conditions,
  actions = EXCLUDED.actions,
  weight = EXCLUDED.weight,
  updated_at = NOW();

-- Add RLS policies
ALTER TABLE fraud_assessments ENABLE ROW LEVEL SECURITY;
ALTER TABLE alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_blacklist ENABLE ROW LEVEL SECURITY;
ALTER TABLE ip_blacklist ENABLE ROW LEVEL SECURITY;
ALTER TABLE booking_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE fraud_rules ENABLE ROW LEVEL SECURITY;

-- Policies for fraud_assessments
DROP POLICY IF EXISTS "Users can view their own fraud assessments" ON fraud_assessments;
CREATE POLICY "Users can view their own fraud assessments" ON fraud_assessments
  FOR SELECT 
  USING (
    user_id = auth.uid()::INTEGER OR 
    EXISTS (
      SELECT 1 FROM bookings b 
      WHERE b.id = booking_id AND b.user_id = auth.uid()::INTEGER
    )
  );

-- Policies for alerts
DROP POLICY IF EXISTS "Users can view relevant alerts" ON alerts;
CREATE POLICY "Users can view relevant alerts" ON alerts
  FOR ALL
  USING (
    user_id = auth.uid()::INTEGER OR 
    user_id IS NULL OR
    EXISTS (
      SELECT 1 FROM bookings b 
      WHERE b.id = booking_id AND b.user_id = auth.uid()::INTEGER
    )
  );

-- Policies for blacklists (admin only)
DROP POLICY IF EXISTS "Admin can manage blacklists" ON email_blacklist;
CREATE POLICY "Admin can manage blacklists" ON email_blacklist
  FOR ALL 
  USING (
    EXISTS (
      SELECT 1 FROM users u 
      WHERE u.id = auth.uid()::INTEGER AND u.is_admin = true
    )
  );

DROP POLICY IF EXISTS "Admin can manage IP blacklist" ON ip_blacklist;
CREATE POLICY "Admin can manage IP blacklist" ON ip_blacklist
  FOR ALL 
  USING (
    EXISTS (
      SELECT 1 FROM users u 
      WHERE u.id = auth.uid()::INTEGER AND u.is_admin = true
    )
  );

-- Policies for booking sessions
DROP POLICY IF EXISTS "Users can view their own sessions" ON booking_sessions;
CREATE POLICY "Users can view their own sessions" ON booking_sessions
  FOR SELECT 
  USING (user_id = auth.uid()::INTEGER);

-- Policies for payment attempts
DROP POLICY IF EXISTS "Users can view their own payment attempts" ON payment_attempts;
CREATE POLICY "Users can view their own payment attempts" ON payment_attempts
  FOR SELECT 
  USING (
    user_id = auth.uid()::INTEGER OR
    EXISTS (
      SELECT 1 FROM bookings b 
      WHERE b.id = booking_id AND b.user_id = auth.uid()::INTEGER
    )
  );

-- Policies for fraud rules (admin can manage, others can view active rules)
DROP POLICY IF EXISTS "Users can view active fraud rules" ON fraud_rules;
CREATE POLICY "Users can view active fraud rules" ON fraud_rules
  FOR SELECT 
  USING (is_active = true);

DROP POLICY IF EXISTS "Admin can manage fraud rules" ON fraud_rules;
CREATE POLICY "Admin can manage fraud rules" ON fraud_rules
  FOR ALL 
  USING (
    EXISTS (
      SELECT 1 FROM users u 
      WHERE u.id = auth.uid()::INTEGER AND u.is_admin = true
    )
  );

-- Create view for fraud dashboard
CREATE OR REPLACE VIEW fraud_dashboard AS
SELECT 
  DATE_TRUNC('day', fa.created_at) as date,
  COUNT(*) as total_assessments,
  COUNT(CASE WHEN fa.risk_level = 'HIGH' THEN 1 END) as high_risk,
  COUNT(CASE WHEN fa.risk_level = 'MEDIUM' THEN 1 END) as medium_risk,
  COUNT(CASE WHEN fa.risk_level = 'LOW' THEN 1 END) as low_risk,
  AVG(fa.risk_score) as avg_risk_score,
  COUNT(CASE WHEN fa.auto_block = true THEN 1 END) as auto_blocked,
  COUNT(CASE WHEN fa.requires_review = true THEN 1 END) as requires_review
FROM fraud_assessments fa
WHERE fa.created_at >= NOW() - INTERVAL '30 days'
GROUP BY DATE_TRUNC('day', fa.created_at)
ORDER BY date DESC;

-- Add feature flag for fraud detection
INSERT INTO feature_flags (name, is_enabled, description, created_at, updated_at)
VALUES (
  'fraud_detection',
  true,
  'Enable fraud detection and smart alerts system',
  NOW(),
  NOW()
) ON CONFLICT (name) DO UPDATE SET
  is_enabled = EXCLUDED.is_enabled,
  description = EXCLUDED.description,
  updated_at = NOW();

-- Add comments for documentation
COMMENT ON TABLE fraud_assessments IS 'Stores fraud risk assessments for bookings';
COMMENT ON TABLE alerts IS 'Smart alerts for fraud detection and other system events';
COMMENT ON TABLE email_blacklist IS 'Blacklisted email addresses';
COMMENT ON TABLE ip_blacklist IS 'Blacklisted IP addresses with optional expiration';
COMMENT ON TABLE booking_sessions IS 'User session tracking for fraud detection';
COMMENT ON TABLE payment_attempts IS 'Payment attempt tracking for velocity analysis';
COMMENT ON TABLE fraud_rules IS 'Configurable fraud detection rules';

COMMENT ON FUNCTION create_fraud_alert IS 'Creates a new fraud alert with specified parameters';
COMMENT ON FUNCTION get_fraud_statistics IS 'Returns fraud detection statistics for specified period';
COMMENT ON FUNCTION cleanup_fraud_data IS 'Cleans up old fraud detection data';
COMMENT ON VIEW fraud_dashboard IS 'Dashboard view for fraud detection analytics';