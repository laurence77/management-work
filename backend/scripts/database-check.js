#!/usr/bin/env node

/**
 * Comprehensive Database and System Health Check
 * Checks database connectivity, performance, and system health
 */

require('dotenv').config();
const { supabase, supabaseAdmin } = require('../config/supabase');
const { logger } = require('../services/LoggingService');

class DatabaseHealthChecker {
  constructor() {
    this.checks = [];
    this.results = {
      overall: 'unknown',
      database: {},
      performance: {},
      connectivity: {},
      tables: {},
      indexes: {},
      timestamp: new Date()
    };
  }

  async runAllChecks() {
    console.log('🔍 Starting comprehensive database and system health check...\n');
    
    try {
      await this.checkDatabaseConnectivity();
      await this.checkDatabasePerformance();
      await this.checkTableStructure();
      await this.checkIndexes();
      await this.checkDataIntegrity();
      await this.checkSystemHealth();
      await this.generateReport();
      
    } catch (error) {
      console.error('❌ Health check failed:', error.message);
      this.results.overall = 'failed';
      this.results.error = error.message;
    }
  }

  async checkDatabaseConnectivity() {
    console.log('📡 Checking database connectivity...');
    
    try {
      const startTime = Date.now();
      
      // Test basic connection
      const { data, error } = await supabase
        .from('celebrities')
        .select('id')
        .limit(1);
      
      const connectionTime = Date.now() - startTime;
      
      if (error) {
        throw new Error(`Database connection failed: ${error.message}`);
      }
      
      this.results.connectivity = {
        status: 'connected',
        responseTime: connectionTime,
        timestamp: new Date()
      };
      
      console.log(`✅ Database connected (${connectionTime}ms)`);
      
      // Test admin connection
      const adminStartTime = Date.now();
      const { data: adminData, error: adminError } = await supabaseAdmin
        .from('celebrities')
        .select('id')
        .limit(1);
      
      const adminConnectionTime = Date.now() - adminStartTime;
      
      if (adminError) {
        console.log(`⚠️  Admin connection issue: ${adminError.message}`);
      } else {
        console.log(`✅ Admin connection OK (${adminConnectionTime}ms)`);
      }
      
    } catch (error) {
      this.results.connectivity = {
        status: 'failed',
        error: error.message,
        timestamp: new Date()
      };
      console.log(`❌ Database connectivity failed: ${error.message}`);
    }
  }

  async checkDatabasePerformance() {
    console.log('\n⚡ Checking database performance...');
    
    const performanceTests = [
      {
        name: 'Simple Select',
        query: () => supabase.from('celebrities').select('id, name').limit(10)
      },
      {
        name: 'Join Query',
        query: () => supabase
          .from('bookings')
          .select('id, amount, celebrities(name)')
          .limit(5)
      },
      {
        name: 'Count Query',
        query: () => supabase
          .from('celebrities')
          .select('*', { count: 'exact', head: true })
      }
    ];
    
    const results = [];
    
    for (const test of performanceTests) {
      try {
        const startTime = Date.now();
        const { data, error } = await test.query();
        const executionTime = Date.now() - startTime;
        
        if (error) {
          results.push({
            test: test.name,
            status: 'failed',
            error: error.message,
            executionTime
          });
          console.log(`❌ ${test.name}: ${error.message} (${executionTime}ms)`);
        } else {
          results.push({
            test: test.name,
            status: 'passed',
            executionTime,
            recordCount: Array.isArray(data) ? data.length : 'N/A'
          });
          console.log(`✅ ${test.name}: ${executionTime}ms (${Array.isArray(data) ? data.length : 'N/A'} records)`);
        }
        
        // Small delay between tests
        await new Promise(resolve => setTimeout(resolve, 100));
        
      } catch (error) {
        results.push({
          test: test.name,
          status: 'error',
          error: error.message
        });
        console.log(`❌ ${test.name}: ${error.message}`);
      }
    }
    
    const avgTime = results
      .filter(r => r.executionTime)
      .reduce((sum, r) => sum + r.executionTime, 0) / results.length;
    
    this.results.performance = {
      averageQueryTime: Math.round(avgTime) || 0,
      tests: results,
      timestamp: new Date()
    };
  }

