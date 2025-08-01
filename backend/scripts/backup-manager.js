#!/usr/bin/env node

const { spawn } = require('child_process');
const fs = require('fs').promises;
const path = require('path');
const { supabase, supabaseAdmin } = require('../config/supabase');
require('dotenv').config();

/**
 * Backup Manager
 * Handles database backups, file backups, and recovery procedures
 */

class BackupManager {
  constructor() {
    this.backupDir = process.env.BACKUP_DIR || './backups';
    this.maxBackups = parseInt(process.env.MAX_BACKUPS) || 30;
    this.maxAge = parseInt(process.env.BACKUP_MAX_AGE_DAYS) || 30;
    
    this.ensureBackupDirectory();
  }

  async ensureBackupDirectory() {
    try {
      await fs.mkdir(this.backupDir, { recursive: true });
      console.log(`📁 Backup directory ready: ${this.backupDir}`);
    } catch (error) {
      console.error('Failed to create backup directory:', error);
    }
  }

  // Generate backup filename with timestamp
  generateBackupFilename(type = 'full') {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    return `backup-${type}-${timestamp}.sql`;
  }

  // Database backup using Supabase
  async createDatabaseBackup() {
    try {
      console.log('🔄 Creating database backup...');
      
      const timestamp = new Date().toISOString();
      const filename = this.generateBackupFilename('database');
      const backupPath = path.join(this.backupDir, filename);

      // Get all data from critical tables
      const backupData = {
        timestamp,
        version: '2.0',
        tables: {}
      };

      // Backup users
      try {
        const { data: users } = await supabaseAdmin.from('users').select('*');
        backupData.tables.users = users || [];
      } catch (error) {
        console.log('Users table not found, using fallback structure');
        backupData.tables.users = [];
      }

      // Backup celebrities
      try {
        const { data: celebrities } = await supabaseAdmin.from('celebrities').select('*');
        backupData.tables.celebrities = celebrities || [];
      } catch (error) {
        console.log('Celebrities table not found, using fallback structure');
        backupData.tables.celebrities = [];
      }

      // Backup bookings
      try {
        const { data: bookings } = await supabaseAdmin.from('bookings').select('*');
        backupData.tables.bookings = bookings || [];
      } catch (error) {
        console.log('Bookings table not found, using fallback structure');
        backupData.tables.bookings = [];
      }

      // Backup email templates
      try {
        const { data: emailTemplates } = await supabaseAdmin.from('email_templates').select('*');
        backupData.tables.email_templates = emailTemplates || [];
      } catch (error) {
        console.log('Email templates table not found, using fallback structure');
        backupData.tables.email_templates = [];
      }

      // Backup site settings
      try {
        const { data: siteSettings } = await supabaseAdmin.from('site_settings').select('*');
        backupData.tables.site_settings = siteSettings || [];
      } catch (error) {
        console.log('Site settings table not found, using fallback structure');
        backupData.tables.site_settings = [];
      }

      // Generate SQL backup file
      const sqlContent = this.generateSQLBackup(backupData);
      await fs.writeFile(backupPath, sqlContent, 'utf8');

      // Also save as JSON for easier parsing
      const jsonPath = backupPath.replace('.sql', '.json');
      await fs.writeFile(jsonPath, JSON.stringify(backupData, null, 2), 'utf8');

      console.log(`✅ Database backup created: ${filename}`);
      console.log(`📊 Backup includes:`);
      console.log(`   - Users: ${backupData.tables.users.length} records`);
      console.log(`   - Celebrities: ${backupData.tables.celebrities.length} records`);
      console.log(`   - Bookings: ${backupData.tables.bookings.length} records`);
      console.log(`   - Email Templates: ${backupData.tables.email_templates.length} records`);
      console.log(`   - Site Settings: ${backupData.tables.site_settings.length} records`);

      return { filename, path: backupPath, data: backupData };
    } catch (error) {
      console.error('❌ Database backup failed:', error);
      throw error;
    }
  }

  // Generate SQL from backup data
  generateSQLBackup(backupData) {
    let sql = `-- Celebrity Booking Platform Database Backup\n`;
    sql += `-- Created: ${backupData.timestamp}\n`;
    sql += `-- Version: ${backupData.version}\n\n`;

    sql += `-- Disable foreign key checks during restore\n`;
    sql += `SET session_replication_role = replica;\n\n`;

    // Generate INSERT statements for each table
    for (const [tableName, records] of Object.entries(backupData.tables)) {
      if (!records || records.length === 0) continue;

      sql += `-- Backup for table: ${tableName}\n`;
      sql += `DELETE FROM ${tableName};\n`;

      if (records.length > 0) {
        const columns = Object.keys(records[0]);
        sql += `INSERT INTO ${tableName} (${columns.join(', ')}) VALUES\n`;

        const values = records.map(record => {
          const vals = columns.map(col => {
            const val = record[col];
            if (val === null || val === undefined) return 'NULL';
            if (typeof val === 'string') return `'${val.replace(/'/g, "''")}'`;
            if (typeof val === 'boolean') return val ? 'TRUE' : 'FALSE';
            if (typeof val === 'object') return `'${JSON.stringify(val).replace(/'/g, "''")}'`;
            return val;
          });
          return `  (${vals.join(', ')})`;
        });

        sql += values.join(',\n') + ';\n\n';
      }
    }

    sql += `-- Re-enable foreign key checks\n`;
    sql += `SET session_replication_role = DEFAULT;\n`;

    return sql;
  }

