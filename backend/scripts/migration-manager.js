const fs = require('fs').promises;
const path = require('path');
const { supabaseAdmin } = require('../config/supabase');
const { logger } = require('../utils/logger');

/**
 * Database Migration Manager
 * Handles idempotent database migrations with proper tracking and rollback support
 */

class MigrationManager {
  constructor() {
    this.migrationsDir = path.join(__dirname, '..', 'migrations');
    this.migrationsTable = 'migration_history';
    this.lockTable = 'migration_lock';
    this.lockTimeout = 300000; // 5 minutes
  }

  /**
   * Initialize migration tracking tables
   */
  async initializeMigrationTables() {
    try {
      // Create migration history table
      const migrationTableSQL = `
        CREATE TABLE IF NOT EXISTS ${this.migrationsTable} (
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
        
        CREATE INDEX IF NOT EXISTS idx_migration_history_name ON ${this.migrationsTable}(migration_name);
        CREATE INDEX IF NOT EXISTS idx_migration_history_batch ON ${this.migrationsTable}(batch_number);
        CREATE INDEX IF NOT EXISTS idx_migration_history_status ON ${this.migrationsTable}(status);
      `;

      // Create migration lock table for concurrent execution prevention
      const lockTableSQL = `
        CREATE TABLE IF NOT EXISTS ${this.lockTable} (
          id INTEGER PRIMARY KEY DEFAULT 1,
          is_locked BOOLEAN DEFAULT FALSE,
          locked_by VARCHAR(255),
          locked_at TIMESTAMP WITH TIME ZONE,
          process_id VARCHAR(100),
          expires_at TIMESTAMP WITH TIME ZONE,
          CONSTRAINT single_lock CHECK (id = 1)
        );
        
        INSERT INTO ${this.lockTable} (id, is_locked) 
        VALUES (1, FALSE) 
        ON CONFLICT (id) DO NOTHING;
      `;

      await supabaseAdmin.rpc('exec_sql', { sql_query: migrationTableSQL });
      await supabaseAdmin.rpc('exec_sql', { sql_query: lockTableSQL });
      
      logger.info('Migration tracking tables initialized');
    } catch (error) {
      logger.error('Failed to initialize migration tables:', error);
      throw error;
    }
  }

  /**
   * Acquire migration lock to prevent concurrent migrations
   */
  async acquireLock(processId = `migration-${Date.now()}`) {
    try {
      const expiresAt = new Date(Date.now() + this.lockTimeout);
      
      const { data, error } = await supabaseAdmin.rpc('exec_sql', {
        sql_query: `
          UPDATE ${this.lockTable} 
          SET 
            is_locked = TRUE,
            locked_by = '${processId}',
            locked_at = NOW(),
            process_id = '${processId}',
            expires_at = '${expiresAt.toISOString()}'
          WHERE id = 1 
          AND (
            is_locked = FALSE 
            OR expires_at < NOW()
          )
          RETURNING *;
        `
      });

      if (error) throw error;
      
      if (!data || data.length === 0) {
        throw new Error('Failed to acquire migration lock - another migration is in progress');
      }

      logger.info('Migration lock acquired', { processId });
      return processId;
    } catch (error) {
      logger.error('Failed to acquire migration lock:', error);
      throw error;
    }
  }

  /**
   * Release migration lock
   */
  async releaseLock(processId) {
    try {
      await supabaseAdmin.rpc('exec_sql', {
        sql_query: `
          UPDATE ${this.lockTable} 
          SET 
            is_locked = FALSE,
            locked_by = NULL,
            locked_at = NULL,
            process_id = NULL,
            expires_at = NULL
          WHERE id = 1 AND process_id = '${processId}';
        `
      });
      
      logger.info('Migration lock released', { processId });
    } catch (error) {
      logger.error('Failed to release migration lock:', error);
    }
  }

  /**
   * Calculate checksum for migration file content
   */
  async calculateChecksum(content) {
    const crypto = require('crypto');
    return crypto.createHash('sha256').update(content).digest('hex');
  }