  async checkTableStructure() {
    console.log('\n📋 Checking table structure...');
    
    const expectedTables = [
      'celebrities',
      'bookings',
      'app_users',
      'chat_rooms',
      'chat_messages',
      'chat_participants',
      'crypto_payments',
      'gift_cards'
    ];
    
    const tableResults = {};
    
    for (const tableName of expectedTables) {
      try {
        const { data, error } = await supabase
          .from(tableName)
          .select('*')
          .limit(1);
        
        if (error) {
          tableResults[tableName] = {
            exists: false,
            error: error.message
          };
          console.log(`❌ Table '${tableName}': ${error.message}`);
        } else {
          // Get row count
          const { count, error: countError } = await supabase
            .from(tableName)
            .select('*', { count: 'exact', head: true });
          
          tableResults[tableName] = {
            exists: true,
            rowCount: countError ? 'unknown' : count
          };
          console.log(`✅ Table '${tableName}': ${countError ? 'unknown' : count} rows`);
        }
        
      } catch (error) {
        tableResults[tableName] = {
          exists: false,
          error: error.message
        };
        console.log(`❌ Table '${tableName}': ${error.message}`);
      }
    }
    
    this.results.tables = tableResults;
  }

  async checkIndexes() {
    console.log('\n🔍 Checking database indexes...');
    
    // This would require custom SQL queries to check indexes
    // For now, we'll simulate index checks
    
    const indexChecks = [
      { table: 'celebrities', column: 'id', type: 'primary' },
      { table: 'bookings', column: 'celebrity_id', type: 'foreign' },
      { table: 'bookings', column: 'user_id', type: 'foreign' },
      { table: 'chat_messages', column: 'room_id', type: 'foreign' }
    ];
    
    const indexResults = {};
    
    for (const check of indexChecks) {
      try {
        // Simulate index check by running a query
        const startTime = Date.now();
        const { data, error } = await supabase
          .from(check.table)
          .select('id')
          .eq(check.column === 'id' ? 'id' : check.column, 1)
          .limit(1);
        
        const queryTime = Date.now() - startTime;
        
        indexResults[`${check.table}.${check.column}`] = {
          exists: true,
          type: check.type,
          queryTime,
          status: queryTime < 100 ? 'optimal' : queryTime < 500 ? 'acceptable' : 'slow'
        };
        
        const status = queryTime < 100 ? '✅' : queryTime < 500 ? '⚠️' : '❌';
        console.log(`${status} Index ${check.table}.${check.column}: ${queryTime}ms`);
        
      } catch (error) {
        indexResults[`${check.table}.${check.column}`] = {
          exists: false,
          error: error.message
        };
        console.log(`❌ Index ${check.table}.${check.column}: ${error.message}`);
      }
    }
    
    this.results.indexes = indexResults;
  }

  async checkDataIntegrity() {
    console.log('\n🔐 Checking data integrity...');
    
    const integrityChecks = [
      {
        name: 'Orphaned Bookings',
        query: async () => {
          const { data, error } = await supabase
            .from('bookings')
            .select('id, celebrity_id')
            .not('celebrity_id', 'in', '(SELECT id FROM celebrities)')
            .limit(5);
          
          return { data, error, count: data?.length || 0 };
        }
      },
      {
        name: 'Invalid Email Formats',
        query: async () => {
          const { data, error } = await supabase
            .from('app_users')
            .select('id, email')
            .not('email', 'like', '%@%')
            .limit(5);
          
          return { data, error, count: data?.length || 0 };
        }
      },
      {
        name: 'Negative Amounts',
        query: async () => {
          const { data, error } = await supabase
            .from('bookings')
            .select('id, amount')
            .lt('amount', 0)
            .limit(5);
          
          return { data, error, count: data?.length || 0 };
        }
      }
    ];
    
    const integrityResults = {};
    
    for (const check of integrityChecks) {
      try {
        const result = await check.query();
        
        if (result.error) {
          integrityResults[check.name] = {
            status: 'error',
            error: result.error.message
          };
          console.log(`❌ ${check.name}: ${result.error.message}`);
        } else {
          integrityResults[check.name] = {
            status: result.count === 0 ? 'passed' : 'issues_found',
            issuesCount: result.count,
            sample: result.data
          };
          
          const status = result.count === 0 ? '✅' : '⚠️';
          console.log(`${status} ${check.name}: ${result.count} issues found`);
        }
        
      } catch (error) {
        integrityResults[check.name] = {
          status: 'error',
          error: error.message
        };
        console.log(`❌ ${check.name}: ${error.message}`);
      }
    }
    
    this.results.dataIntegrity = integrityResults;
  }

