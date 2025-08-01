-- COMBINED ESSENTIAL MIGRATION FOR CELEBRITY BOOKING PLATFORM
-- This includes all core features needed to run the application

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create enum for user roles
DO $$ BEGIN
    CREATE TYPE user_role AS ENUM ('admin', 'moderator', 'user', 'guest');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- 1. CORE TABLES

-- Create celebrities table
CREATE TABLE IF NOT EXISTS celebrities (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  category VARCHAR(100) NOT NULL,
  price DECIMAL(10,2) NOT NULL DEFAULT 0,
  image TEXT,
  description TEXT,
  availability BOOLEAN DEFAULT true,
  rating DECIMAL(3,2) DEFAULT 0 CHECK (rating >= 0 AND rating <= 5),
  bookings INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create app_users table (works with Supabase Auth)
CREATE TABLE IF NOT EXISTS app_users (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  auth_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  email VARCHAR(255) UNIQUE NOT NULL,
  role user_role DEFAULT 'user',
  is_active BOOLEAN DEFAULT true,
  is_verified BOOLEAN DEFAULT false,
  is_admin BOOLEAN DEFAULT false,
  
  -- Profile information
  first_name VARCHAR(100),
  last_name VARCHAR(100),
  avatar_url TEXT,
  phone VARCHAR(20),
  
  -- Security
  last_login TIMESTAMP WITH TIME ZONE,
  login_attempts INTEGER DEFAULT 0,
  locked_until TIMESTAMP WITH TIME ZONE,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create bookings table
CREATE TABLE IF NOT EXISTS bookings (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES app_users(id) ON DELETE CASCADE,
  celebrity_id UUID REFERENCES celebrities(id) ON DELETE CASCADE,
  celebrity_name VARCHAR(255),
  client_name VARCHAR(255),
  client_email VARCHAR(255),
  client_phone VARCHAR(50),
  event_type VARCHAR(100),
  event_date TIMESTAMP WITH TIME ZONE NOT NULL,
  venue TEXT,
  duration_hours INTEGER DEFAULT 1,
  budget DECIMAL(10,2),
  total_price DECIMAL(10,2),
  status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'cancelled', 'completed', 'blocked')),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. AUTHENTICATION & SECURITY

-- Create permissions table
CREATE TABLE IF NOT EXISTS permissions (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  name VARCHAR(100) UNIQUE NOT NULL,
  description TEXT,
  resource VARCHAR(100) NOT NULL,
  action VARCHAR(50) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create role_permissions junction table
CREATE TABLE IF NOT EXISTS role_permissions (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  role user_role NOT NULL,
  permission_id UUID REFERENCES permissions(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(role, permission_id)
);

-- Create refresh_tokens table
CREATE TABLE IF NOT EXISTS refresh_tokens (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id INTEGER REFERENCES app_users(id) ON DELETE CASCADE,
  token_hash VARCHAR(255) NOT NULL,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  is_revoked BOOLEAN DEFAULT false,
  device_info JSONB DEFAULT '{}',
  ip_address INET,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. CHAT SYSTEM

-- Create chat_rooms table
CREATE TABLE IF NOT EXISTS chat_rooms (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  type VARCHAR(50) DEFAULT 'general' CHECK (type IN ('general', 'support', 'booking')),
  is_private BOOLEAN DEFAULT false,
  max_participants INTEGER DEFAULT 100,
  created_by INTEGER REFERENCES app_users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create chat_messages table
CREATE TABLE IF NOT EXISTS chat_messages (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  room_id UUID REFERENCES chat_rooms(id) ON DELETE CASCADE,
  user_id INTEGER REFERENCES app_users(id) ON DELETE CASCADE,
  message TEXT NOT NULL,
  message_type VARCHAR(50) DEFAULT 'text' CHECK (message_type IN ('text', 'image', 'file', 'system')),
  metadata JSONB DEFAULT '{}',
  is_edited BOOLEAN DEFAULT false,
  edited_at TIMESTAMP WITH TIME ZONE,
  parent_message_id UUID REFERENCES chat_messages(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. CALENDAR INTEGRATION

-- Create user_calendar_tokens table
CREATE TABLE IF NOT EXISTS user_calendar_tokens (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES app_users(id) ON DELETE CASCADE,
  access_token TEXT NOT NULL,
  refresh_token TEXT,
  token_type VARCHAR(50) DEFAULT 'Bearer',
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  scope TEXT,
  email VARCHAR(255),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id)
);

-- Add calendar fields to bookings
ALTER TABLE bookings 
ADD COLUMN IF NOT EXISTS calendar_event_id VARCHAR(255),
ADD COLUMN IF NOT EXISTS timezone VARCHAR(100) DEFAULT 'America/New_York',
ADD COLUMN IF NOT EXISTS celebrity_contact_email VARCHAR(255);

-- 5. FRAUD DETECTION

-- Create fraud_assessments table
CREATE TABLE IF NOT EXISTS fraud_assessments (
  id SERIAL PRIMARY KEY,
  booking_id INTEGER REFERENCES bookings(id) ON DELETE CASCADE,
  user_id INTEGER REFERENCES app_users(id) ON DELETE SET NULL,
  risk_score DECIMAL(5,2) NOT NULL DEFAULT 0,
  risk_level VARCHAR(10) NOT NULL CHECK (risk_level IN ('LOW', 'MEDIUM', 'HIGH')),
  risk_factors JSONB DEFAULT '[]',
  analysis_data JSONB DEFAULT '{}',
  requires_review BOOLEAN DEFAULT false,
  auto_block BOOLEAN DEFAULT false,
  review_status VARCHAR(20) DEFAULT 'pending' CHECK (review_status IN ('pending', 'approved', 'rejected', 'under_review', 'escalated')),
  reviewer_id INTEGER REFERENCES app_users(id) ON DELETE SET NULL,
  reviewer_notes TEXT,
  reviewed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create alerts table
CREATE TABLE IF NOT EXISTS alerts (
  id SERIAL PRIMARY KEY,
  type VARCHAR(50) NOT NULL,
  severity VARCHAR(10) NOT NULL CHECK (severity IN ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL')),
  title VARCHAR(255) NOT NULL,
  message TEXT NOT NULL,
  booking_id INTEGER REFERENCES bookings(id) ON DELETE CASCADE,
  user_id INTEGER REFERENCES app_users(id) ON DELETE SET NULL,
  metadata JSONB DEFAULT '{}',
  is_read BOOLEAN DEFAULT false,
  read_by INTEGER REFERENCES app_users(id) ON DELETE SET NULL,
  read_at TIMESTAMP WITH TIME ZONE,
  expires_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 6. SITE SETTINGS

-- Create site_settings table
CREATE TABLE IF NOT EXISTS site_settings (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  site_name VARCHAR(255) DEFAULT 'EliteConnect',
  tagline VARCHAR(500),
  description TEXT,
  contact_email VARCHAR(255),
  contact_phone VARCHAR(50),
  address TEXT,
  social_twitter VARCHAR(255),
  social_instagram VARCHAR(255),
  social_facebook VARCHAR(255),
  social_linkedin VARCHAR(255),
  footer_company_description TEXT,
  footer_copyright VARCHAR(500),
  footer_services_links JSONB,
  footer_support_links JSONB,
  footer_legal_links JSONB,
  newsletter_enabled BOOLEAN DEFAULT true,
  newsletter_title VARCHAR(255),
  newsletter_description TEXT,
  meta_title VARCHAR(255),
  meta_description TEXT,
  meta_keywords TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create user_settings table
CREATE TABLE IF NOT EXISTS user_settings (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES app_users(id) ON DELETE CASCADE UNIQUE,
  theme VARCHAR(20) DEFAULT 'light' CHECK (theme IN ('light', 'dark', 'auto')),
  language VARCHAR(10) DEFAULT 'en',
  timezone VARCHAR(100) DEFAULT 'America/New_York',
  email_notifications BOOLEAN DEFAULT true,
  push_notifications BOOLEAN DEFAULT true,
  marketing_emails BOOLEAN DEFAULT false,
  calendar_auto_sync BOOLEAN DEFAULT true,
  calendar_reminder_minutes INTEGER DEFAULT 60,
  calendar_timezone VARCHAR(100) DEFAULT 'America/New_York',
  calendar_color_id VARCHAR(10) DEFAULT '11',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create feature_flags table
CREATE TABLE IF NOT EXISTS feature_flags (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) UNIQUE NOT NULL,
  is_enabled BOOLEAN DEFAULT false,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 7. INDEXES FOR PERFORMANCE

-- Core indexes
CREATE INDEX IF NOT EXISTS idx_celebrities_category ON celebrities(category);
CREATE INDEX IF NOT EXISTS idx_celebrities_availability ON celebrities(availability);
CREATE INDEX IF NOT EXISTS idx_celebrities_rating ON celebrities(rating);
CREATE INDEX IF NOT EXISTS idx_bookings_user_id ON bookings(user_id);
CREATE INDEX IF NOT EXISTS idx_bookings_celebrity_id ON bookings(celebrity_id);
CREATE INDEX IF NOT EXISTS idx_bookings_status ON bookings(status);
CREATE INDEX IF NOT EXISTS idx_app_users_email ON app_users(email);
CREATE INDEX IF NOT EXISTS idx_app_users_auth_id ON app_users(auth_id);

-- Chat indexes
CREATE INDEX IF NOT EXISTS idx_chat_messages_room_id ON chat_messages(room_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_user_id ON chat_messages(user_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_created_at ON chat_messages(created_at);

-- Fraud detection indexes
CREATE INDEX IF NOT EXISTS idx_fraud_assessments_booking_id ON fraud_assessments(booking_id);
CREATE INDEX IF NOT EXISTS idx_fraud_assessments_risk_level ON fraud_assessments(risk_level);
CREATE INDEX IF NOT EXISTS idx_alerts_type ON alerts(type);
CREATE INDEX IF NOT EXISTS idx_alerts_severity ON alerts(severity);

-- 8. TRIGGERS

-- Create triggers for updated_at
CREATE TRIGGER update_celebrities_updated_at BEFORE UPDATE ON celebrities
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_app_users_updated_at BEFORE UPDATE ON app_users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_bookings_updated_at BEFORE UPDATE ON bookings
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_chat_rooms_updated_at BEFORE UPDATE ON chat_rooms
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_site_settings_updated_at BEFORE UPDATE ON site_settings
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_settings_updated_at BEFORE UPDATE ON user_settings
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 9. ESSENTIAL DATA

-- Insert default permissions
INSERT INTO permissions (name, description, resource, action) VALUES
('manage_users', 'Manage user accounts', 'users', 'write'),
('view_users', 'View user accounts', 'users', 'read'),
('manage_bookings', 'Manage all bookings', 'bookings', 'write'),
('view_bookings', 'View all bookings', 'bookings', 'read'),
('manage_celebrities', 'Manage celebrities', 'celebrities', 'write'),
('view_celebrities', 'View celebrities', 'celebrities', 'read'),
('manage_settings', 'Manage site settings', 'settings', 'write'),
('view_analytics', 'View analytics dashboard', 'analytics', 'read'),
('moderate_chat', 'Moderate chat rooms', 'chat', 'moderate'),
('review_fraud', 'Review fraud assessments', 'fraud', 'review')
ON CONFLICT (name) DO NOTHING;

-- Assign permissions to roles
INSERT INTO role_permissions (role, permission_id) 
SELECT 'admin', id FROM permissions
ON CONFLICT (role, permission_id) DO NOTHING;

INSERT INTO role_permissions (role, permission_id) 
SELECT 'moderator', id FROM permissions 
WHERE action IN ('read', 'moderate')
ON CONFLICT (role, permission_id) DO NOTHING;

INSERT INTO role_permissions (role, permission_id) 
SELECT 'user', id FROM permissions 
WHERE resource IN ('bookings', 'celebrities') AND action = 'read'
ON CONFLICT (role, permission_id) DO NOTHING;

-- Insert feature flags
INSERT INTO feature_flags (name, is_enabled, description) VALUES
('ai_assistant', true, 'Enable AI-powered booking assistant'),
('chat_system', true, 'Enable live chat functionality'),
('calendar_integration', true, 'Enable Google Calendar integration'),
('fraud_detection', true, 'Enable fraud detection system'),
('pwa_features', true, 'Enable Progressive Web App features')
ON CONFLICT (name) DO UPDATE SET
  is_enabled = EXCLUDED.is_enabled,
  description = EXCLUDED.description,
  updated_at = NOW();

-- Insert default site settings
INSERT INTO site_settings (
  site_name, tagline, description, contact_email, contact_phone, address,
  social_twitter, social_instagram, social_facebook, social_linkedin,
  footer_company_description, footer_copyright,
  footer_services_links, footer_support_links, footer_legal_links,
  newsletter_title, newsletter_description,
  meta_title, meta_description, meta_keywords
) VALUES (
  'EliteConnect',
  'Connect with Elite Celebrities',
  'The premier platform for celebrity bookings and exclusive experiences.',
  'contact@eliteconnect.com',
  '+1 (555) 123-4567',
  'Beverly Hills, CA 90210',
  'https://twitter.com/eliteconnect',
  'https://instagram.com/eliteconnect',
  'https://facebook.com/eliteconnect',
  'https://linkedin.com/company/eliteconnect',
  'EliteConnect is the premier platform connecting you with world-class celebrities for unforgettable experiences, private meetings, and exclusive events.',
  '© 2024 EliteConnect. All rights reserved.',
  '[{"name": "Private Meetings", "url": "/meetings"}, {"name": "Event Appearances", "url": "/events"}, {"name": "Celebrity Management", "url": "/management"}]',
  '[{"name": "FAQ", "url": "/faq"}, {"name": "Contact Us", "url": "/contact"}, {"name": "Privacy Policy", "url": "/privacy"}, {"name": "Terms of Service", "url": "/terms"}]',
  '[{"name": "Legal", "url": "/legal"}, {"name": "Cookies", "url": "/cookies"}, {"name": "Accessibility", "url": "/accessibility"}]',
  'Stay Connected',
  'Get exclusive updates and celebrity news',
  'EliteConnect - Premium Celebrity Booking Platform',
  'Book exclusive meetings and events with world-class celebrities. Premium experiences, verified talents, secure platform.',
  'celebrity booking, exclusive events, private meetings, luxury experiences'
) ON CONFLICT DO NOTHING;

-- Insert sample celebrities
INSERT INTO celebrities (name, category, price, description, availability, rating, bookings) VALUES 
('Leonardo DiCaprio', 'A-List Actor', 50000.00, 'Academy Award-winning actor known for Titanic, Inception, and The Revenant', true, 4.9, 15),
('Taylor Swift', 'Musician', 75000.00, 'Grammy Award-winning singer-songwriter and global superstar', true, 4.8, 8),
('Serena Williams', 'Athlete', 30000.00, 'Tennis legend and 23-time Grand Slam champion', true, 4.7, 22),
('Gordon Ramsay', 'Chef', 25000.00, 'Michelin-starred chef and television personality', true, 4.6, 35),
('Oprah Winfrey', 'Media Personality', 100000.00, 'Media mogul, talk show host, and philanthropist', true, 5.0, 5)
ON CONFLICT DO NOTHING;

-- Create default chat room
INSERT INTO chat_rooms (name, description, type, is_private) VALUES 
('General Discussion', 'General chat for all users', 'general', false)
ON CONFLICT DO NOTHING;

-- 10. FUNCTIONS FOR RBAC

-- Function to get user permissions
CREATE OR REPLACE FUNCTION get_user_permissions(user_auth_id UUID)
RETURNS TABLE(permission_name VARCHAR) AS $$
BEGIN
  RETURN QUERY
  SELECT p.name
  FROM app_users u
  JOIN role_permissions rp ON rp.role = u.role
  JOIN permissions p ON p.id = rp.permission_id
  WHERE u.auth_id = user_auth_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check if user has permission
CREATE OR REPLACE FUNCTION user_has_permission(user_auth_id UUID, permission_name VARCHAR)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM get_user_permissions(user_auth_id) gup
    WHERE gup.permission_name = user_has_permission.permission_name
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Success message
SELECT 'Essential database migration completed successfully!' as message;