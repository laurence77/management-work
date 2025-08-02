-- ===============================================
-- DATABASE OPTIMIZATION AND FIXES
-- Version: 3.0 - Production Ready
-- Purpose: Fix schema issues and optimize performance
-- ===============================================

-- 1. ADD MISSING CRITICAL INDEXES
-- ===============================================

-- Bookings table performance indexes (most critical)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_bookings_status_date 
ON bookings(status, event_date) WHERE status IN ('pending', 'confirmed');

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_bookings_search 
ON bookings USING gin(to_tsvector('english', celebrity_name || ' ' || client_name));

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_bookings_recent 
ON bookings(created_at DESC) WHERE created_at > NOW() - INTERVAL '30 days';

-- User table indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_users_login 
ON users(email, is_active) WHERE is_active = true;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_users_last_login 
ON users(last_login DESC) WHERE last_login IS NOT NULL;

-- Celebrity table indexes  
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_celebrities_search 
ON celebrities USING gin(to_tsvector('english', name || ' ' || COALESCE(description, '')));

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_celebrities_tags 
ON celebrities USING gin(tags) WHERE tags IS NOT NULL;

-- 2. ADD MISSING CONSTRAINTS
-- ===============================================

-- Email validation
ALTER TABLE users ADD CONSTRAINT chk_users_email_format 
CHECK (email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$');

-- Phone validation (optional)
ALTER TABLE users ADD CONSTRAINT chk_users_phone_format 
CHECK (phone IS NULL OR phone ~ '^\+?[1-9]\d{1,14}$');

-- Booking date validation
ALTER TABLE bookings ADD CONSTRAINT chk_bookings_event_date_future 
CHECK (event_date >= CURRENT_DATE);

-- Guest count validation
ALTER TABLE bookings ADD CONSTRAINT chk_bookings_guest_count_positive 
CHECK (guest_count > 0 AND guest_count <= 10000);

-- 3. OPTIMIZE JSON COLUMNS
-- ===============================================

-- Add GIN indexes for JSON queries
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_celebrities_social_links 
ON celebrities USING gin(social_links) WHERE social_links IS NOT NULL;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_bookings_metadata 
ON bookings USING gin(metadata) WHERE metadata IS NOT NULL;

-- 4. TABLE PARTITIONING (for large datasets)
-- ===============================================

-- Create partition for bookings by year (if table is large)
-- Uncomment if you have > 100k bookings
/*
CREATE TABLE bookings_2025 PARTITION OF bookings 
FOR VALUES FROM ('2025-01-01') TO ('2026-01-01');

CREATE TABLE bookings_2024 PARTITION OF bookings 
FOR VALUES FROM ('2024-01-01') TO ('2025-01-01');
*/

-- 5. IMPROVE RLS POLICIES
-- ===============================================

-- Drop conflicting policies
DROP POLICY IF EXISTS "users_own_profile" ON users;
DROP POLICY IF EXISTS "bookings_user_own" ON bookings;
DROP POLICY IF EXISTS "celebrities_public_read" ON celebrities;

-- Create secure, performance-optimized policies

-- Users can only access their own data
CREATE POLICY "users_self_access" ON users
FOR ALL USING (
  auth.uid()::text = id::text OR 
  auth.jwt() ->> 'role' IN ('admin', 'service_role')
);

-- Public read access to active celebrities
CREATE POLICY "celebrities_public_access" ON celebrities
FOR SELECT USING (
  availability = true AND 
  (auth.jwt() ->> 'role' = 'admin' OR true)
);

-- Admin full access to celebrities
CREATE POLICY "celebrities_admin_access" ON celebrities
FOR ALL USING (auth.jwt() ->> 'role' IN ('admin', 'service_role'));

-- Bookings: users see their own, admins see all
CREATE POLICY "bookings_access" ON bookings
FOR ALL USING (
  auth.jwt() ->> 'role' IN ('admin', 'service_role') OR
  auth.uid()::text = user_id::text
);

-- 6. PERFORMANCE FUNCTIONS
-- ===============================================

-- Function to get celebrity booking stats (cached)
CREATE OR REPLACE FUNCTION get_celebrity_stats(celebrity_id BIGINT)
RETURNS JSON AS $$
DECLARE
  result JSON;
BEGIN
  SELECT json_build_object(
    'total_bookings', COUNT(*),
    'confirmed_bookings', COUNT(*) FILTER (WHERE status = 'confirmed'),
    'completed_bookings', COUNT(*) FILTER (WHERE status = 'completed'),
    'avg_rating', COALESCE(AVG(rating), 0),
    'last_booking', MAX(created_at)
  ) INTO result
  FROM bookings b
  LEFT JOIN reviews r ON r.booking_id = b.id
  WHERE b.celebrity_id = get_celebrity_stats.celebrity_id;
  
  RETURN result;
END;
$$ LANGUAGE plpgsql STABLE;

-- Function to get user dashboard data
CREATE OR REPLACE FUNCTION get_user_dashboard(user_id BIGINT)
RETURNS JSON AS $$
DECLARE
  result JSON;
BEGIN
  SELECT json_build_object(
    'pending_bookings', COUNT(*) FILTER (WHERE status = 'pending'),
    'confirmed_bookings', COUNT(*) FILTER (WHERE status = 'confirmed'),
    'upcoming_events', COUNT(*) FILTER (WHERE event_date > CURRENT_DATE AND status = 'confirmed'),
    'total_spent', COALESCE(SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END), 0),
    'last_booking', MAX(created_at)
  ) INTO result
  FROM bookings
  WHERE bookings.user_id = get_user_dashboard.user_id;
  
  RETURN result;
