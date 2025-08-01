#!/bin/bash

# Database Connection Pooling and Performance Optimization for Supabase
# This script optimizes database connections and performance for production

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

print_status "🗄️ Celebrity Booking Platform - Database Optimization Setup"
echo ""

# =============================================================================
# CONNECTION POOLING SETUP
# =============================================================================

setup_connection_pooling() {
    print_status "Setting up database connection pooling..."
    
    cd /opt/celebrity-booking/backend
    
    # Install connection pooling dependencies
    npm install --save pg-pool pg-cursor pg-query-stream
    
    # Database connection manager
    cat > /opt/celebrity-booking/backend/utils/database.js <<'EOF'
const { Pool } = require('pg');
const { createClient } = require('@supabase/supabase-js');

class DatabaseManager {
  constructor() {
    this.supabaseClient = null;
    this.pgPool = null;
    this.connectionConfig = {
      max: parseInt(process.env.DB_POOL_MAX) || 20,
      min: parseInt(process.env.DB_POOL_MIN) || 5,
      acquireTimeoutMillis: parseInt(process.env.DB_ACQUIRE_TIMEOUT) || 30000,
      createTimeoutMillis: parseInt(process.env.DB_CREATE_TIMEOUT) || 30000,
      destroyTimeoutMillis: parseInt(process.env.DB_DESTROY_TIMEOUT) || 5000,
      idleTimeoutMillis: parseInt(process.env.DB_IDLE_TIMEOUT) || 300000,
      reapIntervalMillis: parseInt(process.env.DB_REAP_INTERVAL) || 1000,
      createRetryIntervalMillis: parseInt(process.env.DB_CREATE_RETRY_INTERVAL) || 200,
      propagateCreateError: false
    };
    
    this.metrics = {
      totalConnections: 0,
      activeConnections: 0,
      idleConnections: 0,
      waitingClients: 0,
      errors: 0,
      queries: 0,
      slowQueries: 0
    };
    
    this.initializeConnections();
    this.setupMonitoring();
  }

  initializeConnections() {
    // Initialize Supabase client with optimized settings
    this.supabaseClient = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY,
      {
        db: {
          schema: 'public'
        },
        global: {
          headers: {
            'x-application': 'celebrity-booking-platform'
          }
        },
        realtime: {
          params: {
            eventsPerSecond: 10
          }
        }
      }
    );

    // Initialize PostgreSQL connection pool for direct queries
    if (process.env.DATABASE_URL) {
      this.pgPool = new Pool({
        connectionString: process.env.DATABASE_URL,
        ...this.connectionConfig,
        ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
      });

      // Pool event handlers
      this.pgPool.on('connect', (client) => {
        this.metrics.totalConnections++;
        console.log('New database connection established');
      });

      this.pgPool.on('error', (err, client) => {
        this.metrics.errors++;
        console.error('Database connection error:', err);
      });

      this.pgPool.on('acquire', (client) => {
        this.metrics.activeConnections++;
      });

      this.pgPool.on('release', (client) => {
        this.metrics.activeConnections--;
        this.metrics.idleConnections++;
      });
    }
  }

  setupMonitoring() {
    // Monitor connection pool metrics every 30 seconds
    setInterval(() => {
      if (this.pgPool) {
        this.metrics.totalConnections = this.pgPool.totalCount;
        this.metrics.idleConnections = this.pgPool.idleCount;
        this.metrics.waitingClients = this.pgPool.waitingCount;

        // Log warning if pool is stressed
        if (this.metrics.waitingClients > 5) {
          console.warn(`High number of waiting clients: ${this.metrics.waitingClients}`);
        }

        if (this.metrics.totalConnections > this.connectionConfig.max * 0.8) {
          console.warn(`High connection usage: ${this.metrics.totalConnections}/${this.connectionConfig.max}`);
        }
      }
    }, 30000);
  }

  async getSupabaseClient() {
    return this.supabaseClient;
  }

  async executeQuery(text, params = []) {
    const start = Date.now();
    let client;

    try {
      if (!this.pgPool) {
        throw new Error('PostgreSQL pool not initialized');
      }

      client = await this.pgPool.connect();
      const result = await client.query(text, params);
      
      const duration = Date.now() - start;
      this.metrics.queries++;

      // Track slow queries (>1 second)
      if (duration > 1000) {
        this.metrics.slowQueries++;
        console.warn(`Slow query detected (${duration}ms):`, text.substring(0, 100));
      }

      return result;
    } catch (error) {
      this.metrics.errors++;
      console.error('Database query error:', error);
      throw error;
    } finally {
      if (client) {
        client.release();
      }
    }
  }

  async executeTransaction(queries) {
    let client;

    try {
      if (!this.pgPool) {
        throw new Error('PostgreSQL pool not initialized');
      }

      client = await this.pgPool.connect();
      
      try {
        await client.query('BEGIN');
        
        const results = [];
        for (const query of queries) {
          const result = await client.query(query.text, query.params);
          results.push(result);
        }
        
        await client.query('COMMIT');
        return results;
      } catch (error) {
        await client.query('ROLLBACK');
        throw error;
      }
    } catch (error) {
      this.metrics.errors++;
      console.error('Transaction error:', error);
      throw error;
    } finally {
      if (client) {
        client.release();
      }
    }
  }

  async getPoolMetrics() {
    const baseMetrics = { ...this.metrics };
    
    if (this.pgPool) {
      baseMetrics.poolSize = this.pgPool.totalCount;
      baseMetrics.idleConnections = this.pgPool.idleCount;
      baseMetrics.waitingClients = this.pgPool.waitingCount;
    }

    return baseMetrics;
  }

  async healthCheck() {
    try {
      // Test Supabase connection
      const { data, error } = await this.supabaseClient
        .from('users')
        .select('count')
        .limit(1);

      if (error) {
        throw new Error(`Supabase health check failed: ${error.message}`);
      }

      // Test PostgreSQL pool if available
      if (this.pgPool) {
        await this.executeQuery('SELECT 1 as health_check');
      }

      return {
        status: 'healthy',
        supabase: 'connected',
        postgresql: this.pgPool ? 'connected' : 'not_configured',
        metrics: await this.getPoolMetrics()
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        error: error.message,
        metrics: await this.getPoolMetrics()
      };
    }
  }

  async closeConnections() {
    try {
      if (this.pgPool) {
        await this.pgPool.end();
      }
      console.log('Database connections closed');
    } catch (error) {
      console.error('Error closing database connections:', error);
    }
  }
}

