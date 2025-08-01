# Database Migration System Implementation

## Overview

This implementation provides a comprehensive, production-ready database migration system with idempotent operations, rollback support, concurrent execution protection, and comprehensive tracking for the celebrity booking management platform.

## Features Implemented

### 1. **Idempotent Migration Execution**

#### Checksum-Based Change Detection
```javascript
// Each migration tracked with content checksum
const checksum = crypto.createHash('sha256').update(content).digest('hex');

// Compare checksums to detect changes
if (executed.checksum !== migration.checksum) {
  return { needed: true, reason: 'checksum_mismatch' };
}
```

#### Smart Re-execution Logic
- **Already Executed**: Skip if checksum matches
- **Checksum Mismatch**: Re-run if migration content changed
- **New Migration**: Execute new migrations
- **Failed Previous Run**: Retry failed migrations

### 2. **Comprehensive Migration Tracking**

#### Migration History Table
```sql
CREATE TABLE migration_history (
  id SERIAL PRIMARY KEY,
  migration_name VARCHAR(255) NOT NULL UNIQUE,
  batch_number INTEGER NOT NULL,
  executed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  execution_time_ms INTEGER NOT NULL,
  checksum VARCHAR(64) NOT NULL,
  status VARCHAR(20) DEFAULT 'completed',
  rollback_sql TEXT,
  error_message TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

#### Migration Lock System
```sql
CREATE TABLE migration_lock (
  id INTEGER PRIMARY KEY DEFAULT 1,
  is_locked BOOLEAN DEFAULT FALSE,
  locked_by VARCHAR(255),
  locked_at TIMESTAMP WITH TIME ZONE,
  process_id VARCHAR(100),
  expires_at TIMESTAMP WITH TIME ZONE,
  CONSTRAINT single_lock CHECK (id = 1)
);
```

### 3. **Concurrent Execution Prevention**

#### Process-Level Locking
- **Automatic Lock Acquisition**: Prevents multiple migration processes
- **Process ID Tracking**: Identifies which process holds the lock
- **Automatic Expiration**: Locks expire after 5 minutes to prevent deadlocks
- **Clean Release**: Proper lock cleanup on completion or failure

#### Lock Management
```javascript
async acquireLock(processId = `migration-${Date.now()}`) {
  const expiresAt = new Date(Date.now() + this.lockTimeout);
  
  const { data, error } = await supabaseAdmin.rpc('exec_sql', {
    sql_query: `
      UPDATE migration_lock 
      SET is_locked = TRUE, locked_by = '${processId}', expires_at = '${expiresAt.toISOString()}'
      WHERE id = 1 AND (is_locked = FALSE OR expires_at < NOW())
      RETURNING *;
    `
  });
  
  if (!data || data.length === 0) {
    throw new Error('Failed to acquire migration lock - another migration is in progress');
  }
}
```

### 4. **Rollback Support**

#### Forward and Rollback SQL Storage
```sql
-- Migration file format
-- ============================================
-- FORWARD MIGRATION
-- ============================================
CREATE TABLE users (...);

-- ============================================
-- ROLLBACK
-- ============================================
DROP TABLE users;
```

#### Rollback Strategies
- **Batch Rollback**: Rollback entire migration batches
- **Point-in-Time Rollback**: Rollback to specific migration
- **Safe Rollback**: Only rollback if rollback SQL is provided
- **Status Tracking**: Mark rolled-back migrations in history

### 5. **Master Consolidated Migration**

#### Single Source of Truth
The `000_MASTER_CONSOLIDATED.sql` provides:
- **Complete Schema**: All tables, indexes, and constraints
- **Proper Ordering**: Dependencies resolved correctly
- **Security Setup**: RLS policies and permissions
- **Default Data**: Essential system data
- **Performance Optimization**: All necessary indexes

#### Schema Components
1. **Core Business Tables** (31 tables)
   - Organizations, Users, Celebrities, Bookings
   - Events, Venues, Payments
   
2. **Security & RBAC** (6 tables)
   - Roles, Permissions, User Roles
   - Row Level Security policies
   
3. **Communication** (3 tables)
   - Chat system, Email notifications
   
4. **Analytics** (4 tables)
   - Metrics, Forecasts, Daily tracking
   
5. **Specialized Features** (10+ tables)
   - Crypto payments, Calendar integration
   - Fraud detection, File management

### 6. **CLI Interface**

#### Comprehensive Command Set
```bash
# Run all pending migrations
npm run migrate

