-- Production Row Level Security (RLS) Policies
-- This migration sets up comprehensive RLS policies for production security

-- Enable RLS on all critical tables
ALTER TABLE IF EXISTS users ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS celebrities ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS site_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS chat_rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS events ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS analytics_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS user_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS n8n_workflows ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS n8n_executions ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist (for clean re-deployment)
DROP POLICY IF EXISTS "users_admin_access" ON users;
DROP POLICY IF EXISTS "users_own_profile" ON users;
DROP POLICY IF EXISTS "celebrities_public_read" ON celebrities;
DROP POLICY IF EXISTS "celebrities_admin_write" ON celebrities;
DROP POLICY IF EXISTS "bookings_admin_access" ON bookings;
DROP POLICY IF EXISTS "bookings_user_own" ON bookings;
DROP POLICY IF EXISTS "payments_admin_access" ON payments;
DROP POLICY IF EXISTS "payments_user_own" ON payments;
DROP POLICY IF EXISTS "site_settings_admin_only" ON site_settings;
DROP POLICY IF EXISTS "reviews_public_read" ON reviews;
DROP POLICY IF EXISTS "reviews_user_write" ON reviews;
DROP POLICY IF EXISTS "notifications_user_own" ON notifications;
DROP POLICY IF EXISTS "chat_admin_access" ON chat_messages;
DROP POLICY IF EXISTS "chat_participants_only" ON chat_messages;
DROP POLICY IF EXISTS "events_public_read" ON events;
DROP POLICY IF EXISTS "events_admin_write" ON events;
DROP POLICY IF EXISTS "analytics_admin_only" ON analytics_events;
DROP POLICY IF EXISTS "sessions_user_own" ON user_sessions;
DROP POLICY IF EXISTS "audit_admin_only" ON audit_logs;

-- =============================================================================
-- USER POLICIES
-- =============================================================================

-- Admin has full access to all users
CREATE POLICY "users_admin_access" ON users
    FOR ALL USING (
        auth.jwt() ->> 'role' = 'admin' OR 
        auth.jwt() ->> 'role' = 'service_role'
    );

-- Users can read and update their own profile
CREATE POLICY "users_own_profile" ON users
    FOR ALL USING (auth.uid() = id);

-- Users can only read basic info of other users (for public profiles)
CREATE POLICY "users_public_read" ON users
    FOR SELECT USING (
        CASE 
            WHEN auth.jwt() ->> 'role' = 'admin' THEN true
            WHEN auth.uid() = id THEN true
            ELSE is_public = true
        END
    );

-- =============================================================================
-- CELEBRITY POLICIES
-- =============================================================================

-- Public read access for active celebrities
CREATE POLICY "celebrities_public_read" ON celebrities
    FOR SELECT USING (
        is_active = true AND is_approved = true
    );

-- Admin full access
CREATE POLICY "celebrities_admin_write" ON celebrities
    FOR ALL USING (
        auth.jwt() ->> 'role' = 'admin'
    );

-- Celebrity owners can update their own profiles
CREATE POLICY "celebrities_owner_update" ON celebrities
    FOR UPDATE USING (
        auth.uid() = user_id
    );

-- =============================================================================
-- BOOKING POLICIES
-- =============================================================================

-- Admin has full access to all bookings
CREATE POLICY "bookings_admin_access" ON bookings
    FOR ALL USING (
        auth.jwt() ->> 'role' = 'admin'
    );

-- Users can view and manage their own bookings
CREATE POLICY "bookings_user_own" ON bookings
    FOR ALL USING (
        auth.uid() = user_id
    );

-- Celebrity owners can view bookings for their profiles
CREATE POLICY "bookings_celebrity_owner" ON bookings
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM celebrities 
            WHERE celebrities.id = bookings.celebrity_id 
            AND celebrities.user_id = auth.uid()
        )
    );

-- Service role access for automation
CREATE POLICY "bookings_service_access" ON bookings
    FOR ALL USING (
        auth.jwt() ->> 'role' = 'service_role'
    );

-- =============================================================================
-- PAYMENT POLICIES
-- =============================================================================

-- Admin full access to payments
CREATE POLICY "payments_admin_access" ON payments
    FOR ALL USING (
        auth.jwt() ->> 'role' = 'admin'
    );

-- Users can view their own payments
CREATE POLICY "payments_user_own" ON payments
    FOR SELECT USING (
        auth.uid() = user_id
    );

-- Service role for payment processing
CREATE POLICY "payments_service_access" ON payments
    FOR ALL USING (
        auth.jwt() ->> 'role' = 'service_role'
    );

-- =============================================================================
-- SITE SETTINGS POLICIES
-- =============================================================================

-- Admin-only access to site settings
CREATE POLICY "site_settings_admin_only" ON site_settings
    FOR ALL USING (
        auth.jwt() ->> 'role' = 'admin'
    );

-- Public read for certain settings (like contact info)
CREATE POLICY "site_settings_public_read" ON site_settings
    FOR SELECT USING (
        is_public = true
    );