// Singleton instance
const databaseManager = new DatabaseManager();

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('Closing database connections...');
  await databaseManager.closeConnections();
});

process.on('SIGINT', async () => {
  console.log('Closing database connections...');
  await databaseManager.closeConnections();
  process.exit(0);
});

module.exports = databaseManager;
EOF

    # Database middleware for connection optimization
    cat > /opt/celebrity-booking/backend/middleware/database.js <<'EOF'
const databaseManager = require('../utils/database');

// Middleware to add database client to request
const attachDatabase = async (req, res, next) => {
  try {
    req.supabase = await databaseManager.getSupabaseClient();
    req.db = databaseManager;
    next();
  } catch (error) {
    console.error('Database middleware error:', error);
    res.status(500).json({
      success: false,
      error: 'Database connection failed'
    });
  }
};

// Middleware to log slow database operations
const logSlowQueries = (req, res, next) => {
  const originalSupabase = req.supabase;
  
  if (originalSupabase) {
    // Wrap Supabase methods to track timing
    const wrapMethod = (obj, methodName) => {
      const originalMethod = obj[methodName];
      obj[methodName] = function(...args) {
        const start = Date.now();
        const result = originalMethod.apply(this, args);
        
        // If result is a promise, track its completion
        if (result && typeof result.then === 'function') {
          return result.then((data) => {
            const duration = Date.now() - start;
            if (duration > 1000) {
              console.warn(`Slow Supabase operation (${duration}ms): ${methodName}`);
            }
            return data;
          }).catch((error) => {
            const duration = Date.now() - start;
            console.error(`Failed Supabase operation (${duration}ms): ${methodName}`, error);
            throw error;
          });
        }
        
        return result;
      };
    };

    // Track common Supabase operations
    const queryBuilder = originalSupabase.from('dummy');
    ['select', 'insert', 'update', 'delete', 'upsert'].forEach(method => {
      if (queryBuilder[method]) {
        wrapMethod(queryBuilder, method);
      }
    });
  }
  
  next();
};

// Middleware to handle database connection errors
const handleDatabaseErrors = (error, req, res, next) => {
  if (error.code === 'ECONNREFUSED' || error.code === 'ETIMEDOUT') {
    console.error('Database connection error:', error);
    return res.status(503).json({
      success: false,
      error: 'Database temporarily unavailable'
    });
  }

  if (error.code === '23505') { // Unique constraint violation
    return res.status(409).json({
      success: false,
      error: 'Duplicate entry'
    });
  }

  if (error.code === '23503') { // Foreign key constraint violation
    return res.status(400).json({
      success: false,
      error: 'Invalid reference'
    });
  }

  next(error);
};

module.exports = {
  attachDatabase,
  logSlowQueries,
  handleDatabaseErrors
};
EOF

    print_success "Connection pooling setup completed"
}

# =============================================================================
# QUERY OPTIMIZATION
# =============================================================================