# Check migration status
npm run migrate:status

# Rollback to specific point
npm run migrate:rollback 5              # Batch number
npm run migrate:rollback 001_initial    # Migration name

# Create new migration
npm run migrate:create add_new_feature

# Fresh database rebuild (destructive)
npm run migrate:fresh

# Show help
npm run migrate:help
```

#### Rich Output and Feedback
```
🚀 Starting database migration...

✅ Migration completed successfully!
📊 Batch: 12
📈 Migrations run: 3

📋 Migration Details:
  ✅ 025_add_indexes.sql - not_executed (1,234ms)
  ✅ 026_update_constraints.sql - checksum_mismatch (567ms)  
  ✅ 027_add_triggers.sql - not_executed (890ms)
```

### 7. **Migration File Management**

#### Intelligent File Discovery
```javascript
async getMigrationFiles() {
  const files = await fs.readdir(this.migrationsDir);
  return files
    .filter(file => file.endsWith('.sql'))
    .filter(file => !file.startsWith('COMBINED_'))  // Skip combined files
    .filter(file => !file.includes('deprecated'))   // Skip deprecated
    .sort((a, b) => {
      // Extract number from filename for proper sorting
      const aNum = parseInt(a.match(/^(\d+)/)?.[1] || '999');
      const bNum = parseInt(b.match(/^(\d+)/)?.[1] || '999');
      return aNum - bNum;
    });
}
```

#### Migration Content Processing
- **SQL Splitting**: Separate forward and rollback SQL
- **Checksum Calculation**: SHA-256 content verification
- **Validation**: Syntax and dependency checking
- **Template Generation**: Standardized migration file creation

### 8. **Error Handling and Recovery**

#### Comprehensive Error Management
```javascript
async executeMigration(migration, batchNumber) {
  const startTime = Date.now();
  
  try {
    const { error } = await supabaseAdmin.rpc('exec_sql', {
      sql_query: migration.upSQL
    });
    
    if (error) throw error;
    
    await this.recordMigration(migration, batchNumber, executionTime, 'completed');
    
  } catch (error) {
    await this.recordMigration(migration, batchNumber, executionTime, 'failed', error.message);
    throw error;
  }
}
```

#### Recovery Mechanisms
- **Failed Migration Tracking**: Record failures with error messages
- **Retry Logic**: Can retry failed migrations after fixes
- **Partial Failure Handling**: Stop on first failure, don't corrupt state
- **Lock Cleanup**: Always release locks, even on failure

### 9. **Performance Optimization**

#### Efficient Database Operations
- **Batch Processing**: Group related operations
- **Index Creation**: Concurrent index creation where possible
- **Transaction Management**: Proper transaction boundaries
- **Connection Pooling**: Efficient database connection usage

#### Monitoring and Metrics
```javascript
// Track execution time and performance
const executionTime = Date.now() - startTime;
await this.recordMigration(migration, batchNumber, executionTime, 'completed');

