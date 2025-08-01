const { execSync, spawn } = require('child_process');
const fs = require('fs').promises;
const path = require('path');
const { createReadStream, createWriteStream } = require('fs');
const { createGzip } = require('zlib');
const cron = require('node-cron');
const { logger } = require('../utils/logger');

/**
 * Database Backup Service
 * Comprehensive automated backup system with compression, validation, and retention management
 */

class DatabaseBackupService {
  constructor() {
    this.backupDir = path.join(__dirname, '../backups');
    this.config = {
      // Database connection details
      database: {
        host: process.env.SUPABASE_HOST || 'localhost',
        port: process.env.SUPABASE_PORT || 5432,
        database: process.env.SUPABASE_DATABASE || 'postgres',
        username: process.env.SUPABASE_USER || 'postgres',
        password: process.env.SUPABASE_PASSWORD || process.env.SUPABASE_SERVICE_KEY
      },
      
      // Backup configuration
      backup: {
        compression: true,
        format: 'custom', // custom, plain, tar, directory
        verbose: true,
        excludeTables: ['sessions', 'rate_limits', 'temporary_data'],
        includeBlobs: true,
        createDatabase: true
      },
      
      // Retention policies
      retention: {
        hourly: 24,    // Keep 24 hourly backups
        daily: 30,     // Keep 30 daily backups
        weekly: 12,    // Keep 12 weekly backups
        monthly: 12    // Keep 12 monthly backups
      },
      
      // Backup schedules (cron format)
      schedules: {
        hourly: '0 * * * *',        // Every hour
        daily: '0 2 * * *',         // Daily at 2 AM
        weekly: '0 3 * * 0',        // Weekly on Sunday at 3 AM
        monthly: '0 4 1 * *'        // Monthly on 1st at 4 AM
      },
      
      // Storage locations
      storage: {
        local: true,
        s3: false, // Configure for S3 backup
        gcs: false // Configure for Google Cloud Storage
      },
      
      // Validation settings
      validation: {
        enabled: true,
        testRestore: false, // Perform test restore validation
        checksumVerification: true
      }
    };
    
    this.backupJobs = new Map();
    this.isInitialized = false;
  }

  /**
   * Initialize backup service
   */
  async initialize() {
    try {
      logger.info('Initializing Database Backup Service...');
      
      // Create backup directory
      await this.ensureBackupDirectory();
      
      // Validate configuration
      await this.validateConfiguration();
      
      // Schedule backup jobs
      await this.scheduleBackupJobs();
      
      // Clean up old backups
      await this.cleanupOldBackups();
      
      this.isInitialized = true;
      logger.info('Database Backup Service initialized successfully');
      
    } catch (error) {
      logger.error('Failed to initialize Database Backup Service:', error);
      throw error;
    }
  }

  /**
   * Create full database backup
   */
  async createBackup(type = 'manual', options = {}) {
    const backupId = this.generateBackupId(type);
    const backupPath = path.join(this.backupDir, `${backupId}.backup`);
    const metadataPath = path.join(this.backupDir, `${backupId}.metadata.json`);
    
    const startTime = Date.now();
    logger.info(`Starting ${type} database backup: ${backupId}`);
    
    try {
      // Create backup metadata
      const metadata = {
        backupId,
        type,
        timestamp: new Date().toISOString(),
        database: this.config.database.database,
        format: this.config.backup.format,
        compression: this.config.backup.compression,
        status: 'in_progress',
        startTime,
        ...options
      };
      
      await fs.writeFile(metadataPath, JSON.stringify(metadata, null, 2));
      
      // Build pg_dump command
      const dumpCommand = this.buildDumpCommand(backupPath);
      
      // Execute backup
      const backupProcess = await this.executeDump(dumpCommand);
      
      // Compress if enabled
      let finalPath = backupPath;
      if (this.config.backup.compression) {
        finalPath = await this.compressBackup(backupPath);
        await fs.unlink(backupPath); // Remove uncompressed file
      }
      
      // Get file stats
      const stats = await fs.stat(finalPath);
      const endTime = Date.now();
      const duration = endTime - startTime;
      
      // Update metadata
      metadata.status = 'completed';
      metadata.endTime = endTime;
      metadata.duration = duration;
      metadata.fileSize = stats.size;
      metadata.filePath = finalPath;
      metadata.checksum = await this.calculateChecksum(finalPath);
      
      await fs.writeFile(metadataPath, JSON.stringify(metadata, null, 2));
      
      // Validate backup if enabled
      if (this.config.validation.enabled) {
        await this.validateBackup(finalPath, metadata);
      }
      
      logger.info(`Database backup completed: ${backupId}`, {
        duration: `${duration}ms`,
        size: `${(stats.size / 1024 / 1024).toFixed(2)}MB`,
        path: finalPath
      });
      
      return {
        success: true,
        backupId,
        metadata,
        path: finalPath,
        duration,
        size: stats.size
      };
      
    } catch (error) {
      logger.error(`Database backup failed: ${backupId}`, error);
      
      // Update metadata with error
      try {
        const metadata = JSON.parse(await fs.readFile(metadataPath, 'utf8'));
        metadata.status = 'failed';
        metadata.error = error.message;
        metadata.endTime = Date.now();
        await fs.writeFile(metadataPath, JSON.stringify(metadata, null, 2));
      } catch (metaError) {
        logger.error('Failed to update backup metadata:', metaError);
      }
      
      throw error;
    }
  }