-- =============================================================================
-- REVIEW POLICIES
-- =============================================================================

-- Public can read approved reviews
CREATE POLICY "reviews_public_read" ON reviews
    FOR SELECT USING (
        is_approved = true
    );

-- Users can write reviews for completed bookings
CREATE POLICY "reviews_user_write" ON reviews
    FOR INSERT WITH CHECK (
        auth.uid() = user_id AND
        EXISTS (
            SELECT 1 FROM bookings 
            WHERE bookings.id = reviews.booking_id 
            AND bookings.user_id = auth.uid() 
            AND bookings.status = 'completed'
        )
    );

-- Users can update their own reviews
CREATE POLICY "reviews_user_update" ON reviews
    FOR UPDATE USING (
        auth.uid() = user_id
    );

-- Admin can manage all reviews
CREATE POLICY "reviews_admin_access" ON reviews
    FOR ALL USING (
        auth.jwt() ->> 'role' = 'admin'
    );

-- =============================================================================
-- NOTIFICATION POLICIES
-- =============================================================================

-- Users can access their own notifications
CREATE POLICY "notifications_user_own" ON notifications
    FOR ALL USING (
        auth.uid() = user_id
    );

-- Admin can access all notifications
CREATE POLICY "notifications_admin_access" ON notifications
    FOR ALL USING (
        auth.jwt() ->> 'role' = 'admin'
    );

-- Service role for sending notifications
CREATE POLICY "notifications_service_access" ON notifications
    FOR INSERT WITH CHECK (
        auth.jwt() ->> 'role' = 'service_role'
    );

-- =============================================================================
-- CHAT POLICIES
-- =============================================================================

-- Admin can access all chat messages
CREATE POLICY "chat_admin_access" ON chat_messages
    FOR ALL USING (
        auth.jwt() ->> 'role' = 'admin'
    );

-- Users can access messages in rooms they participate in
CREATE POLICY "chat_participants_only" ON chat_messages
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM chat_rooms 
            WHERE chat_rooms.id = chat_messages.room_id 
            AND (
                chat_rooms.user_id = auth.uid() OR 
                chat_rooms.celebrity_id IN (
                    SELECT id FROM celebrities WHERE user_id = auth.uid()
                )
            )
        )
    );

-- Chat room access policies
CREATE POLICY "chat_rooms_participants" ON chat_rooms
    FOR ALL USING (
        auth.uid() = user_id OR 
        celebrity_id IN (
            SELECT id FROM celebrities WHERE user_id = auth.uid()
        ) OR
        auth.jwt() ->> 'role' = 'admin'
    );

-- =============================================================================
-- EVENT POLICIES
-- =============================================================================

-- Public can read published events
CREATE POLICY "events_public_read" ON events
    FOR SELECT USING (
        is_published = true
    );

-- Admin can manage all events
CREATE POLICY "events_admin_write" ON events
    FOR ALL USING (
        auth.jwt() ->> 'role' = 'admin'
    );

-- Celebrity owners can manage their events
CREATE POLICY "events_celebrity_owner" ON events
    FOR ALL USING (
        celebrity_id IN (
            SELECT id FROM celebrities WHERE user_id = auth.uid()
        )
    );

-- =============================================================================
-- ANALYTICS POLICIES
-- =============================================================================

-- Admin-only access to analytics
CREATE POLICY "analytics_admin_only" ON analytics_events
    FOR ALL USING (
        auth.jwt() ->> 'role' = 'admin'
    );

-- Service role for logging analytics
CREATE POLICY "analytics_service_insert" ON analytics_events
    FOR INSERT WITH CHECK (
        auth.jwt() ->> 'role' = 'service_role'
    );

-- =============================================================================
-- SESSION POLICIES
-- =============================================================================

-- Users can access their own sessions
CREATE POLICY "sessions_user_own" ON user_sessions
    FOR ALL USING (
        auth.uid() = user_id
    );

-- Admin can view all sessions
CREATE POLICY "sessions_admin_access" ON user_sessions
    FOR SELECT USING (
        auth.jwt() ->> 'role' = 'admin'
    );

-- =============================================================================
-- AUDIT LOG POLICIES
-- =============================================================================

-- Admin-only access to audit logs
CREATE POLICY "audit_admin_only" ON audit_logs
    FOR ALL USING (
        auth.jwt() ->> 'role' = 'admin'
    );

-- Service role can insert audit logs
CREATE POLICY "audit_service_insert" ON audit_logs
    FOR INSERT WITH CHECK (
        auth.jwt() ->> 'role' = 'service_role'
    );

-- =============================================================================
-- N8N AUTOMATION POLICIES
-- =============================================================================

-- Admin-only access to n8n workflows
CREATE POLICY "n8n_workflows_admin_only" ON n8n_workflows
    FOR ALL USING (
        auth.jwt() ->> 'role' = 'admin'
    );

-- Admin-only access to n8n executions
CREATE POLICY "n8n_executions_admin_only" ON n8n_executions
    FOR ALL USING (
        auth.jwt() ->> 'role' = 'admin'
    );