  /**
   * Get list of available migration files
   */
  async getMigrationFiles() {
    try {
      const files = await fs.readdir(this.migrationsDir);
      const migrationFiles = files
        .filter(file => file.endsWith('.sql'))
        .filter(file => !file.startsWith('COMBINED_')) // Skip combined files
        .filter(file => !file.includes('deprecated'))
        .sort((a, b) => {
          // Extract number from filename for proper sorting
          const aNum = parseInt(a.match(/^(\d+)/)?.[1] || '999');
          const bNum = parseInt(b.match(/^(\d+)/)?.[1] || '999');
          return aNum - bNum;
        });
      
      return migrationFiles;
    } catch (error) {
      logger.error('Failed to read migration directory:', error);
      throw error;
    }
  }

  /**
   * Get executed migrations from database
   */
  async getExecutedMigrations() {
    try {
      const { data, error } = await supabaseAdmin
        .from(this.migrationsTable)
        .select('migration_name, checksum, status')
        .eq('status', 'completed')
        .order('executed_at');

      if (error) throw error;
      
      return data || [];
    } catch (error) {
      logger.error('Failed to get executed migrations:', error);
      throw error;
    }
  }

  /**
   * Read and parse migration file
   */
  async readMigrationFile(filename) {
    try {
      const filePath = path.join(this.migrationsDir, filename);
      const content = await fs.readFile(filePath, 'utf8');
      
      // Split migration into forward and rollback parts
      const parts = content.split('-- ROLLBACK');
      const upSQL = parts[0].trim();
      const downSQL = parts[1] ? parts[1].trim() : null;
      
      const checksum = await this.calculateChecksum(content);
      
      return {
        filename,
        content,
        upSQL,
        downSQL,
        checksum
      };
    } catch (error) {
      logger.error(`Failed to read migration file ${filename}:`, error);
      throw error;
    }
  }

  /**
   * Check if migration needs to be executed
   */
  async needsExecution(migration, executedMigrations) {
    const executed = executedMigrations.find(m => m.migration_name === migration.filename);
    
    if (!executed) {
      return { needed: true, reason: 'not_executed' };
    }
    
    if (executed.checksum !== migration.checksum) {
      return { needed: true, reason: 'checksum_mismatch' };
    }
    
    return { needed: false, reason: 'already_executed' };
  }

  /**
   * Execute a single migration
   */
  async executeMigration(migration, batchNumber) {
    const startTime = Date.now();
    
    try {
      logger.info(`Executing migration: ${migration.filename}`);
      
      // Execute the migration SQL
      const { error } = await supabaseAdmin.rpc('exec_sql', {
        sql_query: migration.upSQL
      });

      if (error) {
        throw error;
      }

      const executionTime = Date.now() - startTime;
      
      // Record successful migration
      await this.recordMigration(migration, batchNumber, executionTime, 'completed');
      
      logger.info(`Migration completed: ${migration.filename} (${executionTime}ms)`);
      
      return { success: true, executionTime };
      
    } catch (error) {
      const executionTime = Date.now() - startTime;
      
      // Record failed migration
      await this.recordMigration(migration, batchNumber, executionTime, 'failed', error.message);
      
      logger.error(`Migration failed: ${migration.filename}`, error);
      throw error;
    }
  }

  /**
   * Record migration execution in history table
   */
  async recordMigration(migration, batchNumber, executionTime, status, errorMessage = null) {
    try {
      const record = {
        migration_name: migration.filename,
        batch_number: batchNumber,
        execution_time_ms: executionTime,
        checksum: migration.checksum,
        status,
        rollback_sql: migration.downSQL,
        error_message: errorMessage
      };

      // Use upsert to handle reruns
      const { error } = await supabaseAdmin
        .from(this.migrationsTable)
        .upsert(record, { 
          onConflict: 'migration_name',
          ignoreDuplicates: false 
        });

      if (error) throw error;
      
    } catch (error) {
      logger.error('Failed to record migration:', error);
      throw error;
    }
  }