// Performance logging
logger.info(`Migration completed: ${migration.filename} (${executionTime}ms)`);
```

## Implementation Files

### Core Migration System

1. **Migration Manager** (`scripts/migration-manager.js`)
   - Main migration orchestration engine
   - Lock management and concurrent execution prevention
   - Checksum-based change detection
   - Rollback functionality

2. **CLI Runner** (`scripts/run-migrations.js`)
   - Command-line interface for all migration operations
   - User-friendly output and progress tracking
   - Interactive confirmations for destructive operations

3. **Master Migration** (`migrations/000_MASTER_CONSOLIDATED.sql`)
   - Complete database schema in single file
   - All tables, indexes, constraints, and policies
   - Default data and essential configuration

### Database Schema

#### Migration Tracking Tables
```sql
-- Migration execution history
migration_history (
  id SERIAL PRIMARY KEY,
  migration_name VARCHAR(255) NOT NULL UNIQUE,
  batch_number INTEGER NOT NULL,
  executed_at TIMESTAMP WITH TIME ZONE,
  execution_time_ms INTEGER NOT NULL,
  checksum VARCHAR(64) NOT NULL,
  status VARCHAR(20) DEFAULT 'completed',
  rollback_sql TEXT,
  error_message TEXT
);

-- Concurrent execution prevention
migration_lock (
  id INTEGER PRIMARY KEY DEFAULT 1,
  is_locked BOOLEAN DEFAULT FALSE,
  locked_by VARCHAR(255),
  process_id VARCHAR(100),
  expires_at TIMESTAMP WITH TIME ZONE
);
```

## Usage Examples

### Basic Migration Workflow

#### Check Current Status
```bash
npm run migrate:status
```
```
📊 Migration Status

📁 Total migration files: 15
✅ Executed migrations: 12
⏳ Pending migrations: 3
🎯 Last batch: 8
🎉 Up to date: No

⏳ Pending Migrations:
  📄 013_add_analytics_tables.sql (not_executed)
  📄 014_update_user_schema.sql (not_executed)
  📄 015_add_performance_indexes.sql (not_executed)

💡 Run "npm run migrate" to execute pending migrations
```

#### Execute Pending Migrations
```bash
npm run migrate
```
```
🚀 Starting database migration...

📋 Migration Details:
  ✅ 013_add_analytics_tables.sql - not_executed (2,345ms)
  ✅ 014_update_user_schema.sql - not_executed (1,123ms)
  ✅ 015_add_performance_indexes.sql - not_executed (5,678ms)

✅ Migration completed successfully!
📊 Batch: 9
📈 Migrations run: 3
```

### Creating New Migrations

#### Create Migration File
```bash
npm run migrate:create add_celebrity_ratings "Add rating system for celebrities"
```
```
📝 Creating new migration: add_celebrity_ratings

✅ Migration file created!
📄 File: 20250726123456_add_celebrity_ratings.sql
📍 Path: /backend/migrations/20250726123456_add_celebrity_ratings.sql

💡 Edit the file to add your migration SQL
```

#### Generated Migration Template
```sql
-- Migration: add_celebrity_ratings
-- Description: Add rating system for celebrities
-- Created: 2025-07-26T12:34:56.789Z

-- ============================================
-- FORWARD MIGRATION
-- ============================================

-- Add your migration SQL here
ALTER TABLE celebrities ADD COLUMN average_rating NUMERIC(3,2) DEFAULT 0;
ALTER TABLE celebrities ADD COLUMN rating_count INTEGER DEFAULT 0;

CREATE TABLE celebrity_ratings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  celebrity_id UUID NOT NULL REFERENCES celebrities(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES app_users(id) ON DELETE CASCADE,
  rating INTEGER CHECK (rating >= 1 AND rating <= 5),
  review TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(celebrity_id, user_id)
);

-- ============================================
-- ROLLBACK
-- ============================================

-- Add your rollback SQL here
DROP TABLE celebrity_ratings;
ALTER TABLE celebrities DROP COLUMN average_rating;
ALTER TABLE celebrities DROP COLUMN rating_count;
```

### Rollback Operations

#### Rollback to Specific Batch
```bash
npm run migrate:rollback 7
```
```
🔄 Rolling back to: 7

📋 Rollback Details:
  ✅ 015_add_performance_indexes.sql
  ✅ 014_update_user_schema.sql
  ✅ 013_add_analytics_tables.sql

✅ Rollback completed successfully!
📉 Migrations rolled back: 3
```

#### Rollback to Specific Migration
```bash
npm run migrate:rollback 012_chat_system
```
```
🔄 Rolling back to: 012_chat_system