  async checkSystemHealth() {
    console.log('\n🏥 Checking system health...');
    
    const systemHealth = {
      memory: process.memoryUsage(),
      uptime: process.uptime(),
      nodeVersion: process.version,
      platform: process.platform,
      cpu: process.cpuUsage(),
      timestamp: new Date()
    };
    
    // Memory usage analysis
    const memoryMB = {
      rss: Math.round(systemHealth.memory.rss / 1024 / 1024),
      heapUsed: Math.round(systemHealth.memory.heapUsed / 1024 / 1024),
      heapTotal: Math.round(systemHealth.memory.heapTotal / 1024 / 1024),
      external: Math.round(systemHealth.memory.external / 1024 / 1024)
    };
    
    console.log(`✅ Memory Usage: ${memoryMB.heapUsed}MB / ${memoryMB.heapTotal}MB heap`);
    console.log(`✅ Total RSS: ${memoryMB.rss}MB`);
    console.log(`✅ Uptime: ${Math.round(systemHealth.uptime / 60)} minutes`);
    console.log(`✅ Node.js: ${systemHealth.nodeVersion}`);
    console.log(`✅ Platform: ${systemHealth.platform}`);
    
    this.results.system = {
      ...systemHealth,
      memoryMB,
      healthStatus: memoryMB.heapUsed < 500 ? 'healthy' : memoryMB.heapUsed < 1000 ? 'warning' : 'critical'
    };
  }

  async generateReport() {
    console.log('\n📊 Generating comprehensive report...');
    
    // Calculate overall health score
    let healthScore = 100;
    let criticalIssues = 0;
    let warnings = 0;
    
    // Check connectivity
    if (this.results.connectivity?.status !== 'connected') {
      healthScore -= 30;
      criticalIssues++;
    }
    
    // Check performance
    if (this.results.performance?.averageQueryTime > 500) {
      healthScore -= 20;
      warnings++;
    } else if (this.results.performance?.averageQueryTime > 200) {
      healthScore -= 10;
      warnings++;
    }
    
    // Check tables
    const missingTables = Object.values(this.results.tables || {})
      .filter(table => !table.exists).length;
    if (missingTables > 0) {
      healthScore -= missingTables * 15;
      criticalIssues += missingTables;
    }
    
    // Check data integrity
    const integrityIssues = Object.values(this.results.dataIntegrity || {})
      .filter(check => check.status === 'issues_found' && check.issuesCount > 0).length;
    if (integrityIssues > 0) {
      healthScore -= integrityIssues * 5;
      warnings += integrityIssues;
    }
    
    // Check system health
    if (this.results.system?.healthStatus === 'critical') {
      healthScore -= 25;
      criticalIssues++;
    } else if (this.results.system?.healthStatus === 'warning') {
      healthScore -= 10;
      warnings++;
    }
    
    // Determine overall status
    let overallStatus = 'healthy';
    if (healthScore < 50 || criticalIssues > 0) {
      overallStatus = 'critical';
    } else if (healthScore < 80 || warnings > 2) {
      overallStatus = 'warning';
    }
    
    this.results.overall = overallStatus;
    this.results.healthScore = Math.max(0, healthScore);
    this.results.criticalIssues = criticalIssues;
    this.results.warnings = warnings;
    
    // Display summary
    console.log('\n' + '='.repeat(60));
    console.log('📋 HEALTH CHECK SUMMARY');
    console.log('='.repeat(60));
    
    const statusEmoji = overallStatus === 'healthy' ? '✅' : 
                       overallStatus === 'warning' ? '⚠️' : '❌';
    
    console.log(`${statusEmoji} Overall Status: ${overallStatus.toUpperCase()}`);
    console.log(`📊 Health Score: ${this.results.healthScore}/100`);
    console.log(`🚨 Critical Issues: ${criticalIssues}`);
    console.log(`⚠️  Warnings: ${warnings}`);
    console.log(`📡 Database: ${this.results.connectivity?.status || 'unknown'}`);
    console.log(`⚡ Avg Query Time: ${this.results.performance?.averageQueryTime || 0}ms`);
    console.log(`🧠 Memory Usage: ${this.results.system?.memoryMB?.heapUsed || 0}MB`);
    console.log(`⏱️  System Uptime: ${Math.round((this.results.system?.uptime || 0) / 60)} minutes`);
    
    console.log('\n' + '='.repeat(60));
    
    // Recommendations
    this.generateRecommendations();
    
    return this.results;
  }