  /**
   * Restore database from backup
   */
  async restoreBackup(backupId, options = {}) {
    logger.info(`Starting database restore from backup: ${backupId}`);
    
    try {
      // Find backup files
      const backupPath = await this.findBackupFile(backupId);
      const metadataPath = path.join(this.backupDir, `${backupId}.metadata.json`);
      
      if (!backupPath) {
        throw new Error(`Backup file not found for ID: ${backupId}`);
      }
      
      // Load metadata
      const metadata = JSON.parse(await fs.readFile(metadataPath, 'utf8'));
      
      if (metadata.status !== 'completed') {
        throw new Error(`Cannot restore from incomplete backup: ${metadata.status}`);
      }
      
      // Validate backup before restore
      if (this.config.validation.checksumVerification) {
        await this.validateBackupChecksum(backupPath, metadata.checksum);
      }
      
      // Decompress if necessary
      let restorePath = backupPath;
      if (backupPath.endsWith('.gz')) {
        restorePath = await this.decompressBackup(backupPath);
      }
      
      // Build pg_restore command
      const restoreCommand = this.buildRestoreCommand(restorePath, options);
      
      // Execute restore
      await this.executeRestore(restoreCommand);
      
      // Clean up decompressed file if created
      if (restorePath !== backupPath) {
        await fs.unlink(restorePath);
      }
      
      logger.info(`Database restore completed successfully from backup: ${backupId}`);
      
      return {
        success: true,
        backupId,
        restoredFrom: backupPath,
        metadata
      };
      
    } catch (error) {
      logger.error(`Database restore failed for backup: ${backupId}`, error);
      throw error;
    }
  }

  /**
   * List available backups
   */
  async listBackups(filters = {}) {
    try {
      const files = await fs.readdir(this.backupDir);
      const metadataFiles = files.filter(f => f.endsWith('.metadata.json'));
      
      const backups = [];
      
      for (const metaFile of metadataFiles) {
        try {
          const metadata = JSON.parse(
            await fs.readFile(path.join(this.backupDir, metaFile), 'utf8')
          );
          
          // Apply filters
          if (filters.type && metadata.type !== filters.type) continue;
          if (filters.status && metadata.status !== filters.status) continue;
          if (filters.since && new Date(metadata.timestamp) < new Date(filters.since)) continue;
          if (filters.until && new Date(metadata.timestamp) > new Date(filters.until)) continue;
          
          backups.push(metadata);
        } catch (error) {
          logger.warn(`Failed to read backup metadata: ${metaFile}`, error);
        }
      }
      
      // Sort by timestamp (newest first)
      backups.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
      
      return backups;
      
    } catch (error) {
      logger.error('Failed to list backups:', error);
      throw error;
    }
  }

  /**
   * Delete backup and its metadata
   */
  async deleteBackup(backupId) {
    try {
      logger.info(`Deleting backup: ${backupId}`);
      
      const backupPath = await this.findBackupFile(backupId);
      const metadataPath = path.join(this.backupDir, `${backupId}.metadata.json`);
      
      if (backupPath) {
        await fs.unlink(backupPath);
      }
      
      try {
        await fs.unlink(metadataPath);
      } catch (error) {
        // Metadata file might not exist
      }
      
      logger.info(`Backup deleted successfully: ${backupId}`);
      
    } catch (error) {
      logger.error(`Failed to delete backup: ${backupId}`, error);
      throw error;
    }
  }