-- =============================================================================
-- SECURITY FUNCTIONS
-- =============================================================================

-- Function to check if user is admin
CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN AS $$
BEGIN
    RETURN auth.jwt() ->> 'role' = 'admin';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check if user owns a celebrity profile
CREATE OR REPLACE FUNCTION owns_celebrity(celebrity_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM celebrities 
        WHERE id = celebrity_id AND user_id = auth.uid()
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check if user has access to booking
CREATE OR REPLACE FUNCTION has_booking_access(booking_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM bookings b
        LEFT JOIN celebrities c ON b.celebrity_id = c.id
        WHERE b.id = booking_id 
        AND (
            b.user_id = auth.uid() OR 
            c.user_id = auth.uid() OR
            auth.jwt() ->> 'role' = 'admin'
        )
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================================================
-- ADDITIONAL SECURITY MEASURES
-- =============================================================================

-- Revoke default permissions
REVOKE ALL ON ALL TABLES IN SCHEMA public FROM anon;
REVOKE ALL ON ALL TABLES IN SCHEMA public FROM authenticated;

-- Grant specific permissions
GRANT SELECT ON celebrities TO anon; -- Public celebrity listings
GRANT SELECT ON events TO anon; -- Public events
GRANT SELECT ON reviews TO anon; -- Public reviews

-- Grant authenticated user permissions
GRANT SELECT, INSERT, UPDATE ON users TO authenticated;
GRANT SELECT ON celebrities TO authenticated;
GRANT SELECT, INSERT, UPDATE ON bookings TO authenticated;
GRANT SELECT ON payments TO authenticated;
GRANT SELECT, INSERT, UPDATE ON reviews TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON notifications TO authenticated;
GRANT SELECT, INSERT, UPDATE ON chat_messages TO authenticated;
GRANT SELECT, INSERT, UPDATE ON chat_rooms TO authenticated;
GRANT SELECT ON events TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON user_sessions TO authenticated;

-- =============================================================================
-- VALIDATION AND MONITORING
-- =============================================================================

-- Function to log RLS policy violations
CREATE OR REPLACE FUNCTION log_rls_violation()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO audit_logs (
        table_name,
        operation,
        user_id,
        details,
        created_at
    ) VALUES (
        TG_TABLE_NAME,
        TG_OP,
        auth.uid(),
        jsonb_build_object(
            'violation_type', 'RLS_POLICY_BLOCK',
            'attempted_operation', TG_OP,
            'user_role', auth.jwt() ->> 'role'
        ),
        NOW()
    );
    RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create indexes for RLS performance
CREATE INDEX IF NOT EXISTS idx_bookings_user_id ON bookings(user_id);
CREATE INDEX IF NOT EXISTS idx_celebrities_user_id ON celebrities(user_id);
CREATE INDEX IF NOT EXISTS idx_payments_user_id ON payments(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_room_id ON chat_messages(room_id);
CREATE INDEX IF NOT EXISTS idx_chat_rooms_user_id ON chat_rooms(user_id);
CREATE INDEX IF NOT EXISTS idx_reviews_user_id ON reviews(user_id);
CREATE INDEX IF NOT EXISTS idx_events_celebrity_id ON events(celebrity_id);

-- Performance optimization for RLS queries
CREATE INDEX IF NOT EXISTS idx_auth_uid ON users(id) WHERE id = auth.uid();

COMMENT ON POLICY "users_admin_access" ON users IS 'Admin and service role full access to all users';
COMMENT ON POLICY "users_own_profile" ON users IS 'Users can manage their own profile';
COMMENT ON POLICY "bookings_admin_access" ON bookings IS 'Admin full access to all bookings';
COMMENT ON POLICY "bookings_user_own" ON bookings IS 'Users can access their own bookings';
COMMENT ON POLICY "celebrities_public_read" ON celebrities IS 'Public read access to active celebrities';
COMMENT ON POLICY "payments_admin_access" ON payments IS 'Admin full access to payment records';
COMMENT ON POLICY "site_settings_admin_only" ON site_settings IS 'Admin-only access to site configuration';
COMMENT ON POLICY "n8n_workflows_admin_only" ON n8n_workflows IS 'Admin-only access to automation workflows';

-- Verify RLS is enabled on all critical tables
DO $$
DECLARE
    table_record RECORD;
    rls_count INTEGER := 0;
BEGIN
    FOR table_record IN 
        SELECT schemaname, tablename, rowsecurity 
        FROM pg_tables 
        WHERE schemaname = 'public' 
        AND tablename IN ('users', 'celebrities', 'bookings', 'payments', 'site_settings')
    LOOP
        IF table_record.rowsecurity THEN
            rls_count := rls_count + 1;
            RAISE NOTICE 'RLS enabled on %.%', table_record.schemaname, table_record.tablename;
        ELSE
            RAISE WARNING 'RLS NOT enabled on %.%', table_record.schemaname, table_record.tablename;
        END IF;
    END LOOP;
    
    RAISE NOTICE 'Total tables with RLS enabled: %', rls_count;
END $$;