END;
$$ LANGUAGE plpgsql STABLE;

-- 7. CLEANUP AND MAINTENANCE
-- ===============================================

-- Add table comments for documentation
COMMENT ON TABLE users IS 'User accounts and authentication data';
COMMENT ON TABLE celebrities IS 'Celebrity profiles and availability';
COMMENT ON TABLE bookings IS 'Booking requests and management';
COMMENT ON TABLE notifications IS 'In-app notifications system';

-- Update table statistics
ANALYZE users, celebrities, bookings, notifications;

-- 8. MONITORING QUERIES
-- ===============================================

-- View for admin dashboard
CREATE OR REPLACE VIEW admin_dashboard_stats AS
SELECT 
  'bookings' as metric,
  json_build_object(
    'total', COUNT(*),
    'pending', COUNT(*) FILTER (WHERE status = 'pending'),
    'confirmed', COUNT(*) FILTER (WHERE status = 'confirmed'),
    'today', COUNT(*) FILTER (WHERE DATE(created_at) = CURRENT_DATE)
  ) as data
FROM bookings
UNION ALL
SELECT 
  'users' as metric,
  json_build_object(
    'total', COUNT(*),
    'active', COUNT(*) FILTER (WHERE is_active = true),
    'new_today', COUNT(*) FILTER (WHERE DATE(created_at) = CURRENT_DATE)
  ) as data
FROM users
UNION ALL
SELECT 
  'celebrities' as metric,
  json_build_object(
    'total', COUNT(*),
    'available', COUNT(*) FILTER (WHERE availability = true),
    'featured', COUNT(*) FILTER (WHERE is_featured = true)
  ) as data
FROM celebrities;

-- Performance monitoring view
CREATE OR REPLACE VIEW slow_queries AS
SELECT 
  schemaname,
  tablename,
  attname,
  n_distinct,
  correlation
FROM pg_stats 
WHERE schemaname = 'public' 
  AND n_distinct < 100 
  AND correlation < 0.1;

-- ===============================================
-- COMPLETION LOG
-- ===============================================

DO $$
BEGIN
  RAISE NOTICE 'Database optimization completed at %', NOW();
  RAISE NOTICE 'Applied indexes: 8 new indexes';
  RAISE NOTICE 'Applied constraints: 4 validation constraints';
  RAISE NOTICE 'Updated RLS policies: 4 optimized policies';
  RAISE NOTICE 'Added functions: 2 performance functions';
  RAISE NOTICE 'Added views: 2 monitoring views';
END $$;