  /**
   * Clean up old backups based on retention policy
   */
  async cleanupOldBackups() {
    try {
      logger.info('Starting backup cleanup...');
      
      const backups = await this.listBackups();
      const now = new Date();
      
      // Group backups by type
      const backupsByType = {
        hourly: [],
        daily: [],
        weekly: [],
        monthly: [],
        manual: []
      };
      
      backups.forEach(backup => {
        const type = backup.type || 'manual';
        if (backupsByType[type]) {
          backupsByType[type].push(backup);
        }
      });
      
      let deletedCount = 0;
      
      // Apply retention policies
      for (const [type, typeBackups] of Object.entries(backupsByType)) {
        const retentionLimit = this.config.retention[type];
        
        if (retentionLimit && typeBackups.length > retentionLimit) {
          // Sort by timestamp (oldest first for deletion)
          typeBackups.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
          
          const toDelete = typeBackups.slice(0, typeBackups.length - retentionLimit);
          
          for (const backup of toDelete) {
            try {
              await this.deleteBackup(backup.backupId);
              deletedCount++;
            } catch (error) {
              logger.warn(`Failed to delete old backup: ${backup.backupId}`, error);
            }
          }
        }
      }
      
      logger.info(`Backup cleanup completed. Deleted ${deletedCount} old backups`);
      
    } catch (error) {
      logger.error('Backup cleanup failed:', error);
    }
  }

  /**
   * Schedule automated backup jobs
   */
  async scheduleBackupJobs() {
    logger.info('Scheduling automated backup jobs...');
    
    // Schedule hourly backups
    if (this.config.schedules.hourly) {
      const hourlyJob = cron.schedule(this.config.schedules.hourly, async () => {
        try {
          await this.createBackup('hourly');
        } catch (error) {
          logger.error('Scheduled hourly backup failed:', error);
        }
      }, { scheduled: false });
      
      this.backupJobs.set('hourly', hourlyJob);
    }
    
    // Schedule daily backups
    if (this.config.schedules.daily) {
      const dailyJob = cron.schedule(this.config.schedules.daily, async () => {
        try {
          await this.createBackup('daily');
        } catch (error) {
          logger.error('Scheduled daily backup failed:', error);
        }
      }, { scheduled: false });
      
      this.backupJobs.set('daily', dailyJob);
    }
    
    // Schedule weekly backups
    if (this.config.schedules.weekly) {
      const weeklyJob = cron.schedule(this.config.schedules.weekly, async () => {
        try {
          await this.createBackup('weekly');
        } catch (error) {
          logger.error('Scheduled weekly backup failed:', error);
        }
      }, { scheduled: false });
      
      this.backupJobs.set('weekly', weeklyJob);
    }
    
    // Schedule monthly backups
    if (this.config.schedules.monthly) {
      const monthlyJob = cron.schedule(this.config.schedules.monthly, async () => {
        try {
          await this.createBackup('monthly');
        } catch (error) {
          logger.error('Scheduled monthly backup failed:', error);
        }
      }, { scheduled: false });
      
      this.backupJobs.set('monthly', monthlyJob);
    }
    
    // Schedule cleanup job (daily at 1 AM)
    const cleanupJob = cron.schedule('0 1 * * *', async () => {
      try {
        await this.cleanupOldBackups();
      } catch (error) {
        logger.error('Scheduled cleanup failed:', error);
      }
    }, { scheduled: false });
    
    this.backupJobs.set('cleanup', cleanupJob);
    
    logger.info(`Scheduled ${this.backupJobs.size} backup jobs`);
  }

  /**
   * Start all scheduled backup jobs
   */
  startScheduledBackups() {
    if (!this.isInitialized) {
      throw new Error('Backup service not initialized');
    }
    
    logger.info('Starting scheduled backup jobs...');
    
    for (const [name, job] of this.backupJobs) {
      job.start();
      logger.info(`Started scheduled job: ${name}`);
    }
    
    logger.info(`Started ${this.backupJobs.size} scheduled backup jobs`);
  }

