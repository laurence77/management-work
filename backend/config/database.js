// Primary Database: Supabase (PostgreSQL)
const { supabase } = require('./supabase');

// Backup/Alternative Database Configuration
const { Pool } = require('pg');

/**
 * Optimized Database Connection Pool Configuration
 * High-performance connection management with monitoring
 */

// Production-grade connection pool configuration
const poolConfig = {
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
  
  // Pool sizing
  min: parseInt(process.env.DB_POOL_MIN) || 2,
  max: parseInt(process.env.DB_POOL_MAX) || 20,
  
  // Connection timeouts
  connectionTimeoutMillis: 30000,
  idleTimeoutMillis: 30000,
  maxConnectTimeoutMillis: 0,
  
  // Query timeout
  query_timeout: 60000,
  
  // Keep alive settings
  keepAlive: true,
  keepAliveInitialDelayMillis: 10000,
  
  // Allow clean shutdown
  allowExitOnIdle: true,
  
  // Application name for monitoring
  application_name: 'celebrity_booking_api'
};

// Create optimized connection pools
const pgPool = process.env.DATABASE_URL ? new Pool(poolConfig) : null;

// Read-only pool for analytics (lighter load)
const readOnlyPool = process.env.DATABASE_URL ? new Pool({
  ...poolConfig,
  max: 5,
  min: 1,
  application_name: 'celebrity_booking_readonly'
}) : null;

// Connection pool monitoring
const poolStats = {
  totalQueries: 0,
  queryErrors: 0,
  avgQueryTime: 0,
  slowQueries: []
};

// Setup pool event handlers for monitoring
if (pgPool) {
  pgPool.on('connect', (client) => {
    console.log('📱 New client connected to main pool');
  });
  
  pgPool.on('acquire', (client) => {
    console.log('🔓 Client acquired from main pool');
  });
  
  pgPool.on('release', (client) => {
    console.log('🔒 Client released to main pool');
  });
  
  pgPool.on('error', (err, client) => {
    console.error('Database pool error:', err);
    poolStats.queryErrors++;
  });
}

// Query execution with performance monitoring
const executePoolQuery = async (sql, params = [], poolType = 'main') => {
  const startTime = Date.now();
  const pool = poolType === 'readonly' ? readOnlyPool : pgPool;
  
  if (!pool) {
    throw new Error('Database pool not initialized');
  }
  
  try {
    poolStats.totalQueries++;
    const result = await pool.query(sql, params);
    
    // Track query performance
    const queryTime = Date.now() - startTime;
    poolStats.avgQueryTime = (poolStats.avgQueryTime * 0.9) + (queryTime * 0.1);
    
    // Log slow queries (> 1 second)
    if (queryTime > 1000) {
      const slowQuery = {
        sql: sql.substring(0, 100) + '...',
        duration: queryTime,
        timestamp: new Date()
      };
      
      poolStats.slowQueries.push(slowQuery);
      if (poolStats.slowQueries.length > 50) {
        poolStats.slowQueries.shift();
      }
      
      console.warn(`🐌 Slow query detected: ${queryTime}ms`);
    }
    
    return result;
  } catch (error) {
    poolStats.queryErrors++;
    throw error;
  }
};

// Get pool health statistics
const getPoolHealth = () => {
  const health = {
    main: pgPool ? {
      totalCount: pgPool.totalCount,
      idleCount: pgPool.idleCount,
      waitingCount: pgPool.waitingCount,
      maxConnections: poolConfig.max
    } : null,
    readonly: readOnlyPool ? {
      totalCount: readOnlyPool.totalCount,
      idleCount: readOnlyPool.idleCount,
      waitingCount: readOnlyPool.waitingCount,
      maxConnections: 5
    } : null,
    stats: poolStats
  };
  
  return health;
};

// Database health check
const checkDatabaseHealth = async () => {
  try {
    // Test Supabase connection
    const { data, error } = await supabase
      .from('settings')
      .select('count')
      .limit(1);

    if (error && !error.message.includes('relation "settings" does not exist')) {
      throw new Error(`Supabase connection failed: ${error.message}`);
    }

    console.log('✅ Supabase connection healthy');
    return { supabase: true, postgresql: false };

  } catch (supabaseError) {
    console.warn('⚠️ Supabase connection issue:', supabaseError.message);
    
    // Try PostgreSQL fallback if available
    if (pgPool) {
      try {
        const client = await pgPool.connect();
        await client.query('SELECT NOW()');
        client.release();
        console.log('✅ PostgreSQL fallback connection established');
        return { supabase: false, postgresql: true };
      } catch (pgError) {
        console.error('❌ PostgreSQL fallback failed:', pgError.message);
      }
    }
    
    console.error('❌ All database connections failed');
    return { supabase: false, postgresql: false };
  }
};

