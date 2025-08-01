-- Migration: Performance Optimization Indexes
-- Description: Add additional database indexes for frequently queried columns to improve performance
-- Created: 2025-07-26

-- ============================================
-- FORWARD MIGRATION
-- ============================================

-- Additional composite indexes for complex queries
CREATE INDEX IF NOT EXISTS idx_bookings_user_status_date ON bookings(user_id, status, booking_date);
CREATE INDEX IF NOT EXISTS idx_bookings_celebrity_status_date ON bookings(celebrity_id, status, booking_date);
CREATE INDEX IF NOT EXISTS idx_bookings_organization_status ON bookings(organization_id, status) WHERE status IN ('pending', 'confirmed');
CREATE INDEX IF NOT EXISTS idx_bookings_amount_range ON bookings(total_amount) WHERE total_amount > 0;
CREATE INDEX IF NOT EXISTS idx_bookings_payment_status_created ON bookings(payment_status, created_at);

-- Celebrity search and filtering optimization
CREATE INDEX IF NOT EXISTS idx_celebrities_category_available ON celebrities(category, is_available) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_celebrities_rate_range ON celebrities(base_rate) WHERE is_available = true;
CREATE INDEX IF NOT EXISTS idx_celebrities_featured_category ON celebrities(is_featured, category) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_celebrities_organization_active ON celebrities(organization_id, is_active, is_available);
CREATE INDEX IF NOT EXISTS idx_celebrities_name_search ON celebrities USING gin(to_tsvector('english', name));
CREATE INDEX IF NOT EXISTS idx_celebrities_bio_search ON celebrities USING gin(to_tsvector('english', bio)) WHERE bio IS NOT NULL;

-- User activity and authentication indexes
CREATE INDEX IF NOT EXISTS idx_app_users_email_active ON app_users(email, is_active);
CREATE INDEX IF NOT EXISTS idx_app_users_organization_role ON app_users(organization_id, role, is_active);
CREATE INDEX IF NOT EXISTS idx_app_users_last_login ON app_users(last_login DESC) WHERE last_login IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_app_users_created_month ON app_users(date_trunc('month', created_at));