  /**
   * Get next batch number
   */
  async getNextBatchNumber() {
    try {
      const { data, error } = await supabaseAdmin.rpc('exec_sql', {
        sql_query: `
          SELECT COALESCE(MAX(batch_number), 0) + 1 as next_batch
          FROM ${this.migrationsTable};
        `
      });

      if (error) throw error;
      
      return data[0]?.next_batch || 1;
    } catch (error) {
      logger.error('Failed to get next batch number:', error);
      return 1;
    }
  }

  /**
   * Run all pending migrations
   */
  async migrate() {
    let processId = null;
    
    try {
      // Initialize migration tables
      await this.initializeMigrationTables();
      
      // Acquire lock
      processId = await this.acquireLock();
      
      // Get migration files and executed migrations
      const migrationFiles = await this.getMigrationFiles();
      const executedMigrations = await this.getExecutedMigrations();
      
      logger.info(`Found ${migrationFiles.length} migration files`);
      logger.info(`${executedMigrations.length} migrations already executed`);
      
      // Determine which migrations need to be run
      const pendingMigrations = [];
      
      for (const filename of migrationFiles) {
        const migration = await this.readMigrationFile(filename);
        const { needed, reason } = await this.needsExecution(migration, executedMigrations);
        
        if (needed) {
          pendingMigrations.push({ migration, reason });
          logger.info(`Pending migration: ${filename} (${reason})`);
        }
      }
      
      if (pendingMigrations.length === 0) {
        logger.info('No pending migrations found');
        return { success: true, migrationsRun: 0 };
      }
      
      // Get batch number for this run
      const batchNumber = await this.getNextBatchNumber();
      
      logger.info(`Starting migration batch ${batchNumber} with ${pendingMigrations.length} migrations`);
      
      // Execute migrations in order
      const results = [];
      
      for (const { migration, reason } of pendingMigrations) {
        try {
          const result = await this.executeMigration(migration, batchNumber);
          results.push({ 
            migration: migration.filename, 
            success: true, 
            reason,
            executionTime: result.executionTime 
          });
        } catch (error) {
          results.push({ 
            migration: migration.filename, 
            success: false, 
            reason,
            error: error.message 
          });
          
          // Stop on first failure
          logger.error(`Migration batch failed at: ${migration.filename}`);
          break;
        }
      }
      
      const successful = results.filter(r => r.success).length;
      const failed = results.filter(r => !r.success).length;
      
      logger.info(`Migration batch ${batchNumber} completed: ${successful} successful, ${failed} failed`);
      
      return {
        success: failed === 0,
        batchNumber,
        migrationsRun: successful,
        migrationsFailed: failed,
        results
      };
      
    } catch (error) {
      logger.error('Migration process failed:', error);
      throw error;
    } finally {
      if (processId) {
        await this.releaseLock(processId);
      }
    }
  }