📋 Rollback Details:
  ✅ 015_add_performance_indexes.sql
  ✅ 014_update_user_schema.sql  
  ✅ 013_add_analytics_tables.sql

✅ Rollback completed successfully!
📉 Migrations rolled back: 3
```

### Fresh Database Setup

#### Complete Database Rebuild
```bash
npm run migrate:fresh
```
```
🔥 Fresh migration (WARNING: This will reset the database)

⚠️  This will DESTROY all data and rebuild the database. Continue? (yes/no): yes

🗑️  Rolling back all migrations...
✅ All migrations rolled back

🚀 Running fresh migration...
✅ Migration completed successfully!
📊 Batch: 1
📈 Migrations run: 15
```

## Error Handling Examples

### Failed Migration Recovery
```bash
npm run migrate
```
```
🚀 Starting database migration...

❌ Migration failed!
📈 Successful: 2
📉 Failed: 1

📋 Migration Results:
  ✅ 013_add_analytics_tables.sql
  ✅ 014_update_user_schema.sql
  ❌ 015_add_performance_indexes.sql - syntax error at or near "CONCURENTLY"
```

After fixing the SQL syntax error:
```bash
npm run migrate
```
```
🚀 Starting database migration...

📋 Migration Details:
  ✅ 015_add_performance_indexes.sql - checksum_mismatch (3,456ms)

✅ Migration completed successfully!
📊 Batch: 10
📈 Migrations run: 1
```

### Concurrent Execution Prevention
```bash
# Terminal 1
npm run migrate

# Terminal 2 (simultaneous)
npm run migrate
```
```
# Terminal 2 Output
❌ Migration command failed: Failed to acquire migration lock - another migration is in progress
```

## Production Deployment

### Environment Setup
```bash
# Required environment variables
DATABASE_URL=postgresql://user:pass@host:5432/dbname
SUPABASE_URL=https://project.supabase.co
SUPABASE_SERVICE_KEY=your_service_role_key

# Optional configuration
MIGRATION_LOCK_TIMEOUT=300000  # 5 minutes
MIGRATION_BATCH_SIZE=50        # Max migrations per batch
```

### Deployment Pipeline Integration
```yaml
# Example GitHub Actions workflow
- name: Run Database Migrations
  run: |
    npm run migrate:status
    npm run migrate
    
- name: Verify Migration Success
  run: |
    npm run migrate:status | grep "Up to date: Yes"
```

### Production Best Practices

#### Pre-Deployment Checks
```bash
# 1. Check migration status
npm run migrate:status

# 2. Backup database (external process)
pg_dump $DATABASE_URL > backup_$(date +%Y%m%d_%H%M%S).sql

# 3. Run migrations
npm run migrate

# 4. Verify application health
curl -f http://localhost:3000/api/health
```

#### Monitoring and Alerting
```javascript
// Integration with monitoring systems
const result = await migrationManager.migrate();

if (!result.success) {
  // Send alert to monitoring system
  monitoring.alert('Migration failed', {
    batch: result.batchNumber,
    failed: result.migrationsFailed,
    errors: result.results.filter(r => !r.success)
  });
}
```

## Security Considerations

### Access Control
- **Service Role Required**: Migrations require Supabase service role key
- **Environment Isolation**: Separate credentials for each environment
- **Audit Trail**: Complete logging of all migration activities
- **Lock Protection**: Prevents unauthorized concurrent access

### Data Protection
- **Rollback Safety**: Always test rollback scripts before production
- **Backup Integration**: Automated backups before major migrations
- **Validation**: Schema validation before and after migrations
- **Error Recovery**: Graceful handling of migration failures

### Compliance
- **Change Tracking**: Complete audit trail of schema changes
- **Approval Workflow**: Integration with code review processes
- **Documentation**: Comprehensive migration documentation
- **Testing**: Automated testing of migration and rollback procedures

This comprehensive database migration system ensures reliable, safe, and trackable database schema evolution for the celebrity booking management platform while maintaining data integrity and system availability.