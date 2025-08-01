#!/usr/bin/env node

const { DatabaseBackupService } = require('../services/database-backup-service');
const { logger } = require('../utils/logger');

/**
 * Backup Service Initialization Script
 * Initializes and configures the database backup service
 */

async function initializeBackupService() {
  try {
    logger.info('🔄 Initializing Database Backup Service...');
    
    const backupService = new DatabaseBackupService();
    
    // Initialize the service
    await backupService.initialize();
    
    // Create an initial manual backup
    logger.info('📦 Creating initial backup...');
    const initialBackup = await backupService.createBackup('initial', {
      description: 'Initial backup created during service setup',
      version: '1.0.0'
    });
    
    logger.info('✅ Initial backup created:', {
      backupId: initialBackup.backupId,
      size: `${(initialBackup.size / 1024 / 1024).toFixed(2)}MB`,
      duration: `${initialBackup.duration}ms`
    });
    
    // Start scheduled backup jobs
    logger.info('⏰ Starting scheduled backup jobs...');
    backupService.startScheduledBackups();
    
    // Get service status
    const status = await backupService.getBackupStatus();
    
    logger.info('📊 Backup Service Status:', {
      status: status.status,
      scheduledJobs: status.scheduledJobs,
      totalBackups: status.statistics.totalBackups,
      storageUsed: `${status.statistics.totalStorageUsedMB}MB`
    });
    
    logger.info('🎉 Database Backup Service initialized successfully!');
    
    // Keep the process running for scheduled jobs
    logger.info('🔄 Backup service is now running. Press Ctrl+C to stop.');
    
    // Graceful shutdown handling
    process.on('SIGINT', () => {
      logger.info('🛑 Stopping backup service...');
      backupService.stopScheduledBackups();
      process.exit(0);
    });
    
    process.on('SIGTERM', () => {
      logger.info('🛑 Stopping backup service...');
      backupService.stopScheduledBackups();
      process.exit(0);
    });
    
  } catch (error) {
    logger.error('❌ Failed to initialize backup service:', error);
    process.exit(1);
  }
}

// CLI interface
if (require.main === module) {
  const command = process.argv[2];
  
  switch (command) {
    case 'init':
    case 'start':
      initializeBackupService();
      break;
      
    case 'status':
      (async () => {
        try {
          const backupService = new DatabaseBackupService();
          await backupService.initialize();
          const status = await backupService.getBackupStatus();
          
          console.log('\n📊 Backup Service Status:');
          console.log('========================');
          console.log(`Status: ${status.status}`);
          console.log(`Scheduled Jobs: ${status.scheduledJobs.join(', ')}`);
          console.log(`Total Backups: ${status.statistics.totalBackups}`);
          console.log(`Completed: ${status.statistics.completedBackups}`);
          console.log(`Failed: ${status.statistics.failedBackups}`);
          console.log(`Storage Used: ${status.statistics.totalStorageUsedMB} MB`);
          console.log(`Backup Directory: ${status.backupDirectory}`);
          
          if (Object.keys(status.latestBackups).length > 0) {
            console.log('\n📅 Latest Backups by Type:');
            for (const [type, backup] of Object.entries(status.latestBackups)) {
              console.log(`  ${type}: ${backup.backupId} (${backup.timestamp})`);
            }
          }
          
          console.log('\n⚙️  Configuration:');
          console.log(`  Compression: ${status.configuration.compression ? 'Enabled' : 'Disabled'}`);
          console.log(`  Validation: ${status.configuration.validation ? 'Enabled' : 'Disabled'}`);
          console.log(`  Excluded Tables: ${status.configuration.excludeTables.join(', ')}`);
          
          console.log('\n📋 Retention Policy:');
          for (const [type, count] of Object.entries(status.retentionPolicy)) {
            console.log(`  ${type}: Keep ${count} backups`);
          }
          
        } catch (error) {
          console.error('Failed to get backup status:', error.message);
          process.exit(1);
        }
      })();
      break;
      
    case 'create':
      (async () => {
        try {
          const backupType = process.argv[3] || 'manual';
          const description = process.argv[4] || 'Manual backup created via CLI';
          
          const backupService = new DatabaseBackupService();
          await backupService.initialize();
          
          console.log(`🔄 Creating ${backupType} backup...`);
          
          const result = await backupService.createBackup(backupType, { description });
          
          console.log('✅ Backup created successfully:');
          console.log(`  Backup ID: ${result.backupId}`);
          console.log(`  Size: ${(result.size / 1024 / 1024).toFixed(2)} MB`);
          console.log(`  Duration: ${result.duration} ms`);
          console.log(`  Path: ${result.path}`);
          
        } catch (error) {
          console.error('Failed to create backup:', error.message);
          process.exit(1);
        }
      })();
      break;
      
    case 'list':
      (async () => {
        try {
          const backupService = new DatabaseBackupService();
          await backupService.initialize();
          
          const backups = await backupService.listBackups();
          
          if (backups.length === 0) {
            console.log('📋 No backups found.');
            return;
          }
          
          console.log(`\n📋 Found ${backups.length} backups:\n`);
          
          for (const backup of backups) {
            const size = backup.fileSize ? `${(backup.fileSize / 1024 / 1024).toFixed(2)} MB` : 'Unknown';
            const duration = backup.duration ? `${backup.duration}ms` : 'Unknown';
            
            console.log(`📦 ${backup.backupId}`);
            console.log(`   Type: ${backup.type || 'manual'}`);
            console.log(`   Status: ${backup.status}`);
            console.log(`   Date: ${backup.timestamp}`);
            console.log(`   Size: ${size}`);
            console.log(`   Duration: ${duration}`);
            if (backup.description) {
              console.log(`   Description: ${backup.description}`);
            }
            console.log('');
          }
          
        } catch (error) {
          console.error('Failed to list backups:', error.message);
          process.exit(1);
        }
      })();
      break;
      
    case 'cleanup':
      (async () => {
        try {
          const backupService = new DatabaseBackupService();
          await backupService.initialize();
          
          console.log('🧹 Running backup cleanup...');
          await backupService.cleanupOldBackups();
          console.log('✅ Cleanup completed successfully');
          
        } catch (error) {
          console.error('Failed to cleanup backups:', error.message);
          process.exit(1);
        }
      })();
      break;
      
    default:
      console.log(`
📦 Database Backup Service CLI

Usage: node init-backup-service.js <command>

Commands:
  init      - Initialize and start the backup service
  start     - Same as init (start the backup service)
  status    - Show backup service status and statistics
  create    - Create a manual backup
            Usage: create [type] [description]
            Example: create manual "Pre-deployment backup"
  list      - List all available backups
  cleanup   - Run backup cleanup based on retention policy

Examples:
  node init-backup-service.js init
  node init-backup-service.js status
  node init-backup-service.js create manual "Before major update"
  node init-backup-service.js list
  node init-backup-service.js cleanup
`);
  }
}

module.exports = { initializeBackupService };