  /**
   * Rollback migrations to specific migration or batch
   */
  async rollback(target) {
    let processId = null;
    
    try {
      processId = await this.acquireLock();
      
      let migrationsToRollback = [];
      
      if (typeof target === 'number') {
        // Rollback by batch number
        const { data, error } = await supabaseAdmin
          .from(this.migrationsTable)
          .select('*')
          .gte('batch_number', target)
          .eq('status', 'completed')
          .order('executed_at', { ascending: false });
          
        if (error) throw error;
        migrationsToRollback = data || [];
        
      } else if (typeof target === 'string') {
        // Rollback to specific migration (exclusive)
        const { data, error } = await supabaseAdmin
          .from(this.migrationsTable)
          .select('*')
          .gt('migration_name', target)
          .eq('status', 'completed')
          .order('executed_at', { ascending: false });
          
        if (error) throw error;
        migrationsToRollback = data || [];
      }
      
      if (migrationsToRollback.length === 0) {
        logger.info('No migrations to rollback');
        return { success: true, rolledBack: 0 };
      }
      
      logger.info(`Rolling back ${migrationsToRollback.length} migrations`);
      
      const results = [];
      
      for (const migration of migrationsToRollback) {
        try {
          if (!migration.rollback_sql) {
            logger.warn(`No rollback SQL available for: ${migration.migration_name}`);
            continue;
          }
          
          logger.info(`Rolling back: ${migration.migration_name}`);
          
          const { error } = await supabaseAdmin.rpc('exec_sql', {
            sql_query: migration.rollback_sql
          });
          
          if (error) throw error;
          
          // Update status to rolled_back
          await supabaseAdmin
            .from(this.migrationsTable)
            .update({ status: 'rolled_back' })
            .eq('migration_name', migration.migration_name);
          
          results.push({ migration: migration.migration_name, success: true });
          logger.info(`Rollback completed: ${migration.migration_name}`);
          
        } catch (error) {
          results.push({ 
            migration: migration.migration_name, 
            success: false, 
            error: error.message 
          });
          
          logger.error(`Rollback failed: ${migration.migration_name}`, error);
          break;
        }
      }
      
      const successful = results.filter(r => r.success).length;
      const failed = results.filter(r => !r.success).length;
      
      logger.info(`Rollback completed: ${successful} successful, ${failed} failed`);
      
      return {
        success: failed === 0,
        rolledBack: successful,
        failed,
        results
      };
      
    } catch (error) {
      logger.error('Rollback process failed:', error);
      throw error;
    } finally {
      if (processId) {
        await this.releaseLock(processId);
      }
    }
  }

  /**
   * Get migration status
   */
  async getStatus() {
    try {
      const migrationFiles = await this.getMigrationFiles();
      const executedMigrations = await this.getExecutedMigrations();
      
      const status = {
        totalMigrations: migrationFiles.length,
        executedMigrations: executedMigrations.length,
        pendingMigrations: [],
        lastBatch: 0,
        isUpToDate: true
      };
      
      // Get last batch number
      if (executedMigrations.length > 0) {
        const { data } = await supabaseAdmin.rpc('exec_sql', {
          sql_query: `SELECT MAX(batch_number) as last_batch FROM ${this.migrationsTable};`
        });
        status.lastBatch = data[0]?.last_batch || 0;
      }
      
      // Check for pending migrations
      for (const filename of migrationFiles) {
        const migration = await this.readMigrationFile(filename);
        const { needed, reason } = await this.needsExecution(migration, executedMigrations);
        
        if (needed) {
          status.pendingMigrations.push({ filename, reason });
          status.isUpToDate = false;
        }
      }
      
      return status;
      
    } catch (error) {
      logger.error('Failed to get migration status:', error);
      throw error;
    }
  }

  /**
   * Create a new migration file template
   */
  async createMigration(name, description = '') {
    try {
      const timestamp = new Date().toISOString().replace(/[-:T]/g, '').split('.')[0];
      const filename = `${timestamp}_${name.toLowerCase().replace(/[^a-z0-9]/g, '_')}.sql`;
      const filePath = path.join(this.migrationsDir, filename);
      
      const template = `-- Migration: ${name}
-- Description: ${description}
-- Created: ${new Date().toISOString()}

-- ============================================
-- FORWARD MIGRATION
-- ============================================

-- Add your migration SQL here


-- ============================================
-- ROLLBACK
-- ============================================

-- Add your rollback SQL here (optional)
-- This section is used for migration rollbacks
-- Comment out if rollback is not supported

`;

      await fs.writeFile(filePath, template, 'utf8');
      
      logger.info(`Migration file created: ${filename}`);
      return { filename, path: filePath };
      
    } catch (error) {
      logger.error('Failed to create migration file:', error);
      throw error;
    }
  }
}

// Create singleton instance
const migrationManager = new MigrationManager();

module.exports = {
  MigrationManager,
  migrationManager
};