-- Session management optimization
CREATE INDEX IF NOT EXISTS idx_user_sessions_user_active ON user_sessions(user_id, is_active, expires_at);
CREATE INDEX IF NOT EXISTS idx_user_sessions_token_active ON user_sessions(session_token, is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_user_sessions_cleanup ON user_sessions(expires_at) WHERE expires_at < NOW();

-- Payment and transaction optimization
CREATE INDEX IF NOT EXISTS idx_payments_user_status ON payments(user_id, status, created_at);
CREATE INDEX IF NOT EXISTS idx_payments_booking_status ON payments(booking_id, status);
CREATE INDEX IF NOT EXISTS idx_payments_provider_status ON payments(payment_provider, status, processed_at);
CREATE INDEX IF NOT EXISTS idx_payments_amount_currency ON payments(amount, currency) WHERE status = 'completed';
CREATE INDEX IF NOT EXISTS idx_payments_monthly_revenue ON payments(date_trunc('month', processed_at), status) WHERE status = 'completed';

-- Crypto transaction optimization
CREATE INDEX IF NOT EXISTS idx_crypto_transactions_user_status ON crypto_transactions(user_id, status, created_at);
CREATE INDEX IF NOT EXISTS idx_crypto_transactions_network_currency ON crypto_transactions(blockchain_network, crypto_currency, status);
CREATE INDEX IF NOT EXISTS idx_crypto_transactions_confirmations ON crypto_transactions(confirmations, required_confirmations, status);
CREATE INDEX IF NOT EXISTS idx_crypto_transactions_deadline ON crypto_transactions(payment_deadline) WHERE status = 'pending';
CREATE INDEX IF NOT EXISTS idx_crypto_transactions_verified_amount ON crypto_transactions(verified_at, usd_amount) WHERE status = 'verified';

-- Event and venue optimization
CREATE INDEX IF NOT EXISTS idx_events_date_status ON events(event_date, status) WHERE status != 'cancelled';
CREATE INDEX IF NOT EXISTS idx_events_celebrity_date ON events(celebrity_id, event_date) WHERE celebrity_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_events_organization_public ON events(organization_id, is_public, event_date);
CREATE INDEX IF NOT EXISTS idx_events_upcoming ON events(event_date) WHERE status = 'upcoming' AND event_date > NOW();

CREATE INDEX IF NOT EXISTS idx_venues_location ON venues(city, country, is_active);
CREATE INDEX IF NOT EXISTS idx_venues_capacity ON venues(capacity) WHERE capacity IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_venues_organization_active ON venues(organization_id, is_active);

-- Celebrity availability optimization
CREATE INDEX IF NOT EXISTS idx_celebrity_availability_date_available ON celebrity_availability(celebrity_id, date, is_available);
CREATE INDEX IF NOT EXISTS idx_celebrity_availability_future ON celebrity_availability(date, is_available) WHERE date >= CURRENT_DATE;

-- RBAC and permissions optimization
CREATE INDEX IF NOT EXISTS idx_user_roles_active ON user_roles(user_id, is_active, expires_at);
CREATE INDEX IF NOT EXISTS idx_role_permissions_lookup ON role_permissions(role_id, permission_id);
CREATE INDEX IF NOT EXISTS idx_roles_organization_system ON roles(organization_id, is_system_role);

-- Communication system optimization
CREATE INDEX IF NOT EXISTS idx_chat_conversations_participants ON chat_conversations USING gin(participants);
CREATE INDEX IF NOT EXISTS idx_chat_conversations_booking_status ON chat_conversations(booking_id, status) WHERE booking_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_chat_conversations_recent ON chat_conversations(last_message_at DESC, status) WHERE status = 'active';

CREATE INDEX IF NOT EXISTS idx_chat_messages_conversation_time ON chat_messages(conversation_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_chat_messages_sender_time ON chat_messages(sender_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_chat_messages_unread ON chat_messages USING gin(read_by);

-- Email notification optimization
CREATE INDEX IF NOT EXISTS idx_email_notifications_recipient_status ON email_notifications(to_email, status, created_at);
CREATE INDEX IF NOT EXISTS idx_email_notifications_type_status ON email_notifications(notification_type, status);
CREATE INDEX IF NOT EXISTS idx_email_notifications_queue ON email_notifications(status, created_at) WHERE status IN ('queued', 'failed');
CREATE INDEX IF NOT EXISTS idx_email_notifications_related ON email_notifications(related_type, related_id) WHERE related_id IS NOT NULL;

-- Analytics and metrics optimization
CREATE INDEX IF NOT EXISTS idx_daily_metrics_org_type_date ON daily_metrics(organization_id, metric_type, date DESC);
CREATE INDEX IF NOT EXISTS idx_daily_metrics_recent ON daily_metrics(date DESC, metric_type) WHERE date >= CURRENT_DATE - INTERVAL '90 days';

CREATE INDEX IF NOT EXISTS idx_celebrity_metrics_value ON celebrity_metrics(metric_type, value DESC, last_updated);
CREATE INDEX IF NOT EXISTS idx_celebrity_metrics_updated ON celebrity_metrics(last_updated DESC) WHERE last_updated >= NOW() - INTERVAL '7 days';

CREATE INDEX IF NOT EXISTS idx_revenue_forecasts_month_org ON revenue_forecasts(month, organization_id);
CREATE INDEX IF NOT EXISTS idx_revenue_forecasts_recent ON revenue_forecasts(month DESC) WHERE month >= TO_CHAR(NOW() - INTERVAL '12 months', 'YYYY-MM');

-- Fraud detection optimization
CREATE INDEX IF NOT EXISTS idx_fraud_alerts_severity_status ON fraud_alerts(severity, status, created_at);
CREATE INDEX IF NOT EXISTS idx_fraud_alerts_entity_recent ON fraud_alerts(related_entity_type, related_entity_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_fraud_alerts_open ON fraud_alerts(status, risk_score DESC) WHERE status = 'open';

CREATE INDEX IF NOT EXISTS idx_user_behavior_user_recent ON user_behavior(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_user_behavior_action_time ON user_behavior(action_type, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_user_behavior_risk ON user_behavior(risk_score DESC, created_at) WHERE risk_score > 50;
CREATE INDEX IF NOT EXISTS idx_user_behavior_ip ON user_behavior(ip_address, created_at) WHERE ip_address IS NOT NULL;

-- Calendar integration optimization
CREATE INDEX IF NOT EXISTS idx_calendar_events_user_time ON calendar_events(user_id, start_time DESC);
CREATE INDEX IF NOT EXISTS idx_calendar_events_booking_sync ON calendar_events(booking_id, sync_status);
CREATE INDEX IF NOT EXISTS idx_calendar_events_provider_sync ON calendar_events(calendar_provider, sync_status, last_synced);
CREATE INDEX IF NOT EXISTS idx_calendar_events_upcoming ON calendar_events(start_time) WHERE start_time > NOW() AND deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_user_calendar_settings_provider ON user_calendar_settings(default_provider, auto_sync);
CREATE INDEX IF NOT EXISTS idx_user_calendar_settings_sync ON user_calendar_settings(last_sync) WHERE auto_sync = true;

-- File management optimization
CREATE INDEX IF NOT EXISTS idx_files_user_status ON files(user_id, status, created_at);
CREATE INDEX IF NOT EXISTS idx_files_organization_type ON files(organization_id, mime_type, created_at);
CREATE INDEX IF NOT EXISTS idx_files_processing ON files(is_processed, scan_status, created_at);
CREATE INDEX IF NOT EXISTS idx_files_size ON files(file_size DESC) WHERE file_size > 1048576; -- Files > 1MB

-- Notification optimization
CREATE INDEX IF NOT EXISTS idx_notifications_user_unread ON notifications(user_id, is_read, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_type_recent ON notifications(type, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_cleanup ON notifications(created_at) WHERE created_at < NOW() - INTERVAL '90 days';

-- Site settings optimization
CREATE INDEX IF NOT EXISTS idx_site_settings_organization_public ON site_settings(organization_id, is_public, key);
CREATE INDEX IF NOT EXISTS idx_site_settings_type ON site_settings(type, key);

-- Partial indexes for better performance on filtered queries
CREATE INDEX IF NOT EXISTS idx_bookings_pending_recent ON bookings(created_at DESC) 
  WHERE status = 'pending' AND created_at >= NOW() - INTERVAL '30 days';

CREATE INDEX IF NOT EXISTS idx_payments_failed_recent ON payments(created_at DESC) 
  WHERE status = 'failed' AND created_at >= NOW() - INTERVAL '7 days';

CREATE INDEX IF NOT EXISTS idx_crypto_pending_deadline ON crypto_transactions(payment_deadline ASC) 
  WHERE status = 'pending' AND payment_deadline > NOW();

CREATE INDEX IF NOT EXISTS idx_events_public_upcoming ON events(event_date ASC) 
  WHERE is_public = true AND status = 'upcoming' AND event_date > NOW();

-- Text search optimization for global search functionality
CREATE INDEX IF NOT EXISTS idx_global_search_celebrities ON celebrities 
  USING gin((name || ' ' || COALESCE(bio, '')) gin_trgm_ops) 
  WHERE is_active = true;

CREATE INDEX IF NOT EXISTS idx_global_search_events ON events 
  USING gin((title || ' ' || COALESCE(description, '')) gin_trgm_ops) 
  WHERE status != 'cancelled';

-- Create trigram extension if not exists (for fuzzy text search)
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Statistics update for query planner optimization
ANALYZE app_users;
ANALYZE celebrities;
ANALYZE bookings;
ANALYZE payments;
ANALYZE events;
ANALYZE crypto_transactions;
ANALYZE chat_messages;
ANALYZE daily_metrics;
ANALYZE fraud_alerts;
ANALYZE user_behavior;

-- ============================================
-- ROLLBACK
-- ============================================

-- Drop all performance indexes created in this migration
DROP INDEX IF EXISTS idx_bookings_user_status_date;
DROP INDEX IF EXISTS idx_bookings_celebrity_status_date;
DROP INDEX IF EXISTS idx_bookings_organization_status;
DROP INDEX IF EXISTS idx_bookings_amount_range;
DROP INDEX IF EXISTS idx_bookings_payment_status_created;

DROP INDEX IF EXISTS idx_celebrities_category_available;
DROP INDEX IF EXISTS idx_celebrities_rate_range;
DROP INDEX IF EXISTS idx_celebrities_featured_category;
DROP INDEX IF EXISTS idx_celebrities_organization_active;
DROP INDEX IF EXISTS idx_celebrities_name_search;
DROP INDEX IF EXISTS idx_celebrities_bio_search;

DROP INDEX IF EXISTS idx_app_users_email_active;
DROP INDEX IF EXISTS idx_app_users_organization_role;
DROP INDEX IF EXISTS idx_app_users_last_login;
DROP INDEX IF EXISTS idx_app_users_created_month;

DROP INDEX IF EXISTS idx_user_sessions_user_active;
DROP INDEX IF EXISTS idx_user_sessions_token_active;
DROP INDEX IF EXISTS idx_user_sessions_cleanup;

DROP INDEX IF EXISTS idx_payments_user_status;
DROP INDEX IF EXISTS idx_payments_booking_status;
DROP INDEX IF EXISTS idx_payments_provider_status;
DROP INDEX IF EXISTS idx_payments_amount_currency;
DROP INDEX IF EXISTS idx_payments_monthly_revenue;

DROP INDEX IF EXISTS idx_crypto_transactions_user_status;
DROP INDEX IF EXISTS idx_crypto_transactions_network_currency;
DROP INDEX IF EXISTS idx_crypto_transactions_confirmations;
DROP INDEX IF EXISTS idx_crypto_transactions_deadline;
DROP INDEX IF EXISTS idx_crypto_transactions_verified_amount;

DROP INDEX IF EXISTS idx_events_date_status;
DROP INDEX IF EXISTS idx_events_celebrity_date;
DROP INDEX IF EXISTS idx_events_organization_public;
DROP INDEX IF EXISTS idx_events_upcoming;

DROP INDEX IF EXISTS idx_venues_location;
DROP INDEX IF EXISTS idx_venues_capacity;
DROP INDEX IF EXISTS idx_venues_organization_active;

DROP INDEX IF EXISTS idx_celebrity_availability_date_available;
DROP INDEX IF EXISTS idx_celebrity_availability_future;

DROP INDEX IF EXISTS idx_user_roles_active;
DROP INDEX IF EXISTS idx_role_permissions_lookup;
DROP INDEX IF EXISTS idx_roles_organization_system;

DROP INDEX IF EXISTS idx_chat_conversations_participants;
DROP INDEX IF EXISTS idx_chat_conversations_booking_status;
DROP INDEX IF EXISTS idx_chat_conversations_recent;

DROP INDEX IF EXISTS idx_chat_messages_conversation_time;
DROP INDEX IF EXISTS idx_chat_messages_sender_time;
DROP INDEX IF EXISTS idx_chat_messages_unread;

DROP INDEX IF EXISTS idx_email_notifications_recipient_status;
DROP INDEX IF EXISTS idx_email_notifications_type_status;
DROP INDEX IF EXISTS idx_email_notifications_queue;
DROP INDEX IF EXISTS idx_email_notifications_related;

DROP INDEX IF EXISTS idx_daily_metrics_org_type_date;
DROP INDEX IF EXISTS idx_daily_metrics_recent;

DROP INDEX IF EXISTS idx_celebrity_metrics_value;
DROP INDEX IF EXISTS idx_celebrity_metrics_updated;

DROP INDEX IF EXISTS idx_revenue_forecasts_month_org;
DROP INDEX IF EXISTS idx_revenue_forecasts_recent;

DROP INDEX IF EXISTS idx_fraud_alerts_severity_status;
DROP INDEX IF EXISTS idx_fraud_alerts_entity_recent;
DROP INDEX IF EXISTS idx_fraud_alerts_open;

DROP INDEX IF EXISTS idx_user_behavior_user_recent;
DROP INDEX IF EXISTS idx_user_behavior_action_time;
DROP INDEX IF EXISTS idx_user_behavior_risk;
DROP INDEX IF EXISTS idx_user_behavior_ip;

DROP INDEX IF EXISTS idx_calendar_events_user_time;
DROP INDEX IF EXISTS idx_calendar_events_booking_sync;
DROP INDEX IF EXISTS idx_calendar_events_provider_sync;
DROP INDEX IF EXISTS idx_calendar_events_upcoming;

DROP INDEX IF EXISTS idx_user_calendar_settings_provider;
DROP INDEX IF EXISTS idx_user_calendar_settings_sync;

DROP INDEX IF EXISTS idx_files_user_status;
DROP INDEX IF EXISTS idx_files_organization_type;
DROP INDEX IF EXISTS idx_files_processing;
DROP INDEX IF EXISTS idx_files_size;

DROP INDEX IF EXISTS idx_notifications_user_unread;
DROP INDEX IF EXISTS idx_notifications_type_recent;
DROP INDEX IF EXISTS idx_notifications_cleanup;

DROP INDEX IF EXISTS idx_site_settings_organization_public;
DROP INDEX IF EXISTS idx_site_settings_type;

DROP INDEX IF EXISTS idx_bookings_pending_recent;
DROP INDEX IF EXISTS idx_payments_failed_recent;
DROP INDEX IF EXISTS idx_crypto_pending_deadline;
DROP INDEX IF EXISTS idx_events_public_upcoming;

DROP INDEX IF EXISTS idx_global_search_celebrities;
DROP INDEX IF EXISTS idx_global_search_events;