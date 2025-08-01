#!/usr/bin/env node

const { migrationManager } = require('./migration-manager');
const { logger } = require('../utils/logger');

/**
 * Migration CLI Runner
 * Provides command-line interface for database migrations
 */

class MigrationCLI {
  constructor() {
    this.commands = {
      migrate: this.migrate.bind(this),
      rollback: this.rollback.bind(this),
      status: this.status.bind(this),
      create: this.create.bind(this),
      fresh: this.fresh.bind(this),
      help: this.help.bind(this)
    };
  }

  async run() {
    const args = process.argv.slice(2);
    const command = args[0] || 'help';
    
    if (!this.commands[command]) {
      console.error(`Unknown command: ${command}`);
      this.help();
      process.exit(1);
    }

    try {
      await this.commands[command](args.slice(1));
    } catch (error) {
      console.error('Migration command failed:', error.message);
      logger.error('Migration CLI error:', error);
      process.exit(1);
    }
  }

  async migrate(args) {
    console.log('🚀 Starting database migration...\n');
    
    const result = await migrationManager.migrate();
    
    if (result.success) {
      console.log('✅ Migration completed successfully!');
      console.log(`📊 Batch: ${result.batchNumber}`);
      console.log(`📈 Migrations run: ${result.migrationsRun}`);
      
      if (result.results && result.results.length > 0) {
        console.log('\n📋 Migration Details:');
        result.results.forEach(r => {
          const status = r.success ? '✅' : '❌';
          const time = r.executionTime ? ` (${r.executionTime}ms)` : '';
          console.log(`  ${status} ${r.migration} - ${r.reason}${time}`);
        });
      }
    } else {
      console.log('❌ Migration failed!');
      console.log(`📈 Successful: ${result.migrationsRun}`);
      console.log(`📉 Failed: ${result.migrationsFailed}`);
      
      if (result.results) {
        console.log('\n📋 Migration Results:');
        result.results.forEach(r => {
          const status = r.success ? '✅' : '❌';
          const error = r.error ? ` - ${r.error}` : '';
          console.log(`  ${status} ${r.migration}${error}`);
        });
      }
      
      process.exit(1);
    }
  }

  async rollback(args) {
    const target = args[0];
    
    if (!target) {
      console.error('❌ Rollback target required (batch number or migration name)');
      console.log('Usage: npm run migrate:rollback <batch_number|migration_name>');
      process.exit(1);
    }

    const numericTarget = parseInt(target);
    const rollbackTarget = isNaN(numericTarget) ? target : numericTarget;
    
    console.log(`🔄 Rolling back to: ${rollbackTarget}\n`);
    
    const result = await migrationManager.rollback(rollbackTarget);
    
    if (result.success) {
      console.log('✅ Rollback completed successfully!');
      console.log(`📉 Migrations rolled back: ${result.rolledBack}`);
      
      if (result.results && result.results.length > 0) {
        console.log('\n📋 Rollback Details:');
        result.results.forEach(r => {
          const status = r.success ? '✅' : '❌';
          console.log(`  ${status} ${r.migration}`);
        });
      }
    } else {
      console.log('❌ Rollback failed!');
      console.log(`📈 Successful: ${result.rolledBack}`);
      console.log(`📉 Failed: ${result.failed}`);
      
      if (result.results) {
        console.log('\n📋 Rollback Results:');
        result.results.forEach(r => {
          const status = r.success ? '✅' : '❌';
          const error = r.error ? ` - ${r.error}` : '';
          console.log(`  ${status} ${r.migration}${error}`);
        });
      }
      
      process.exit(1);
    }
  }

  async status(args) {
    console.log('📊 Migration Status\n');
    
    const status = await migrationManager.getStatus();
    
    console.log(`📁 Total migration files: ${status.totalMigrations}`);
    console.log(`✅ Executed migrations: ${status.executedMigrations}`);
    console.log(`⏳ Pending migrations: ${status.pendingMigrations.length}`);
    console.log(`🎯 Last batch: ${status.lastBatch}`);
    console.log(`🎉 Up to date: ${status.isUpToDate ? 'Yes' : 'No'}`);
    
    if (status.pendingMigrations.length > 0) {
      console.log('\n⏳ Pending Migrations:');
      status.pendingMigrations.forEach(migration => {
        console.log(`  📄 ${migration.filename} (${migration.reason})`);
      });
      
      console.log('\n💡 Run "npm run migrate" to execute pending migrations');
    }
  }

  async create(args) {
    const name = args[0];
    const description = args.slice(1).join(' ');
    
    if (!name) {
      console.error('❌ Migration name required');
      console.log('Usage: npm run migrate:create <migration_name> [description]');
      process.exit(1);
    }

    console.log(`📝 Creating new migration: ${name}\n`);
    
    const result = await migrationManager.createMigration(name, description);
    
    console.log('✅ Migration file created!');
    console.log(`📄 File: ${result.filename}`);
    console.log(`📍 Path: ${result.path}`);
    console.log('\n💡 Edit the file to add your migration SQL');
  }

  async fresh(args) {
    console.log('🔥 Fresh migration (WARNING: This will reset the database)\n');
    
    // Confirm with user
    const readline = require('readline');
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });
    
    const confirmed = await new Promise(resolve => {
      rl.question('⚠️  This will DESTROY all data and rebuild the database. Continue? (yes/no): ', answer => {
        rl.close();
        resolve(answer.toLowerCase() === 'yes');
      });
    });
    
    if (!confirmed) {
      console.log('❌ Fresh migration cancelled');
      return;
    }
    
    console.log('🗑️  Rolling back all migrations...');
    
    try {
      // Get current status to find the earliest migration
      const status = await migrationManager.getStatus();
      
      if (status.executedMigrations > 0) {
        // Rollback all migrations by targeting batch 1
        await migrationManager.rollback(1);
        console.log('✅ All migrations rolled back');
      }
      
      console.log('🚀 Running fresh migration...');
      await this.migrate([]);
      
    } catch (error) {
      console.error('❌ Fresh migration failed:', error.message);
      throw error;
    }
  }

  help() {
    console.log(`
🔧 Database Migration CLI

Usage: npm run migrate:<command> [options]

Commands:
  migrate              Run all pending migrations
  rollback <target>    Rollback migrations to target (batch number or migration name)
  status               Show migration status
  create <name>        Create a new migration file
  fresh               Reset database and run all migrations (destructive)
  help                Show this help message

Examples:
  npm run migrate                           # Run pending migrations
  npm run migrate:rollback 5                # Rollback to batch 5
  npm run migrate:rollback 001_initial      # Rollback to specific migration
  npm run migrate:status                    # Show current status
  npm run migrate:create add_user_table     # Create new migration
  npm run migrate:fresh                     # Fresh install (destructive)

Environment Variables:
  DATABASE_URL         Database connection string
  SUPABASE_URL         Supabase project URL
  SUPABASE_SERVICE_KEY Supabase service role key

For more information, see the migration documentation.
`);
  }
}

// Run CLI if called directly
if (require.main === module) {
  const cli = new MigrationCLI();
  cli.run().catch(error => {
    console.error('Unexpected error:', error);
    process.exit(1);
  });
}

module.exports = { MigrationCLI };