// Database migration runner
const runMigrations = async () => {
  try {
    console.log('🔄 Running database migrations...');
    
    // Check if migrations table exists
    const { data: migrationTable, error: tableError } = await supabase
      .from('migrations')
      .select('version')
      .limit(1);

    if (tableError && tableError.message.includes('relation "migrations" does not exist')) {
      console.log('📝 Creating migrations tracking table...');
      
      // Create migrations table
      const { error: createError } = await supabase.rpc('exec_sql', {
        sql: `
          CREATE TABLE IF NOT EXISTS migrations (
            id SERIAL PRIMARY KEY,
            version VARCHAR(255) UNIQUE NOT NULL,
            executed_at TIMESTAMP DEFAULT NOW(),
            success BOOLEAN DEFAULT TRUE
          );
        `
      });

      if (createError) {
        console.warn('⚠️ Could not create migrations table:', createError.message);
      }
    }

    console.log('✅ Migration system ready');
    return true;

  } catch (error) {
    console.error('❌ Migration setup failed:', error.message);
    return false;
  }
};

// Connection factory
const getConnection = async (preferSupabase = true) => {
  if (preferSupabase) {
    try {
      // Test Supabase connection
      await supabase.from('settings').select('count').limit(1);
      return { type: 'supabase', client: supabase };
    } catch (error) {
      console.warn('Supabase unavailable, trying PostgreSQL...');
    }
  }

  if (pgPool) {
    try {
      const client = await pgPool.connect();
      return { type: 'postgresql', client, release: () => client.release() };
    } catch (error) {
      console.error('PostgreSQL connection failed:', error.message);
    }
  }

  throw new Error('No database connections available');
};

// Query executor with fallback
const executeQuery = async (supabaseQuery, pgQuery, params = []) => {
  try {
    // Try Supabase first
    if (typeof supabaseQuery === 'function') {
      const result = await supabaseQuery();
      return { data: result.data, error: result.error, source: 'supabase' };
    }
    return { data: supabaseQuery.data, error: supabaseQuery.error, source: 'supabase' };
    
  } catch (supabaseError) {
    console.warn('Supabase query failed, trying PostgreSQL:', supabaseError.message);
    
    if (pgPool && pgQuery) {
      try {
        const client = await pgPool.connect();
        const result = await client.query(pgQuery, params);
        client.release();
        return { data: result.rows, error: null, source: 'postgresql' };
      } catch (pgError) {
        console.error('PostgreSQL query failed:', pgError.message);
        return { data: null, error: pgError, source: 'postgresql' };
      }
    }
    
    return { data: null, error: supabaseError, source: 'none' };
  }
};

// Database initialization
const initializeDatabase = async () => {
  console.log('🚀 Initializing database connections...');
  
  const health = await checkDatabaseHealth();
  
  if (health.supabase) {
    console.log('✅ Using Supabase as primary database');
    await runMigrations();
  } else if (health.postgresql) {
    console.log('✅ Using PostgreSQL as fallback database');
  } else {
    console.error('❌ No database connections available');
    if (process.env.NODE_ENV === 'production') {
      process.exit(1);
    }
  }
  
  return health;
};

// Graceful shutdown for connection pools
const closeDatabaseConnections = async () => {
  console.log('🔄 Closing database connections...');
  
  const shutdownPromises = [];
  
  if (pgPool) {
    shutdownPromises.push(
      pgPool.end().then(() => console.log('✅ Main PostgreSQL pool closed'))
    );
  }
  
  if (readOnlyPool) {
    shutdownPromises.push(
      readOnlyPool.end().then(() => console.log('✅ Read-only PostgreSQL pool closed'))
    );
  }
  
  await Promise.all(shutdownPromises);
  console.log('✅ All database connections closed');
};

// Export database utilities
module.exports = {
  supabase,
  pgPool,
  readOnlyPool,
  executePoolQuery,
  getPoolHealth,
  checkDatabaseHealth,
  runMigrations,
  getConnection,
  executeQuery,
  initializeDatabase,
  closeDatabaseConnections
};