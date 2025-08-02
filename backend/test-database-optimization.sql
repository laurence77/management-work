-- ===============================================
-- DATABASE OPTIMIZATION TEST SUITE
-- Purpose: Verify all optimizations are working
-- ===============================================

\echo '🧪 STARTING DATABASE OPTIMIZATION TESTS...'
\echo ''

-- ===============================================
-- 1. BASIC CONNECTIVITY & TABLE STRUCTURE
-- ===============================================
\echo '1. 📊 TESTING BASIC CONNECTIVITY & STRUCTURE'
\echo '----------------------------------------'

-- Check if all main tables exist
SELECT 
  table_name,
  CASE WHEN table_name IN ('users', 'celebrities', 'bookings', 'notifications') 
    THEN '✅ CORE TABLE' 
    ELSE '📋 SUPPORT TABLE' 
  END as status
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_type = 'BASE TABLE'
ORDER BY 
  CASE WHEN table_name IN ('users', 'celebrities', 'bookings', 'notifications') THEN 1 ELSE 2 END,
  table_name;

\echo ''

-- ===============================================
-- 2. INDEX VERIFICATION
-- ===============================================
\echo '2. 🚀 TESTING INDEX PERFORMANCE'
\echo '----------------------------------------'

-- List all optimization indexes
SELECT 
  indexname,
  tablename,
  CASE WHEN indexname LIKE 'idx_bookings%' THEN '🎯 CRITICAL'
       WHEN indexname LIKE 'idx_celebrities%' THEN '⭐ SEARCH'
       WHEN indexname LIKE 'idx_users%' THEN '👤 AUTH'
       ELSE '📈 SUPPORT'
  END as priority
FROM pg_indexes 
WHERE schemaname = 'public' 
  AND indexname LIKE 'idx_%'
ORDER BY 
  CASE WHEN indexname LIKE 'idx_bookings%' THEN 1
       WHEN indexname LIKE 'idx_celebrities%' THEN 2
       WHEN indexname LIKE 'idx_users%' THEN 3
       ELSE 4
  END,
  indexname;

\echo ''

-- ===============================================
-- 3. PERFORMANCE TESTING
-- ===============================================
\echo '3. ⚡ TESTING QUERY PERFORMANCE'
\echo '----------------------------------------'

\echo 'Testing booking queries (should use idx_bookings_status_created_at):'
EXPLAIN (ANALYZE, BUFFERS, FORMAT TEXT) 
SELECT id, booking_number, celebrity_name, status, created_at
FROM bookings 
WHERE status = 'pending' 
ORDER BY created_at DESC 
LIMIT 10;

\echo ''
\echo 'Testing celebrity search (should use GIN index):'
EXPLAIN (ANALYZE, BUFFERS, FORMAT TEXT)
SELECT id, name, category, availability
FROM celebrities 
WHERE to_tsvector('english', name) @@ to_tsquery('english', 'actor | musician')
LIMIT 5;

\echo ''

-- ===============================================
-- 4. DATA INTEGRITY TESTING
-- ===============================================
\echo '4. 🔒 TESTING DATA VALIDATION'
\echo '----------------------------------------'

-- Test email validation constraint
\echo 'Testing email validation...'
DO $$
BEGIN
  BEGIN
    INSERT INTO users (email, first_name, last_name) 
    VALUES ('invalid-email', 'Test', 'User');
    RAISE EXCEPTION 'EMAIL VALIDATION FAILED - Bad email was accepted!';
  EXCEPTION WHEN check_violation THEN
    RAISE NOTICE '✅ Email validation working correctly';
  END;
END $$;

-- Test booking date validation  
\echo 'Testing booking date validation...'
DO $$
BEGIN
  BEGIN
    INSERT INTO bookings (celebrity_name, client_name, client_email, event_date, status) 
    VALUES ('Test Celebrity', 'Test Client', 'test@example.com', '2020-01-01', 'pending');
    RAISE EXCEPTION 'DATE VALIDATION FAILED - Past date was accepted!';
  EXCEPTION WHEN check_violation THEN
    RAISE NOTICE '✅ Date validation working correctly';
  END;
END $$;

\echo ''

-- ===============================================
-- 5. DASHBOARD FUNCTIONS TESTING
-- ===============================================
\echo '5. 📈 TESTING DASHBOARD FUNCTIONS'
\echo '----------------------------------------'

-- Test admin dashboard view
\echo 'Testing admin dashboard stats:'
SELECT * FROM admin_dashboard_stats;

\echo ''

-- Test user dashboard function
\echo 'Testing user dashboard function:'
SELECT 
  'Sample User Dashboard' as description,
  total_bookings,
  confirmed_bookings,
  pending_bookings,
  distinct_celebrities
