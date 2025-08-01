#!/usr/bin/env node

/**
 * SQL Security Migration Script
 * Applies security fixes for SQL injection vulnerabilities
 */

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const { logger } = require('../utils/logger');

class SQLSecurityMigration {
  constructor() {
    this.supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );
    
    this.migrationFiles = [
      'secure_sql_functions.sql',
      'deprecate_vulnerable_functions.sql'
    ];
  }

  async runMigration() {
    logger.info('🔒 Starting SQL Security Migration');
    console.log('=' .repeat(60));

    try {
      // 1. Backup existing functions
      await this.backupExistingFunctions();

      // 2. Apply security migrations
      for (const file of this.migrationFiles) {
        await this.applyMigrationFile(file);
      }

      // 3. Migrate existing data
      await this.migrateExistingData();

      // 4. Run security audit
      await this.runSecurityAudit();

      // 5. Test secure functions
      await this.testSecureFunctions();

      logger.info('✅ SQL Security Migration completed successfully');
      
    } catch (error) {
      logger.error('❌ SQL Security Migration failed:', error);
      throw error;
    }
  }

  async backupExistingFunctions() {
    logger.info('📦 Backing up existing functions...');

    const functions = [
      'send_templated_email_notification',
      'trigger_booking_automation', 
      'trigger_user_behavior_email'
    ];

    for (const funcName of functions) {
      try {
        const { data, error } = await this.supabase.rpc('pg_get_functiondef', {
          funcid: `${funcName}(text,jsonb,text)`
        });

        if (!error && data) {
          const backupPath = path.join(__dirname, '..', 'backups', `${funcName}_backup.sql`);
          fs.mkdirSync(path.dirname(backupPath), { recursive: true });
          fs.writeFileSync(backupPath, data);
          logger.info(`  ✓ Backed up ${funcName}`);
        }
      } catch (err) {
        logger.warn(`  ⚠️ Could not backup ${funcName}:`, err.message);
      }
    }
  }

  async applyMigrationFile(fileName) {
    logger.info(`📄 Applying migration: ${fileName}`);

    const filePath = path.join(__dirname, '..', 'migrations', fileName);
    
    if (!fs.existsSync(filePath)) {
      throw new Error(`Migration file not found: ${fileName}`);
    }

    const sql = fs.readFileSync(filePath, 'utf8');
    
    // Split SQL into individual statements
    const statements = sql
      .split(/;\s*(?=CREATE|DROP|INSERT|UPDATE|DELETE|ALTER|COMMENT)/i)
      .filter(stmt => stmt.trim().length > 0)
      .map(stmt => stmt.trim());

    let successCount = 0;
    let errorCount = 0;

    for (const [index, statement] of statements.entries()) {
      try {
        const { error } = await this.supabase.rpc('exec_sql', {
          sql_query: statement
        });

        if (error) {
          logger.error(`  ❌ Statement ${index + 1} failed:`, error.message);
          errorCount++;
        } else {
          logger.info(`  ✓ Statement ${index + 1} executed successfully`);
          successCount++;
        }
      } catch (err) {
        logger.error(`  ❌ Statement ${index + 1} error:`, err.message);
        errorCount++;
      }
    }

    logger.info(`  📊 Migration ${fileName}: ${successCount} success, ${errorCount} errors`);
    
    if (errorCount > 0) {
      throw new Error(`Migration ${fileName} had ${errorCount} errors`);
    }
  }

  async migrateExistingData() {
    logger.info('🔄 Migrating existing email data...');

    try {
      const { data, error } = await this.supabase.rpc('migrate_existing_email_data');

      if (error) {
        throw error;
      }

      logger.info(`  ✓ Processed ${data.processed_count} email records`);
      if (data.error_count > 0) {
        logger.warn(`  ⚠️ ${data.error_count} records had errors`);
      }

    } catch (error) {
      logger.error('  ❌ Data migration failed:', error);
      throw error;
    }
  }

  async runSecurityAudit() {
    logger.info('🔍 Running security audit on email content...');

    try {
      // Get recent email notifications for audit
      const { data: emails, error } = await this.supabase
        .from('email_notifications')
        .select('id, body, notification_type, created_at')
        .gt('created_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()) // Last 7 days
        .limit(100);

      if (error) {
        throw error;
      }

      let riskySamples = 0;
      let totalSamples = emails.length;

      for (const email of emails) {
        const { data: auditResult, error: auditError } = await this.supabase.rpc('audit_email_security', {
          email_content: email.body
        });

        if (!auditError && auditResult) {
          if (auditResult.risk_level === 'high' || auditResult.risk_level === 'critical') {
            riskySamples++;
            logger.warn(`  ⚠️ High-risk email found: ${email.id} (${auditResult.risk_level})`);
          }
        }
      }

      logger.info(`  📊 Security audit: ${totalSamples} emails scanned, ${riskySamples} high-risk found`);

    } catch (error) {
      logger.error('  ❌ Security audit failed:', error);
      throw error;
    }
  }

  async testSecureFunctions() {
    logger.info('🧪 Testing secure functions...');

    const tests = [
      {
        name: 'HTML Escaping',
        test: async () => {
          const { data, error } = await this.supabase.rpc('html_escape', {
            input_text: '<script>alert("xss")</script>'
          });
          
          if (error) throw error;
          if (data.includes('<script>')) {
            throw new Error('HTML escaping failed');
          }
          return 'HTML properly escaped';
        }
      },
      {
        name: 'Email Validation',
        test: async () => {
          const { data: valid } = await this.supabase.rpc('is_valid_email', {
            email_text: 'test@example.com'
          });
          
          const { data: invalid } = await this.supabase.rpc('is_valid_email', {
            email_text: 'invalid-email'
          });
          
          if (!valid || invalid) {
            throw new Error('Email validation failed');
          }
          return 'Email validation working';
        }
      },
      {
        name: 'Safe Template Rendering',
        test: async () => {
          const { data, error } = await this.supabase.rpc('safe_template_render', {
            template_text: 'Hello {{name}}, your id is {{id}}',
            data_object: {
              name: '<script>alert("xss")</script>',
              id: 'test-123',
              invalid_key: 'should_be_ignored'
            }
          });
          
          if (error) throw error;
          if (data.includes('<script>')) {
            throw new Error('Template rendering not safe');
          }
          return 'Template rendering secure';
        }
      },
      {
        name: 'Secure Email Notification',
        test: async () => {
          const { data, error } = await this.supabase.rpc('send_secure_email_notification', {
            p_email_type: 'booking_confirmation',
            p_to_email: 'test@example.com',
            p_booking_id: null,
            p_user_id: null,
            p_additional_data: {
              test_data: '<script>alert("test")</script>'
            }
          });
          
          if (error) throw error;
          if (!data.success) {
            throw new Error(data.error || 'Secure email function failed');
          }
          return 'Secure email function working';
        }
      }
    ];

    let passedTests = 0;
    let failedTests = 0;

    for (const test of tests) {
      try {
        const result = await test.test();
        logger.info(`  ✓ ${test.name}: ${result}`);
        passedTests++;
      } catch (error) {
        logger.error(`  ❌ ${test.name}: ${error.message}`);
        failedTests++;
      }
    }

    logger.info(`  📊 Tests: ${passedTests} passed, ${failedTests} failed`);

    if (failedTests > 0) {
      throw new Error(`${failedTests} security tests failed`);
    }
  }

  async rollback() {
    logger.info('🔄 Rolling back SQL security migration...');

    const backupDir = path.join(__dirname, '..', 'backups');
    if (!fs.existsSync(backupDir)) {
      throw new Error('No backups found for rollback');
    }

    const backupFiles = fs.readdirSync(backupDir).filter(f => f.endsWith('_backup.sql'));

    for (const backupFile of backupFiles) {
      try {
        const sql = fs.readFileSync(path.join(backupDir, backupFile), 'utf8');
        const { error } = await this.supabase.rpc('exec_sql', { sql_query: sql });
        
        if (error) {
          logger.error(`  ❌ Failed to restore ${backupFile}:`, error);
        } else {
          logger.info(`  ✓ Restored ${backupFile}`);
        }
      } catch (err) {
        logger.error(`  ❌ Error restoring ${backupFile}:`, err.message);
      }
    }
  }
}

// CLI interface
async function main() {
  const args = process.argv.slice(2);
  const migration = new SQLSecurityMigration();

  try {
    if (args.includes('--rollback')) {
      await migration.rollback();
    } else if (args.includes('--test-only')) {
      await migration.testSecureFunctions();
    } else if (args.includes('--audit-only')) {
      await migration.runSecurityAudit();
    } else {
      await migration.runMigration();
    }

    console.log('\n🎉 Operation completed successfully!');
    process.exit(0);

  } catch (error) {
    console.error('\n💥 Operation failed:', error.message);
    logger.error('Migration failed:', error);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

module.exports = { SQLSecurityMigration };