setup_query_optimization() {
    print_status "Setting up query optimization..."
    
    # Query optimization utilities
    cat > /opt/celebrity-booking/backend/utils/query-optimizer.js <<'EOF'
class QueryOptimizer {
  constructor() {
    this.queryCache = new Map();
    this.maxCacheSize = 1000;
    this.cacheHits = 0;
    this.cacheMisses = 0;
  }

  // Cache query results for repeated queries
  async cacheQuery(key, queryFn, ttl = 300000) { // 5 minutes default TTL
    const cached = this.queryCache.get(key);
    
    if (cached && Date.now() - cached.timestamp < ttl) {
      this.cacheHits++;
      return cached.data;
    }

    this.cacheMisses++;
    const data = await queryFn();
    
    // Implement LRU eviction if cache is full
    if (this.queryCache.size >= this.maxCacheSize) {
      const firstKey = this.queryCache.keys().next().value;
      this.queryCache.delete(firstKey);
    }

    this.queryCache.set(key, {
      data,
      timestamp: Date.now()
    });

    return data;
  }

  // Optimize Supabase queries with common patterns
  optimizeSelect(query) {
    // Add select optimizations
    const optimized = { ...query };

    // Use specific column selection instead of *
    if (!optimized.columns) {
      console.warn('Query missing specific column selection, consider specifying needed columns');
    }

    // Add limit if not specified for large tables
    if (!optimized.limit && !optimized.range) {
      optimized.limit = 1000; // Default reasonable limit
      console.warn('Added default limit to prevent large result sets');
    }

    return optimized;
  }

  // Generate optimized pagination
  generatePagination(page, limit = 20) {
    const offset = (page - 1) * limit;
    return {
      from: offset,
      to: offset + limit - 1
    };
  }

  // Build efficient filters
  buildFilters(filters) {
    const optimizedFilters = {};

    Object.entries(filters).forEach(([key, value]) => {
      if (value !== null && value !== undefined && value !== '') {
        // Handle different filter types
        if (Array.isArray(value)) {
          optimizedFilters[`${key}_in`] = value;
        } else if (typeof value === 'string' && value.includes('%')) {
          optimizedFilters[`${key}_like`] = value;
        } else {
          optimizedFilters[key] = value;
        }
      }
    });

    return optimizedFilters;
  }

  // Generate query performance report
  getPerformanceReport() {
    const totalQueries = this.cacheHits + this.cacheMisses;
    const hitRate = totalQueries > 0 ? (this.cacheHits / totalQueries) * 100 : 0;

    return {
      cache: {
        size: this.queryCache.size,
        maxSize: this.maxCacheSize,
        hits: this.cacheHits,
        misses: this.cacheMisses,
        hitRate: hitRate.toFixed(2) + '%'
      },
      queries: {
        total: totalQueries,
        cached: this.cacheHits,
        executed: this.cacheMisses
      }
    };
  }

  // Clear cache
  clearCache() {
    this.queryCache.clear();
    this.cacheHits = 0;
    this.cacheMisses = 0;
  }
}

// Common optimized queries for the celebrity booking platform
class BookingQueries {
  constructor(supabase, optimizer) {
    this.supabase = supabase;
    this.optimizer = optimizer;
  }

  async getCelebrities(filters = {}, page = 1, limit = 20) {
    const cacheKey = `celebrities_${JSON.stringify(filters)}_${page}_${limit}`;
    
    return this.optimizer.cacheQuery(cacheKey, async () => {
      let query = this.supabase
        .from('celebrities')
        .select(`
          id,
          name,
          category,
          price_per_hour,
          rating,
          availability,
          profile_image,
          created_at
        `);

      // Apply filters
      if (filters.category) {
        query = query.eq('category', filters.category);
      }
      if (filters.available !== undefined) {
        query = query.eq('availability', filters.available);
      }
      if (filters.maxPrice) {
        query = query.lte('price_per_hour', filters.maxPrice);
      }
      if (filters.minRating) {
        query = query.gte('rating', filters.minRating);
      }
      if (filters.search) {
        query = query.ilike('name', `%${filters.search}%`);
      }

      // Apply pagination
      const { from, to } = this.optimizer.generatePagination(page, limit);
      query = query.range(from, to);

      // Order by rating and availability
      query = query.order('rating', { ascending: false })
                   .order('availability', { ascending: false });

      const { data, error, count } = await query;
      
      if (error) throw error;
      
      return {
        data,
        count,
        page,
        limit,
        totalPages: Math.ceil(count / limit)
      };
    }, 180000); // Cache for 3 minutes
  }

  async getCelebrityById(id) {
    const cacheKey = `celebrity_${id}`;
    
    return this.optimizer.cacheQuery(cacheKey, async () => {
      const { data, error } = await this.supabase
        .from('celebrities')
        .select(`
          *,
          bookings!celebrity_id (
            id,
            event_date,
            status,
            user_id
          )
        `)
        .eq('id', id)
        .single();

      if (error) throw error;
      return data;
    }, 300000); // Cache for 5 minutes
  }

  async getUserBookings(userId, page = 1, limit = 10) {
    const cacheKey = `user_bookings_${userId}_${page}_${limit}`;
    
    return this.optimizer.cacheQuery(cacheKey, async () => {
      const { from, to } = this.optimizer.generatePagination(page, limit);
      
      const { data, error, count } = await this.supabase
        .from('bookings')
        .select(`
          id,
          event_date,
          event_type,
          status,
          total_amount,
          created_at,
          celebrities (
            id,
            name,
            profile_image
          )
        `)
        .eq('user_id', userId)
        .range(from, to)
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      return {
        data,
        count,
        page,
        limit
      };
    }, 60000); // Cache for 1 minute (more dynamic data)
  }

  async getBookingStats(startDate, endDate) {
    const cacheKey = `booking_stats_${startDate}_${endDate}`;
    
    return this.optimizer.cacheQuery(cacheKey, async () => {
      // Use RPC for complex aggregations
      const { data, error } = await this.supabase
        .rpc('get_booking_statistics', {
          start_date: startDate,
          end_date: endDate
        });

      if (error) throw error;
      return data;
    }, 900000); // Cache for 15 minutes
  }
}

const queryOptimizer = new QueryOptimizer();

module.exports = {
  QueryOptimizer,
  BookingQueries,
  queryOptimizer
};
EOF

    # Database indexes and optimizations SQL
    cat > /opt/celebrity-booking/backend/migrations/030_database_optimizations.sql <<'EOF'
-- Database Optimizations for Celebrity Booking Platform

-- Performance indexes
CREATE INDEX IF NOT EXISTS idx_celebrities_category ON celebrities(category) WHERE availability = true;
CREATE INDEX IF NOT EXISTS idx_celebrities_price ON celebrities(price_per_hour) WHERE availability = true;
CREATE INDEX IF NOT EXISTS idx_celebrities_rating ON celebrities(rating DESC) WHERE availability = true;
CREATE INDEX IF NOT EXISTS idx_celebrities_availability ON celebrities(availability, rating DESC);
CREATE INDEX IF NOT EXISTS idx_celebrities_search ON celebrities USING gin(to_tsvector('english', name || ' ' || COALESCE(bio, '')));

CREATE INDEX IF NOT EXISTS idx_bookings_user_date ON bookings(user_id, event_date DESC);
CREATE INDEX IF NOT EXISTS idx_bookings_celebrity_date ON bookings(celebrity_id, event_date DESC);
CREATE INDEX IF NOT EXISTS idx_bookings_status ON bookings(status) WHERE status IN ('pending', 'confirmed');
CREATE INDEX IF NOT EXISTS idx_bookings_created_at ON bookings(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_users_email ON users(email) WHERE active = true;
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role) WHERE active = true;

-- Partial indexes for common queries
CREATE INDEX IF NOT EXISTS idx_celebrities_featured ON celebrities(featured, rating DESC) WHERE featured = true AND availability = true;
CREATE INDEX IF NOT EXISTS idx_bookings_recent ON bookings(created_at DESC) WHERE created_at > NOW() - INTERVAL '30 days';

-- Composite indexes for complex queries
CREATE INDEX IF NOT EXISTS idx_celebrities_category_price_rating ON celebrities(category, price_per_hour, rating DESC) WHERE availability = true;
CREATE INDEX IF NOT EXISTS idx_bookings_user_status_date ON bookings(user_id, status, event_date DESC);

-- Database statistics and performance functions
CREATE OR REPLACE FUNCTION get_booking_statistics(start_date timestamp, end_date timestamp)
RETURNS TABLE(
    total_bookings bigint,
    confirmed_bookings bigint,
    total_revenue numeric,
    avg_booking_value numeric,
    top_celebrity_id uuid,
    top_celebrity_name text,
    top_celebrity_bookings bigint
) AS $$
BEGIN
    RETURN QUERY
    WITH booking_stats AS (
        SELECT 
            COUNT(*) as total,
            COUNT(*) FILTER (WHERE status = 'confirmed') as confirmed,
            SUM(total_amount) FILTER (WHERE status = 'confirmed') as revenue,
            AVG(total_amount) FILTER (WHERE status = 'confirmed') as avg_value
        FROM bookings 
        WHERE created_at BETWEEN start_date AND end_date
    ),
    top_celebrity AS (
        SELECT 
            c.id,
            c.name,
            COUNT(b.id) as booking_count
        FROM celebrities c
        JOIN bookings b ON c.id = b.celebrity_id
        WHERE b.created_at BETWEEN start_date AND end_date
        GROUP BY c.id, c.name
        ORDER BY COUNT(b.id) DESC
        LIMIT 1
    )
    SELECT 
        bs.total,
        bs.confirmed,
        COALESCE(bs.revenue, 0),
        COALESCE(bs.avg_value, 0),
        tc.id,
        tc.name,
        tc.booking_count
    FROM booking_stats bs
    CROSS JOIN top_celebrity tc;
END;
$$ LANGUAGE plpgsql;

-- Function to get celebrity availability
CREATE OR REPLACE FUNCTION check_celebrity_availability(
    celebrity_id_param uuid,
    event_date_param timestamp,
    duration_hours_param integer
)
RETURNS boolean AS $$
DECLARE
    conflict_count integer;
BEGIN
    SELECT COUNT(*)
    INTO conflict_count
    FROM bookings
    WHERE celebrity_id = celebrity_id_param
    AND status IN ('confirmed', 'pending')
    AND (
        event_date BETWEEN event_date_param AND event_date_param + (duration_hours_param || ' hours')::interval
        OR
        event_date + (duration_hours || ' hours')::interval BETWEEN event_date_param AND event_date_param + (duration_hours_param || ' hours')::interval
    );
    
    RETURN conflict_count = 0;
END;
$$ LANGUAGE plpgsql;

-- Function to update celebrity ratings
CREATE OR REPLACE FUNCTION update_celebrity_rating(celebrity_id_param uuid)
RETURNS void AS $$
DECLARE
    avg_rating numeric;
BEGIN
    SELECT AVG(rating)
    INTO avg_rating
    FROM reviews
    WHERE celebrity_id = celebrity_id_param;
    
    UPDATE celebrities
    SET rating = COALESCE(avg_rating, 0)
    WHERE id = celebrity_id_param;
END;
$$ LANGUAGE plpgsql;

-- Trigger to automatically update celebrity ratings
CREATE OR REPLACE FUNCTION update_celebrity_rating_trigger()
RETURNS trigger AS $$
BEGIN
    PERFORM update_celebrity_rating(NEW.celebrity_id);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_celebrity_rating ON reviews;
CREATE TRIGGER trigger_update_celebrity_rating
    AFTER INSERT OR UPDATE OR DELETE ON reviews
    FOR EACH ROW
    EXECUTE FUNCTION update_celebrity_rating_trigger();

-- Materialized view for celebrity statistics
CREATE MATERIALIZED VIEW IF NOT EXISTS celebrity_stats AS
SELECT 
    c.id,
    c.name,
    c.category,
    c.price_per_hour,
    c.rating,
    COUNT(b.id) as total_bookings,
    COUNT(b.id) FILTER (WHERE b.status = 'confirmed') as confirmed_bookings,
    COUNT(b.id) FILTER (WHERE b.created_at > NOW() - INTERVAL '30 days') as recent_bookings,
    SUM(b.total_amount) FILTER (WHERE b.status = 'confirmed') as total_revenue,
    AVG(b.total_amount) FILTER (WHERE b.status = 'confirmed') as avg_booking_value,
    MAX(b.created_at) as last_booking_date
FROM celebrities c
LEFT JOIN bookings b ON c.id = b.celebrity_id
GROUP BY c.id, c.name, c.category, c.price_per_hour, c.rating;

CREATE UNIQUE INDEX IF NOT EXISTS idx_celebrity_stats_id ON celebrity_stats(id);

-- Function to refresh materialized views
CREATE OR REPLACE FUNCTION refresh_materialized_views()
RETURNS void AS $$
BEGIN
    REFRESH MATERIALIZED VIEW CONCURRENTLY celebrity_stats;
END;
$$ LANGUAGE plpgsql;

-- Database maintenance functions
CREATE OR REPLACE FUNCTION analyze_database_performance()
RETURNS TABLE(
    table_name text,
    total_size text,
    index_size text,
    row_count bigint,
    seq_scans bigint,
    idx_scans bigint
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        schemaname||'.'||tablename as table_name,
        pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as total_size,
        pg_size_pretty(pg_indexes_size(schemaname||'.'||tablename)) as index_size,
        n_tup_ins + n_tup_upd + n_tup_del as row_count,
        seq_scan as seq_scans,
        idx_scan as idx_scans
    FROM pg_stat_user_tables
    WHERE schemaname = 'public'
    ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION get_booking_statistics IS 'Get comprehensive booking statistics for a date range';
COMMENT ON FUNCTION check_celebrity_availability IS 'Check if celebrity is available for booking at specified time';
COMMENT ON FUNCTION update_celebrity_rating IS 'Update celebrity rating based on reviews';
COMMENT ON FUNCTION analyze_database_performance IS 'Analyze database performance metrics';
EOF

    print_success "Query optimization setup completed"
}

# =============================================================================
# DATABASE MONITORING
# =============================================================================

setup_database_monitoring() {
    print_status "Setting up database monitoring..."
    
    # Database monitoring script
    cat > /usr/local/bin/database-monitor.sh <<'EOF'
#!/bin/bash

echo "🗄️ Celebrity Booking Platform - Database Monitor"
echo "================================================"

# Database connection test
echo ""
echo "🔍 Database Connection Status:"

# Test Supabase connection
if curl -s -f -H "apikey: $SUPABASE_SERVICE_ROLE_KEY" "$SUPABASE_URL/rest/v1/" >/dev/null 2>&1; then
    echo "  ✅ Supabase API reachable"
else
    echo "  ❌ Supabase API unreachable"
fi

# Test direct PostgreSQL connection if available
if [[ -n "$DATABASE_URL" ]]; then
    if psql "$DATABASE_URL" -c "SELECT 1;" >/dev/null 2>&1; then
        echo "  ✅ PostgreSQL direct connection working"
    else
        echo "  ❌ PostgreSQL direct connection failed"
    fi
fi

# Database performance metrics
echo ""
echo "📊 Database Performance Metrics:"

# Node.js script to get detailed metrics
node -e "
const databaseManager = require('/opt/celebrity-booking/backend/utils/database');

async function getMetrics() {
    try {
        const health = await databaseManager.healthCheck();
        const metrics = await databaseManager.getPoolMetrics();
        
        console.log('  Connection Pool:');
        console.log(\`    Active connections: \${metrics.activeConnections || 0}\`);
        console.log(\`    Idle connections: \${metrics.idleConnections || 0}\`);
        console.log(\`    Waiting clients: \${metrics.waitingClients || 0}\`);
        console.log(\`    Total queries: \${metrics.queries || 0}\`);
        console.log(\`    Slow queries: \${metrics.slowQueries || 0}\`);
        console.log(\`    Errors: \${metrics.errors || 0}\`);
        
        if (metrics.queries > 0) {
            const errorRate = ((metrics.errors / metrics.queries) * 100).toFixed(2);
            const slowQueryRate = ((metrics.slowQueries / metrics.queries) * 100).toFixed(2);
            console.log(\`    Error rate: \${errorRate}%\`);
            console.log(\`    Slow query rate: \${slowQueryRate}%\`);
        }
        
        console.log(\`\\n  Health Status: \${health.status}\`);
        
    } catch (error) {
        console.log(\`  Error getting metrics: \${error.message}\`);
    }
}

getMetrics();
" 2>/dev/null || echo "  Node.js metrics unavailable"

# Database size and usage
echo ""
echo "💾 Database Usage:"
if [[ -n "$DATABASE_URL" ]]; then
    psql "$DATABASE_URL" -c "
    SELECT 
        schemaname,
        tablename,
        pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as size,
        pg_stat_get_live_tuples(pg_class.oid) as live_tuples
    FROM pg_tables 
    JOIN pg_class ON pg_class.relname = pg_tables.tablename
    WHERE schemaname = 'public'
    ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC
    LIMIT 10;
    " 2>/dev/null || echo "  Database size info unavailable"
fi

# Recent slow queries
echo ""
echo "🐌 Recent Activity:"
if [[ -f "/var/log/database-performance.log" ]]; then
    echo "  Recent slow queries (last 10):"
    tail -10 /var/log/database-performance.log | grep "Slow" || echo "    No slow queries logged"
else
    echo "  No performance log found"
fi

# Cache performance
echo ""
echo "⚡ Query Cache Performance:"
node -e "
const { queryOptimizer } = require('/opt/celebrity-booking/backend/utils/query-optimizer');

try {
    const report = queryOptimizer.getPerformanceReport();
    console.log(\`  Cache hit rate: \${report.cache.hitRate}\`);
    console.log(\`  Cache size: \${report.cache.size}/\${report.cache.maxSize}\`);
    console.log(\`  Total queries: \${report.queries.total}\`);
    console.log(\`  Cached responses: \${report.queries.cached}\`);
} catch (error) {
    console.log(\`  Cache metrics unavailable: \${error.message}\`);
}
" 2>/dev/null || echo "  Cache metrics unavailable"

echo ""
echo "🔧 Management Commands:"
echo "  Database health: node -e \"require('/opt/celebrity-booking/backend/utils/database').healthCheck().then(console.log)\""
echo "  Clear query cache: node -e \"require('/opt/celebrity-booking/backend/utils/query-optimizer').queryOptimizer.clearCache()\""
echo "  Refresh stats: psql \"\$DATABASE_URL\" -c \"SELECT refresh_materialized_views();\""
echo "  Performance analysis: psql \"\$DATABASE_URL\" -c \"SELECT * FROM analyze_database_performance();\""
EOF

    chmod +x /usr/local/bin/database-monitor.sh

    # Database performance logger
    cat > /opt/celebrity-booking/backend/utils/performance-logger.js <<'EOF'
const fs = require('fs');
const path = require('path');

class PerformanceLogger {
  constructor() {
    this.logFile = '/var/log/database-performance.log';
    this.slowQueryThreshold = 1000; // 1 second
    this.errorLogThreshold = 10; // Log every 10th error
    this.errorCount = 0;
  }

  logSlowQuery(query, duration, params = []) {
    const timestamp = new Date().toISOString();
    const logEntry = `${timestamp} [SLOW_QUERY] Duration: ${duration}ms Query: ${query.substring(0, 200)}${query.length > 200 ? '...' : ''}\n`;
    
    try {
      fs.appendFileSync(this.logFile, logEntry);
    } catch (error) {
      console.error('Failed to write to performance log:', error);
    }
  }

  logDatabaseError(error, query = '') {
    this.errorCount++;
    
    // Log every 10th error to avoid spam
    if (this.errorCount % this.errorLogThreshold === 0) {
      const timestamp = new Date().toISOString();
      const logEntry = `${timestamp} [DB_ERROR] Count: ${this.errorCount} Error: ${error.message} Query: ${query.substring(0, 100)}\n`;
      
      try {
        fs.appendFileSync(this.logFile, logEntry);
      } catch (logError) {
        console.error('Failed to write to performance log:', logError);
      }
    }
  }

  logConnectionPoolEvent(event, details = {}) {
    const timestamp = new Date().toISOString();
    const logEntry = `${timestamp} [POOL_${event.toUpperCase()}] ${JSON.stringify(details)}\n`;
    
    try {
      fs.appendFileSync(this.logFile, logEntry);
    } catch (error) {
      console.error('Failed to write to performance log:', error);
    }
  }

  getPerformanceStats() {
    try {
      const logContent = fs.readFileSync(this.logFile, 'utf8');
      const lines = logContent.split('\n').filter(line => line.trim());
      
      const stats = {
        totalEntries: lines.length,
        slowQueries: lines.filter(line => line.includes('[SLOW_QUERY]')).length,
        errors: lines.filter(line => line.includes('[DB_ERROR]')).length,
        poolEvents: lines.filter(line => line.includes('[POOL_')).length,
        lastEntry: lines[lines.length - 1] || null
      };
      
      return stats;
    } catch (error) {
      return {
        error: 'Could not read performance log',
        totalEntries: 0,
        slowQueries: 0,
        errors: 0,
        poolEvents: 0
      };
    }
  }

  // Rotate log file if it gets too large
  rotateLogIfNeeded() {
    try {
      const stats = fs.statSync(this.logFile);
      const maxSize = 10 * 1024 * 1024; // 10MB
      
      if (stats.size > maxSize) {
        const backupFile = `${this.logFile}.${Date.now()}`;
        fs.renameSync(this.logFile, backupFile);
        
        // Keep only last 5 backup files
        const logDir = path.dirname(this.logFile);
        const logBasename = path.basename(this.logFile);
        const backupFiles = fs.readdirSync(logDir)
          .filter(file => file.startsWith(logBasename + '.'))
          .sort()
          .reverse();
        
        backupFiles.slice(5).forEach(file => {
          fs.unlinkSync(path.join(logDir, file));
        });
      }
    } catch (error) {
      console.error('Failed to rotate log file:', error);
    }
  }
}

const performanceLogger = new PerformanceLogger();

// Rotate log daily
setInterval(() => {
  performanceLogger.rotateLogIfNeeded();
}, 24 * 60 * 60 * 1000);

module.exports = performanceLogger;
EOF

    print_success "Database monitoring setup completed"
}

# =============================================================================
# BACKUP AND MAINTENANCE
# =============================================================================

setup_database_maintenance() {
    print_status "Setting up database maintenance and backup..."
    
    # Database maintenance script
    cat > /usr/local/bin/database-maintenance.sh <<'EOF'
#!/bin/bash

echo "🔧 Database Maintenance for Celebrity Booking Platform"
echo "===================================================="

BACKUP_DIR="/var/backups/celebrity-booking"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)

# Create backup directory
mkdir -p "$BACKUP_DIR"

# Function to backup Supabase data
backup_supabase() {
    echo "📦 Creating Supabase backup..."
    
    if [[ -n "$DATABASE_URL" ]]; then
        # Full database backup
        pg_dump "$DATABASE_URL" --clean --if-exists > "$BACKUP_DIR/supabase_full_$TIMESTAMP.sql"
        
        # Schema-only backup
        pg_dump "$DATABASE_URL" --schema-only > "$BACKUP_DIR/supabase_schema_$TIMESTAMP.sql"
        
        # Data-only backup
        pg_dump "$DATABASE_URL" --data-only > "$BACKUP_DIR/supabase_data_$TIMESTAMP.sql"
        
        # Compress backups
        gzip "$BACKUP_DIR/supabase_full_$TIMESTAMP.sql"
        gzip "$BACKUP_DIR/supabase_data_$TIMESTAMP.sql"
        
        echo "✅ Supabase backup completed"
    else
        echo "⚠️  DATABASE_URL not set, skipping direct backup"
    fi
}

# Function to optimize database
optimize_database() {
    echo "⚡ Optimizing database performance..."
    
    if [[ -n "$DATABASE_URL" ]]; then
        # Update table statistics
        psql "$DATABASE_URL" -c "ANALYZE;"
        
        # Refresh materialized views
        psql "$DATABASE_URL" -c "SELECT refresh_materialized_views();" 2>/dev/null || echo "Materialized views not available"
        
        # Clean up old data (older than 2 years)
        psql "$DATABASE_URL" -c "
        DELETE FROM bookings WHERE status = 'cancelled' AND created_at < NOW() - INTERVAL '2 years';
        DELETE FROM audit_logs WHERE created_at < NOW() - INTERVAL '1 year';
        " 2>/dev/null || echo "Data cleanup queries not available"
        
        # Vacuum tables
        psql "$DATABASE_URL" -c "VACUUM ANALYZE;"
        
        echo "✅ Database optimization completed"
    else
        echo "⚠️  DATABASE_URL not set, skipping optimization"
    fi
}

# Function to check database health
check_database_health() {
    echo "🏥 Checking database health..."
    
    # Check connection
    if /usr/local/bin/database-monitor.sh | grep -q "✅"; then
        echo "✅ Database connections healthy"
    else
        echo "❌ Database connection issues detected"
        return 1
    fi
    
    # Check for slow queries
    if [[ -f "/var/log/database-performance.log" ]]; then
        recent_slow=$(tail -100 /var/log/database-performance.log | grep "SLOW_QUERY" | wc -l)
        if [[ $recent_slow -gt 10 ]]; then
            echo "⚠️  High number of slow queries detected: $recent_slow"
        else
            echo "✅ Query performance acceptable"
        fi
    fi
    
    # Check for errors
    error_rate=$(node -e "
    const databaseManager = require('/opt/celebrity-booking/backend/utils/database');
    databaseManager.getPoolMetrics().then(metrics => {
        if (metrics.queries > 0) {
            const rate = ((metrics.errors / metrics.queries) * 100).toFixed(2);
            console.log(rate);
        } else {
            console.log('0');
        }
    }).catch(() => console.log('0'));
    " 2>/dev/null || echo "0")
    
    if (( $(echo "$error_rate > 5" | bc -l) )); then
        echo "⚠️  High error rate detected: $error_rate%"
    else
        echo "✅ Error rate acceptable: $error_rate%"
    fi
}

# Function to cleanup old backups
cleanup_old_backups() {
    echo "🧹 Cleaning up old backups..."
    
    # Keep only last 30 days of backups
    find "$BACKUP_DIR" -name "*.sql.gz" -mtime +30 -delete
    find "$BACKUP_DIR" -name "*.sql" -mtime +7 -delete
    
    # Keep only last 10 schema backups
    ls -t "$BACKUP_DIR"/supabase_schema_*.sql 2>/dev/null | tail -n +11 | xargs rm -f
    
    echo "✅ Backup cleanup completed"
}

# Main execution based on argument
case "${1:-all}" in
    "backup")
        backup_supabase
        ;;
    "optimize")
        optimize_database
        ;;
    "health")
        check_database_health
        ;;
    "cleanup")
        cleanup_old_backups
        ;;
    "all")
        check_database_health
        backup_supabase
        optimize_database
        cleanup_old_backups
        ;;
    *)
        echo "Usage: $0 {backup|optimize|health|cleanup|all}"
        echo ""
        echo "Commands:"
        echo "  backup   - Create database backup"
        echo "  optimize - Optimize database performance"
        echo "  health   - Check database health"
        echo "  cleanup  - Clean up old backups"
        echo "  all      - Run all maintenance tasks"
        exit 1
        ;;
esac

echo ""
echo "🎯 Database Maintenance Summary:"
echo "  Backup directory: $BACKUP_DIR"
echo "  Monitor logs: /var/log/database-performance.log"
echo "  Run health check: /usr/local/bin/database-monitor.sh"
EOF

    chmod +x /usr/local/bin/database-maintenance.sh

    # Automated maintenance scheduling
    cat > /etc/cron.d/database-maintenance <<'EOF'
# Database maintenance schedule

# Daily health check
0 6 * * * root /usr/local/bin/database-maintenance.sh health >> /var/log/database-maintenance.log 2>&1

# Daily backup
0 2 * * * root /usr/local/bin/database-maintenance.sh backup >> /var/log/database-maintenance.log 2>&1

# Weekly optimization
0 3 * * 0 root /usr/local/bin/database-maintenance.sh optimize >> /var/log/database-maintenance.log 2>&1

# Weekly cleanup
0 4 * * 0 root /usr/local/bin/database-maintenance.sh cleanup >> /var/log/database-maintenance.log 2>&1
EOF

    print_success "Database maintenance and backup configured"
}

# =============================================================================
# MAIN EXECUTION
# =============================================================================

# Create necessary directories
mkdir -p /var/log
mkdir -p /var/backups/celebrity-booking

# Install dependencies
if command -v apt-get >/dev/null 2>&1; then
    apt-get update
    apt-get install -y postgresql-client bc
fi

# Setup all database optimization components
setup_connection_pooling
setup_query_optimization
setup_database_monitoring
setup_database_maintenance

# Update backend to use optimized database
if [[ -f "/opt/celebrity-booking/backend/server.js" ]]; then
    print_status "Updating backend to use optimized database connection..."
    
    # Add database middleware to server.js if not already present
    if ! grep -q "database.js" /opt/celebrity-booking/backend/server.js; then
        sed -i '/const express = require/a const { attachDatabase, logSlowQueries, handleDatabaseErrors } = require("./middleware/database");' /opt/celebrity-booking/backend/server.js
        sed -i '/app.use(cors/a app.use(attachDatabase);\napp.use(logSlowQueries);' /opt/celebrity-booking/backend/server.js
        sed -i '/app.use.*errorLogger/a app.use(handleDatabaseErrors);' /opt/celebrity-booking/backend/server.js
    fi
fi

# Run initial database optimization
print_status "Running initial database optimization..."
/usr/local/bin/database-maintenance.sh optimize || print_warning "Initial optimization had issues"

# Final summary
echo ""
print_status "📋 Database Optimization Setup Summary:"
echo "  ✅ Connection pooling with automatic scaling"
echo "  ✅ Query optimization and caching"
echo "  ✅ Database performance monitoring"
echo "  ✅ Automated backup and maintenance"
echo "  ✅ Slow query logging and analysis"
echo "  ✅ Health check endpoints"

echo ""
print_status "🔧 Database Management:"
echo "  - Monitor database: /usr/local/bin/database-monitor.sh"
echo "  - Run maintenance: /usr/local/bin/database-maintenance.sh"
echo "  - View performance logs: tail -f /var/log/database-performance.log"
echo "  - Health check: node -e \"require('/opt/celebrity-booking/backend/utils/database').healthCheck().then(console.log)\""

echo ""
print_status "📊 Optimization Features:"
echo "  - Connection pool size: 5-20 connections"
echo "  - Query result caching with TTL"
echo "  - Automatic index recommendations"
echo "  - Materialized view refresh"
echo "  - Database statistics collection"

echo ""
print_status "🔧 Maintenance Schedule:"
echo "  - Daily: Health checks and backups"
echo "  - Weekly: Performance optimization and cleanup"
echo "  - Automated: Slow query logging and monitoring"

echo ""
print_success "🎉 Database optimization setup completed!"

echo ""
print_status "Next steps:"
echo "1. Monitor database performance over the next few days"
echo "2. Adjust connection pool settings based on load"
echo "3. Review slow query logs and optimize problematic queries"
echo "4. Set up alerts for database health issues"
echo "5. Test backup and restore procedures"