  /**
   * Stop all scheduled backup jobs
   */
  stopScheduledBackups() {
    logger.info('Stopping scheduled backup jobs...');
    
    for (const [name, job] of this.backupJobs) {
      job.stop();
      logger.info(`Stopped scheduled job: ${name}`);
    }
    
    logger.info('All scheduled backup jobs stopped');
  }

  /**
   * Get backup service status and statistics
   */
  async getBackupStatus() {
    try {
      const backups = await this.listBackups();
      const completedBackups = backups.filter(b => b.status === 'completed');
      const failedBackups = backups.filter(b => b.status === 'failed');
      
      // Calculate total storage used
      let totalSize = 0;
      for (const backup of completedBackups) {
        if (backup.fileSize) {
          totalSize += backup.fileSize;
        }
      }
      
      // Get latest backup by type
      const latestBackups = {};
      for (const backup of backups) {
        const type = backup.type || 'manual';
        if (!latestBackups[type] || new Date(backup.timestamp) > new Date(latestBackups[type].timestamp)) {
          latestBackups[type] = backup;
        }
      }
      
      return {
        status: this.isInitialized ? 'active' : 'inactive',
        scheduledJobs: Array.from(this.backupJobs.keys()),
        backupDirectory: this.backupDir,
        statistics: {
          totalBackups: backups.length,
          completedBackups: completedBackups.length,
          failedBackups: failedBackups.length,
          totalStorageUsed: totalSize,
          totalStorageUsedMB: (totalSize / 1024 / 1024).toFixed(2)
        },
        latestBackups,
        retentionPolicy: this.config.retention,
        configuration: {
          compression: this.config.backup.compression,
          validation: this.config.validation.enabled,
          excludeTables: this.config.backup.excludeTables
        }
      };
      
    } catch (error) {
      logger.error('Failed to get backup status:', error);
      throw error;
    }
  }

  // Helper methods
  
  async ensureBackupDirectory() {
    try {
      await fs.access(this.backupDir);
    } catch {
      await fs.mkdir(this.backupDir, { recursive: true });
      logger.info(`Created backup directory: ${this.backupDir}`);
    }
  }

  async validateConfiguration() {
    // Validate database connection
    if (!this.config.database.host || !this.config.database.database) {
      throw new Error('Database configuration is incomplete');
    }
    
    // Check if pg_dump is available
    try {
      execSync('pg_dump --version', { stdio: 'ignore' });
    } catch {
      throw new Error('pg_dump is not available. Please install PostgreSQL client tools.');
    }
    
    logger.info('Backup configuration validated successfully');
  }

  generateBackupId(type) {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    return `${type}_${timestamp}_${Math.random().toString(36).substr(2, 6)}`;
  }

  buildDumpCommand(outputPath) {
    const { database: db } = this.config.database;
    const { backup } = this.config;
    
    let command = ['pg_dump'];
    
    // Connection parameters
    command.push(`--host=${db.host}`);
    command.push(`--port=${db.port}`);
    command.push(`--username=${db.username}`);
    command.push(`--dbname=${db.database}`);
    
    // Backup options
    if (backup.format !== 'plain') {
      command.push(`--format=${backup.format}`);
    }
    
    if (backup.verbose) {
      command.push('--verbose');
    }
    
    if (backup.createDatabase) {
      command.push('--create');
    }
    
    if (backup.includeBlobs) {
      command.push('--blobs');
    }
    
    // Exclude tables
    for (const table of backup.excludeTables) {
      command.push(`--exclude-table=${table}`);
    }
    
    // Output file
    command.push(`--file=${outputPath}`);
    
    return command.join(' ');
  }

  async executeDump(command) {
    return new Promise((resolve, reject) => {
      const env = { ...process.env, PGPASSWORD: this.config.database.password };
      
      const child = spawn('sh', ['-c', command], {
        env,
        stdio: ['ignore', 'pipe', 'pipe']
      });
      
      let stdout = '';
      let stderr = '';
      
      child.stdout.on('data', (data) => {
        stdout += data.toString();
      });
      
      child.stderr.on('data', (data) => {
        stderr += data.toString();
      });
      
      child.on('close', (code) => {
        if (code === 0) {
          resolve({ stdout, stderr });
        } else {
          reject(new Error(`pg_dump failed with code ${code}: ${stderr}`));
        }
      });
      
      child.on('error', reject);
    });
  }