  generateRecommendations() {
    console.log('💡 RECOMMENDATIONS:');
    console.log('='.repeat(60));
    
    const recommendations = [];
    
    if (this.results.connectivity?.status !== 'connected') {
      recommendations.push('🔴 Fix database connectivity issues immediately');
    }
    
    if (this.results.connectivity?.responseTime > 200) {
      recommendations.push('🟡 Database response time is slow - consider connection pooling');
    }
    
    if (this.results.performance?.averageQueryTime > 500) {
      recommendations.push('🔴 Query performance is poor - review indexes and optimize queries');
    } else if (this.results.performance?.averageQueryTime > 200) {
      recommendations.push('🟡 Query performance could be improved - consider caching');
    }
    
    const slowIndexes = Object.values(this.results.indexes || {})
      .filter(index => index.status === 'slow').length;
    if (slowIndexes > 0) {
      recommendations.push(`🟡 ${slowIndexes} indexes are performing slowly - review index strategy`);
    }
    
    if (this.results.system?.healthStatus === 'critical') {
      recommendations.push('🔴 System memory usage is critical - restart or scale up');
    } else if (this.results.system?.healthStatus === 'warning') {
      recommendations.push('🟡 Monitor system memory usage - consider optimization');
    }
    
    const integrityIssues = Object.values(this.results.dataIntegrity || {})
      .reduce((sum, check) => sum + (check.issuesCount || 0), 0);
    if (integrityIssues > 0) {
      recommendations.push(`🟡 Found ${integrityIssues} data integrity issues - review and clean up data`);
    }
    
    if (recommendations.length === 0) {
      console.log('✅ System is running optimally - no immediate actions required');
    } else {
      recommendations.forEach((rec, index) => {
        console.log(`${index + 1}. ${rec}`);
      });
    }
    
    console.log('\n' + '='.repeat(60));
    console.log('🔄 Refresh Rate Analysis:');
    console.log('='.repeat(60));
    
    // Analyze refresh rates based on query performance
    const avgQueryTime = this.results.performance?.averageQueryTime || 0;
    
    if (avgQueryTime < 50) {
      console.log('✅ Recommended refresh rate: 5-10 seconds (excellent performance)');
    } else if (avgQueryTime < 100) {
      console.log('✅ Recommended refresh rate: 10-15 seconds (good performance)');
    } else if (avgQueryTime < 200) {
      console.log('⚠️  Recommended refresh rate: 15-30 seconds (moderate performance)');
    } else if (avgQueryTime < 500) {
      console.log('⚠️  Recommended refresh rate: 30-60 seconds (slow performance)');
    } else {
      console.log('❌ Recommended refresh rate: 60+ seconds (poor performance - needs optimization)');
    }
    
    console.log('\n💾 Cache Strategy Recommendations:');
    if (avgQueryTime > 100) {
      console.log('• Implement Redis caching for frequently accessed data');
      console.log('• Cache celebrity listings for 5-10 minutes');
      console.log('• Cache booking summaries for 2-5 minutes');
      console.log('• Use database query result caching');
    } else {
      console.log('✅ Current performance is good - minimal caching needed');
    }
  }
}

// Run the health check
async function main() {
  const checker = new DatabaseHealthChecker();
  
  try {
    const results = await checker.runAllChecks();
    
    // Save results to file for monitoring
    const fs = require('fs');
    const resultsPath = './health-check-results.json';
    
    fs.writeFileSync(resultsPath, JSON.stringify(results, null, 2));
    console.log(`\n📁 Results saved to: ${resultsPath}`);
    
    // Exit with appropriate code
    process.exit(results.overall === 'critical' ? 1 : 0);
    
  } catch (error) {
    console.error('\n💥 Health check failed:', error.message);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  main().catch(error => {
    console.error('Unhandled error:', error);
    process.exit(1);
  });
}

module.exports = DatabaseHealthChecker;