  // File system backup (for uploads)
  async createFileBackup() {
    try {
      console.log('🔄 Creating file backup...');
      
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const filename = `backup-files-${timestamp}.tar.gz`;
      const backupPath = path.join(this.backupDir, filename);

      const uploadsDir = path.join(__dirname, '../uploads');
      
      // Check if uploads directory exists
      try {
        await fs.access(uploadsDir);
      } catch (error) {
        console.log('📁 No uploads directory found, skipping file backup');
        return null;
      }

      // Create tar.gz archive
      return new Promise((resolve, reject) => {
        const tar = spawn('tar', ['-czf', backupPath, '-C', path.dirname(uploadsDir), 'uploads']);
        
        tar.on('close', (code) => {
          if (code === 0) {
            console.log(`✅ File backup created: ${filename}`);
            resolve({ filename, path: backupPath });
          } else {
            reject(new Error(`tar process exited with code ${code}`));
          }
        });

        tar.on('error', reject);
      });
    } catch (error) {
      console.error('❌ File backup failed:', error);
      throw error;
    }
  }

  // Complete backup (database + files)
  async createCompleteBackup() {
    try {
      console.log('🚀 Starting complete backup...');
      
      const results = {
        timestamp: new Date().toISOString(),
        database: null,
        files: null
      };

      // Create database backup
      try {
        results.database = await this.createDatabaseBackup();
      } catch (error) {
        console.error('Database backup failed:', error);
      }

      // Create file backup
      try {
        results.files = await this.createFileBackup();
      } catch (error) {
        console.error('File backup failed:', error);
      }

      // Save backup manifest
      const manifestPath = path.join(this.backupDir, `manifest-${new Date().toISOString().replace(/[:.]/g, '-')}.json`);
      await fs.writeFile(manifestPath, JSON.stringify(results, null, 2), 'utf8');

      console.log('🎉 Complete backup finished!');
      console.log(`📝 Manifest saved: ${path.basename(manifestPath)}`);
      
      return results;
    } catch (error) {
      console.error('❌ Complete backup failed:', error);
      throw error;
    }
  }

  // Restore from backup
  async restoreFromBackup(backupFile) {
    try {
      console.log(`🔄 Restoring from backup: ${backupFile}`);
      
      const backupPath = path.join(this.backupDir, backupFile);
      
      // Check if it's a JSON backup
      if (backupFile.endsWith('.json')) {
        const backupData = JSON.parse(await fs.readFile(backupPath, 'utf8'));
        return await this.restoreFromJSON(backupData);
      }
      
      // For SQL backups, would need pg_restore or similar
      console.log('SQL backup restoration requires manual intervention');
      return false;
    } catch (error) {
      console.error('❌ Restore failed:', error);
      throw error;
    }
  }

  // Restore from JSON backup data
  async restoreFromJSON(backupData) {
    try {
      console.log('🔄 Restoring from JSON backup...');
      
      // Restore each table
      for (const [tableName, records] of Object.entries(backupData.tables)) {
        if (!records || records.length === 0) continue;
        
        console.log(`  Restoring ${tableName}: ${records.length} records`);
        
        try {
          // Insert records in batches to avoid timeouts
          const batchSize = 100;
          for (let i = 0; i < records.length; i += batchSize) {
            const batch = records.slice(i, i + batchSize);
            const { error } = await supabaseAdmin.from(tableName).insert(batch);
            
            if (error) {
              console.error(`Error inserting batch for ${tableName}:`, error);
            }
          }
        } catch (error) {
          console.error(`Failed to restore ${tableName}:`, error);
        }
      }
      
      console.log('✅ JSON backup restoration completed');
      return true;
    } catch (error) {
      console.error('❌ JSON restore failed:', error);
      throw error;
    }
  }