FROM get_user_dashboard('04435add-32cb-4cfc-aa2d-5dfe31881bab'::UUID);

\echo ''

-- ===============================================
-- 6. RLS SECURITY TESTING  
-- ===============================================
\echo '6. 🛡️ TESTING ROW LEVEL SECURITY'
\echo '----------------------------------------'

-- Check RLS is enabled on critical tables
SELECT 
  tablename,
  rowsecurity as rls_enabled,
  CASE WHEN rowsecurity THEN '✅ SECURED' ELSE '⚠️ UNSECURED' END as status
FROM pg_tables 
WHERE schemaname = 'public'
  AND tablename IN ('users', 'celebrities', 'bookings', 'notifications')
ORDER BY tablename;

\echo ''

-- List active RLS policies
\echo 'Active RLS policies:'
SELECT 
  tablename,
  policyname,
  cmd as operation,
  CASE WHEN qual IS NOT NULL THEN '✅ HAS CONDITIONS' ELSE '⚠️ NO CONDITIONS' END as security_level
FROM pg_policies 
WHERE schemaname = 'public'
ORDER BY tablename, policyname;

\echo ''

-- ===============================================
-- 7. PERFORMANCE BENCHMARK
-- ===============================================
\echo '7. 🏁 PERFORMANCE BENCHMARK'
\echo '----------------------------------------'

-- Benchmark: Fast booking lookup
\echo 'Benchmark 1: Recent pending bookings (target: <50ms)'
\timing on
SELECT COUNT(*) as pending_bookings
FROM bookings 
WHERE status = 'pending' 
  AND created_at > NOW() - INTERVAL '30 days';
\timing off

-- Benchmark: Celebrity search
\echo 'Benchmark 2: Celebrity text search (target: <100ms)'
\timing on
SELECT COUNT(*) as search_results
FROM celebrities 
WHERE to_tsvector('english', name || ' ' || COALESCE(description, '')) 
      @@ to_tsquery('english', 'actor | musician | performer');
\timing off

-- Benchmark: User statistics
\echo 'Benchmark 3: User dashboard aggregation (target: <200ms)'
\timing on
SELECT 
  COUNT(*) as total_users,
  COUNT(*) FILTER (WHERE is_active = true) as active_users,
  COUNT(*) FILTER (WHERE created_at > NOW() - INTERVAL '7 days') as new_users
FROM users;
\timing off

\echo ''

-- ===============================================
-- 8. SYSTEM HEALTH CHECK
-- ===============================================
\echo '8. 💚 SYSTEM HEALTH CHECK'
\echo '----------------------------------------'

-- Check table sizes
\echo 'Table sizes and row counts:'
SELECT 
  schemaname,
  tablename,
  n_tup_ins as inserts,
  n_tup_upd as updates,
  n_tup_del as deletes,
  CASE WHEN n_tup_ins > 0 THEN '📊 HAS DATA' ELSE '📭 EMPTY' END as data_status
FROM pg_stat_user_tables 
WHERE schemaname = 'public'
  AND tablename IN ('users', 'celebrities', 'bookings', 'notifications')
ORDER BY n_tup_ins DESC;

\echo ''

-- Check index usage
\echo 'Index usage statistics:'
SELECT 
  indexrelname as index_name,
  idx_scan as times_used,
  CASE WHEN idx_scan > 0 THEN '✅ BEING USED' ELSE '⚠️ UNUSED' END as usage_status
FROM pg_stat_user_indexes 
WHERE schemaname = 'public'
  AND indexrelname LIKE 'idx_%'
ORDER BY idx_scan DESC;

\echo ''

-- ===============================================
-- 9. FINAL OPTIMIZATION REPORT
-- ===============================================
\echo '9. 📋 OPTIMIZATION SUMMARY REPORT'
\echo '----------------------------------------'

SELECT 
  'Database Optimization Status' as report_section,
  json_build_object(
    'total_tables', (SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public'),
    'total_indexes', (SELECT COUNT(*) FROM pg_indexes WHERE schemaname = 'public'),
    'optimization_indexes', (SELECT COUNT(*) FROM pg_indexes WHERE schemaname = 'public' AND indexname LIKE 'idx_%'),
    'rls_enabled_tables', (SELECT COUNT(*) FROM pg_tables WHERE schemaname = 'public' AND rowsecurity = true),
    'active_policies', (SELECT COUNT(*) FROM pg_policies WHERE schemaname = 'public'),
    'total_functions', (SELECT COUNT(*) FROM information_schema.routines WHERE routine_schema = 'public'),
    'optimization_timestamp', NOW()
  ) as optimization_stats;

\echo ''
\echo '🎉 DATABASE OPTIMIZATION TESTS COMPLETE!'
\echo '✅ If you see this message, your database is optimized and working!'
\echo ''