  async compressBackup(filePath) {
    const compressedPath = `${filePath}.gz`;
    
    return new Promise((resolve, reject) => {
      const readStream = createReadStream(filePath);
      const writeStream = createWriteStream(compressedPath);
      const gzipStream = createGzip({ level: 6 });
      
      readStream
        .pipe(gzipStream)
        .pipe(writeStream)
        .on('finish', () => resolve(compressedPath))
        .on('error', reject);
    });
  }

  async calculateChecksum(filePath) {
    const crypto = require('crypto');
    const hash = crypto.createHash('sha256');
    
    return new Promise((resolve, reject) => {
      const stream = createReadStream(filePath);
      
      stream.on('data', (data) => hash.update(data));
      stream.on('end', () => resolve(hash.digest('hex')));
      stream.on('error', reject);
    });
  }

  async validateBackup(filePath, metadata) {
    // Verify file exists and has content
    const stats = await fs.stat(filePath);
    if (stats.size === 0) {
      throw new Error('Backup file is empty');
    }
    
    // Verify checksum matches
    if (metadata.checksum) {
      const actualChecksum = await this.calculateChecksum(filePath);
      if (actualChecksum !== metadata.checksum) {
        throw new Error('Backup checksum validation failed');
      }
    }
    
    logger.info(`Backup validation passed: ${metadata.backupId}`);
  }

  async findBackupFile(backupId) {
    const files = await fs.readdir(this.backupDir);
    
    // Look for backup file (with or without .gz extension)
    const possibleNames = [
      `${backupId}.backup`,
      `${backupId}.backup.gz`,
      `${backupId}.sql`,
      `${backupId}.sql.gz`
    ];
    
    for (const name of possibleNames) {
      if (files.includes(name)) {
        return path.join(this.backupDir, name);
      }
    }
    
    return null;
  }

  buildRestoreCommand(backupPath, options = {}) {
    const { database: db } = this.config.database;
    
    let command = ['pg_restore'];
    
    // Connection parameters
    command.push(`--host=${db.host}`);
    command.push(`--port=${db.port}`);
    command.push(`--username=${db.username}`);
    command.push(`--dbname=${options.targetDatabase || db.database}`);
    
    // Restore options
    if (options.clean) {
      command.push('--clean');
    }
    
    if (options.createDatabase) {
      command.push('--create');
    }
    
    command.push('--verbose');
    command.push('--exit-on-error');
    
    // Backup file
    command.push(backupPath);
    
    return command.join(' ');
  }

  async executeRestore(command) {
    return new Promise((resolve, reject) => {
      const env = { ...process.env, PGPASSWORD: this.config.database.password };
      
      const child = spawn('sh', ['-c', command], {
        env,
        stdio: ['ignore', 'pipe', 'pipe']
      });
      
      let stdout = '';
      let stderr = '';
      
      child.stdout.on('data', (data) => {
        stdout += data.toString();
      });
      
      child.stderr.on('data', (data) => {
        stderr += data.toString();
      });
      
      child.on('close', (code) => {
        if (code === 0) {
          resolve({ stdout, stderr });
        } else {
          reject(new Error(`pg_restore failed with code ${code}: ${stderr}`));
        }
      });
      
      child.on('error', reject);
    });
  }

  async decompressBackup(compressedPath) {
    const { createGunzip } = require('zlib');
    const decompressedPath = compressedPath.replace('.gz', '');
    
    return new Promise((resolve, reject) => {
      const readStream = createReadStream(compressedPath);
      const writeStream = createWriteStream(decompressedPath);
      const gunzipStream = createGunzip();
      
      readStream
        .pipe(gunzipStream)
        .pipe(writeStream)
        .on('finish', () => resolve(decompressedPath))
        .on('error', reject);
    });
  }

  async validateBackupChecksum(filePath, expectedChecksum) {
    const actualChecksum = await this.calculateChecksum(filePath);
    
    if (actualChecksum !== expectedChecksum) {
      throw new Error(`Backup checksum mismatch. Expected: ${expectedChecksum}, Actual: ${actualChecksum}`);
    }
    
    logger.info('Backup checksum validation passed');
  }
}

module.exports = { DatabaseBackupService };