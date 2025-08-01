-- ===============================================
-- OPTIMIZED MASTER SCHEMA - Celebrity Booking Platform
-- Version: 2.0 - Consolidated & Optimized
-- Created: 2025-07-30
-- Purpose: Single optimized schema with proper indexing
-- ===============================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- ===============================================
-- CORE TABLES (Simplified & Optimized)
-- ===============================================

-- 1. USERS TABLE (Simplified Authentication)
CREATE TABLE IF NOT EXISTS users (
  id BIGSERIAL PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255),
  first_name VARCHAR(100) NOT NULL,
  last_name VARCHAR(100) NOT NULL,
  phone VARCHAR(20),
  role VARCHAR(20) DEFAULT 'customer' CHECK (role IN ('customer', 'admin', 'moderator')),
  is_active BOOLEAN DEFAULT TRUE,
  email_verified BOOLEAN DEFAULT FALSE,
  profile_image TEXT,
  last_login TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. CELEBRITIES TABLE (Core Business Entity)
CREATE TABLE IF NOT EXISTS celebrities (
  id BIGSERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  slug VARCHAR(255) UNIQUE,
  description TEXT,
  image TEXT,
  category VARCHAR(50) NOT NULL CHECK (category IN ('actors', 'musicians', 'athletes', 'influencers', 'authors', 'other')),
  price VARCHAR(100), -- Flexible pricing display
  rating DECIMAL(3,2) DEFAULT 0 CHECK (rating >= 0 AND rating <= 5),
  availability BOOLEAN DEFAULT TRUE,
  is_featured BOOLEAN DEFAULT FALSE,
  total_bookings INTEGER DEFAULT 0,
  social_links JSONB DEFAULT '{}',
  tags TEXT[] DEFAULT '{}',
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. BOOKINGS TABLE (Core Business Logic)
CREATE TABLE IF NOT EXISTS bookings (
  id BIGSERIAL PRIMARY KEY,
  booking_number VARCHAR(50) UNIQUE NOT NULL DEFAULT ('BK' || EXTRACT(EPOCH FROM NOW())::BIGINT),
  user_id BIGINT REFERENCES users(id) ON DELETE SET NULL,
  celebrity_id BIGINT REFERENCES celebrities(id) ON DELETE SET NULL,
  celebrity_name VARCHAR(255) NOT NULL, -- Always store name for history
  client_name VARCHAR(255) NOT NULL,
  client_email VARCHAR(255) NOT NULL,
  client_phone VARCHAR(20),
  event_date DATE NOT NULL,
  event_type VARCHAR(100),
  event_location TEXT,
  guest_count INTEGER DEFAULT 1,
  budget VARCHAR(100),
  special_requests TEXT,
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'cancelled', 'completed', 'rejected')),
  priority INTEGER DEFAULT 5,
  notes TEXT,
  confirmed_at TIMESTAMP WITH TIME ZONE,
  confirmed_by BIGINT REFERENCES users(id),
  cancelled_at TIMESTAMP WITH TIME ZONE,
  cancelled_by BIGINT REFERENCES users(id),
  cancellation_reason TEXT,
  completed_at TIMESTAMP WITH TIME ZONE,
  completed_by BIGINT REFERENCES users(id),
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. EMAIL TEMPLATES TABLE
CREATE TABLE IF NOT EXISTS email_templates (
  id BIGSERIAL PRIMARY KEY,
  template_key VARCHAR(100) UNIQUE NOT NULL,
  name VARCHAR(255) NOT NULL,
  subject VARCHAR(500) NOT NULL,
  html_content TEXT NOT NULL,
  text_content TEXT,
  variables JSONB DEFAULT '[]', -- List of available variables
  is_active BOOLEAN DEFAULT TRUE,
  category VARCHAR(50) DEFAULT 'general',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 5. NOTIFICATIONS TABLE (Real-time notifications)
CREATE TABLE IF NOT EXISTS notifications (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT REFERENCES users(id) ON DELETE CASCADE,
  type VARCHAR(50) NOT NULL,
  title VARCHAR(255) NOT NULL,
  message TEXT NOT NULL,
  data JSONB DEFAULT '{}',
  is_read BOOLEAN DEFAULT FALSE,
  is_sent BOOLEAN DEFAULT FALSE,
  priority INTEGER DEFAULT 5,
  expires_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 6. AUDIT LOG TABLE (Security & Compliance)
CREATE TABLE IF NOT EXISTS audit_logs (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT REFERENCES users(id) ON DELETE SET NULL,
  action VARCHAR(100) NOT NULL,
  table_name VARCHAR(100),
  record_id BIGINT,
  old_values JSONB,
  new_values JSONB,
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 7. SITE SETTINGS TABLE
CREATE TABLE IF NOT EXISTS site_settings (
  id BIGSERIAL PRIMARY KEY,
  key VARCHAR(100) UNIQUE NOT NULL,
  value TEXT,
  description TEXT,
  type VARCHAR(20) DEFAULT 'string' CHECK (type IN ('string', 'number', 'boolean', 'json')),
  is_public BOOLEAN DEFAULT FALSE,
  category VARCHAR(50) DEFAULT 'general',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 8. FILE UPLOADS TABLE
CREATE TABLE IF NOT EXISTS file_uploads (
  id BIGSERIAL PRIMARY KEY,
  filename VARCHAR(255) NOT NULL,
  original_name VARCHAR(255) NOT NULL,
  file_path TEXT NOT NULL,
  file_size BIGINT NOT NULL,
  mime_type VARCHAR(100) NOT NULL,
  uploaded_by BIGINT REFERENCES users(id) ON DELETE SET NULL,
  entity_type VARCHAR(50), -- 'celebrity', 'user', 'booking', etc.
  entity_id BIGINT,
  is_public BOOLEAN DEFAULT FALSE,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ===============================================
-- INDEXES FOR PERFORMANCE
-- ===============================================

-- Users table indexes
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_users_active ON users(is_active);
CREATE INDEX IF NOT EXISTS idx_users_created_at ON users(created_at DESC);

-- Celebrities table indexes  
CREATE INDEX IF NOT EXISTS idx_celebrities_category ON celebrities(category);
CREATE INDEX IF NOT EXISTS idx_celebrities_availability ON celebrities(availability);
CREATE INDEX IF NOT EXISTS idx_celebrities_featured ON celebrities(is_featured);
CREATE INDEX IF NOT EXISTS idx_celebrities_rating ON celebrities(rating DESC);
CREATE INDEX IF NOT EXISTS idx_celebrities_name ON celebrities(name);
CREATE INDEX IF NOT EXISTS idx_celebrities_slug ON celebrities(slug);
CREATE INDEX IF NOT EXISTS idx_celebrities_created_at ON celebrities(created_at DESC);

-- Bookings table indexes (Critical for performance)
CREATE INDEX IF NOT EXISTS idx_bookings_status ON bookings(status);
CREATE INDEX IF NOT EXISTS idx_bookings_user_id ON bookings(user_id);
CREATE INDEX IF NOT EXISTS idx_bookings_celebrity_id ON bookings(celebrity_id);
CREATE INDEX IF NOT EXISTS idx_bookings_event_date ON bookings(event_date);
CREATE INDEX IF NOT EXISTS idx_bookings_created_at ON bookings(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_bookings_client_email ON bookings(client_email);
CREATE INDEX IF NOT EXISTS idx_bookings_booking_number ON bookings(booking_number);
CREATE INDEX IF NOT EXISTS idx_bookings_priority ON bookings(priority DESC);

-- Composite indexes for common queries
CREATE INDEX IF NOT EXISTS idx_bookings_status_date ON bookings(status, event_date);
CREATE INDEX IF NOT EXISTS idx_bookings_celebrity_status ON bookings(celebrity_id, status);
CREATE INDEX IF NOT EXISTS idx_bookings_user_status ON bookings(user_id, status);

-- Email templates indexes
CREATE INDEX IF NOT EXISTS idx_email_templates_key ON email_templates(template_key);
CREATE INDEX IF NOT EXISTS idx_email_templates_active ON email_templates(is_active);
CREATE INDEX IF NOT EXISTS idx_email_templates_category ON email_templates(category);

-- Notifications indexes
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_type ON notifications(type);
CREATE INDEX IF NOT EXISTS idx_notifications_read ON notifications(is_read);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_user_unread ON notifications(user_id, is_read) WHERE is_read = FALSE;

-- Audit logs indexes
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_audit_logs_table_name ON audit_logs(table_name);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_record ON audit_logs(table_name, record_id);

-- Site settings indexes
CREATE INDEX IF NOT EXISTS idx_site_settings_key ON site_settings(key);
CREATE INDEX IF NOT EXISTS idx_site_settings_public ON site_settings(is_public);
CREATE INDEX IF NOT EXISTS idx_site_settings_category ON site_settings(category);

-- File uploads indexes
CREATE INDEX IF NOT EXISTS idx_file_uploads_entity ON file_uploads(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_file_uploads_uploaded_by ON file_uploads(uploaded_by);
CREATE INDEX IF NOT EXISTS idx_file_uploads_public ON file_uploads(is_public);
CREATE INDEX IF NOT EXISTS idx_file_uploads_created_at ON file_uploads(created_at DESC);

-- ===============================================
-- TRIGGERS FOR UPDATED_AT
-- ===============================================

-- Apply updated_at triggers to all tables
CREATE OR REPLACE TRIGGER tr_users_updated_at
    BEFORE UPDATE ON users
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE OR REPLACE TRIGGER tr_celebrities_updated_at
    BEFORE UPDATE ON celebrities
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE OR REPLACE TRIGGER tr_bookings_updated_at
    BEFORE UPDATE ON bookings
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE OR REPLACE TRIGGER tr_email_templates_updated_at
    BEFORE UPDATE ON email_templates
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE OR REPLACE TRIGGER tr_site_settings_updated_at
    BEFORE UPDATE ON site_settings
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ===============================================
-- INITIAL DATA SEEDING
-- ===============================================

-- Insert default site settings
INSERT INTO site_settings (key, value, description, is_public, category) VALUES
  ('site_name', 'EliteConnect Platform', 'Name of the celebrity booking platform', TRUE, 'general'),
  ('site_description', 'Premium Celebrity Booking Platform', 'Platform description', TRUE, 'general'),
  ('contact_email', 'info@eliteconnect.com', 'Main contact email', TRUE, 'contact'),
  ('contact_phone', '+1 (555) 123-4567', 'Main contact phone', TRUE, 'contact'),
  ('contact_address', '123 Hollywood Blvd, Los Angeles, CA 90028', 'Business address', TRUE, 'contact'),
  ('booking_auto_confirm', 'false', 'Auto-confirm bookings', FALSE, 'booking'),
  ('email_notifications', 'true', 'Enable email notifications', FALSE, 'email'),
  ('maintenance_mode', 'false', 'Site maintenance mode', FALSE, 'system')
ON CONFLICT (key) DO NOTHING;

-- Insert default email templates
INSERT INTO email_templates (template_key, name, subject, html_content, text_content, variables, category) VALUES
  ('booking_confirmation', 'Booking Confirmation', 'Booking Confirmation - {{celebrity_name}}', 
   '<h2>Booking Confirmation</h2><p>Dear {{client_name}},</p><p>Your booking for {{celebrity_name}} on {{event_date}} has been received.</p>', 
   'Dear {{client_name}}, Your booking for {{celebrity_name}} on {{event_date}} has been received.', 
   '["celebrity_name", "client_name", "event_date", "booking_number"]', 'booking'),
  
  ('booking_approved', 'Booking Approved', '✅ Booking Approved - {{celebrity_name}}', 
   '<h2 style="color: green;">Booking Approved!</h2><p>Dear {{client_name}},</p><p>Your booking for {{celebrity_name}} has been approved.</p>', 
   'Dear {{client_name}}, Your booking for {{celebrity_name}} has been approved.', 
   '["celebrity_name", "client_name", "event_date"]', 'booking'),
   
  ('booking_cancelled', 'Booking Cancelled', 'Booking Cancellation - {{celebrity_name}}', 
   '<h2 style="color: red;">Booking Cancelled</h2><p>Dear {{client_name}},</p><p>Your booking for {{celebrity_name}} has been cancelled. Reason: {{cancellation_reason}}</p>', 
   'Dear {{client_name}}, Your booking for {{celebrity_name}} has been cancelled. Reason: {{cancellation_reason}}', 
   '["celebrity_name", "client_name", "cancellation_reason"]', 'booking')
ON CONFLICT (template_key) DO NOTHING;

-- ===============================================
-- SCHEMA VALIDATION FUNCTIONS
-- ===============================================

-- Function to validate email format
CREATE OR REPLACE FUNCTION is_valid_email(email TEXT)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$';
END;
$$ LANGUAGE plpgsql;

-- Function to validate phone format
CREATE OR REPLACE FUNCTION is_valid_phone(phone TEXT)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN phone ~* '^[\+]?[1-9][\d]{0,15}$';
END;
$$ LANGUAGE plpgsql;

-- ===============================================
-- PERFORMANCE STATISTICS
-- ===============================================

-- View for booking statistics
CREATE OR REPLACE VIEW booking_stats AS
SELECT 
  COUNT(*) as total_bookings,
  COUNT(*) FILTER (WHERE status = 'pending') as pending_bookings,
  COUNT(*) FILTER (WHERE status = 'confirmed') as confirmed_bookings,
  COUNT(*) FILTER (WHERE status = 'completed') as completed_bookings,
  COUNT(*) FILTER (WHERE status = 'cancelled') as cancelled_bookings,
  AVG(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) * 100 as completion_rate
FROM bookings;

-- View for celebrity performance
CREATE OR REPLACE VIEW celebrity_performance AS
SELECT 
  c.id,
  c.name,
  c.category,
  COUNT(b.id) as total_bookings,
  COUNT(b.id) FILTER (WHERE b.status = 'completed') as completed_bookings,
  AVG(c.rating) as avg_rating,
  c.is_featured
FROM celebrities c
LEFT JOIN bookings b ON c.id = b.celebrity_id
GROUP BY c.id, c.name, c.category, c.rating, c.is_featured;

-- ===============================================
-- COMPLETION STATUS
-- ===============================================

-- Add completion comment
COMMENT ON SCHEMA public IS 'Celebrity Booking Platform - Optimized Master Schema v2.0 - Complete with indexes and validation';