  // Clean old backups
  async cleanOldBackups() {
    try {
      console.log('🧹 Cleaning old backups...');
      
      const files = await fs.readdir(this.backupDir);
      const backupFiles = files.filter(f => f.startsWith('backup-'));
      
      // Sort by creation time (newest first)
      const fileStats = await Promise.all(
        backupFiles.map(async file => {
          const filePath = path.join(this.backupDir, file);
          const stats = await fs.stat(filePath);
          return { file, path: filePath, mtime: stats.mtime };
        })
      );
      
      fileStats.sort((a, b) => b.mtime - a.mtime);
      
      let deleted = 0;
      
      // Remove old backups (keep maxBackups)
      for (let i = this.maxBackups; i < fileStats.length; i++) {
        await fs.unlink(fileStats[i].path);
        console.log(`  Deleted: ${fileStats[i].file}`);
        deleted++;
      }
      
      // Remove backups older than maxAge days
      const maxAgeMs = this.maxAge * 24 * 60 * 60 * 1000;
      const cutoffDate = new Date(Date.now() - maxAgeMs);
      
      for (const fileInfo of fileStats.slice(0, this.maxBackups)) {
        if (fileInfo.mtime < cutoffDate) {
          await fs.unlink(fileInfo.path);
          console.log(`  Deleted (old): ${fileInfo.file}`);
          deleted++;
        }
      }
      
      console.log(`✅ Cleanup complete. Deleted ${deleted} old backups.`);
      return deleted;
    } catch (error) {
      console.error('❌ Cleanup failed:', error);
      throw error;
    }
  }

  // List available backups
  async listBackups() {
    try {
      const files = await fs.readdir(this.backupDir);
      const backupFiles = files.filter(f => f.startsWith('backup-'));
      
      const backups = await Promise.all(
        backupFiles.map(async file => {
          const filePath = path.join(this.backupDir, file);
          const stats = await fs.stat(filePath);
          return {
            filename: file,
            size: stats.size,
            created: stats.mtime,
            type: file.includes('database') ? 'database' : 
                  file.includes('files') ? 'files' : 'complete'
          };
        })
      );
      
      backups.sort((a, b) => b.created - a.created);
      return backups;
    } catch (error) {
      console.error('❌ Failed to list backups:', error);
      return [];
    }
  }

  // Get backup status
  async getBackupStatus() {
    try {
      const backups = await this.listBackups();
      const latestBackup = backups[0];
      
      return {
        totalBackups: backups.length,
        latestBackup: latestBackup ? {
          filename: latestBackup.filename,
          created: latestBackup.created,
          size: latestBackup.size,
          age: Math.floor((Date.now() - latestBackup.created) / (1000 * 60 * 60 * 24))
        } : null,
        backupDirectory: this.backupDir,
        maxBackups: this.maxBackups,
        maxAgeDays: this.maxAge
      };
    } catch (error) {
      console.error('❌ Failed to get backup status:', error);
      return null;
    }
  }
}

// CLI interface
async function main() {
  const backupManager = new BackupManager();
  const command = process.argv[2];
  
  try {
    switch (command) {
      case 'create':
        await backupManager.createCompleteBackup();
        break;
        
      case 'database':
        await backupManager.createDatabaseBackup();
        break;
        
      case 'files':
        await backupManager.createFileBackup();
        break;
        
      case 'restore':
        const backupFile = process.argv[3];
        if (!backupFile) {
          console.error('Please specify backup file to restore');
          process.exit(1);
        }
        await backupManager.restoreFromBackup(backupFile);
        break;
        
      case 'clean':
        await backupManager.cleanOldBackups();
        break;
        
      case 'list':
        const backups = await backupManager.listBackups();
        console.log('📋 Available backups:');
        backups.forEach(backup => {
          console.log(`  ${backup.filename} (${backup.type}, ${(backup.size/1024/1024).toFixed(2)}MB, ${backup.created.toISOString()})`);
        });
        break;
        
      case 'status':
        const status = await backupManager.getBackupStatus();
        console.log('📊 Backup Status:');
        console.log(`  Total backups: ${status.totalBackups}`);
        console.log(`  Latest backup: ${status.latestBackup ? status.latestBackup.filename + ' (' + status.latestBackup.age + ' days old)' : 'None'}`);
        console.log(`  Backup directory: ${status.backupDirectory}`);
        console.log(`  Max backups: ${status.maxBackups}`);
        console.log(`  Max age: ${status.maxAgeDays} days`);
        break;
        
      default:
        console.log('🔧 Backup Manager Commands:');
        console.log('  create     - Create complete backup (database + files)');
        console.log('  database   - Create database backup only');
        console.log('  files      - Create files backup only');
        console.log('  restore    - Restore from backup file');
        console.log('  clean      - Clean old backups');
        console.log('  list       - List available backups');
        console.log('  status     - Show backup status');
        break;
    }
  } catch (error) {
    console.error('Command failed:', error.message);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  main();
}

module.exports = BackupManager;