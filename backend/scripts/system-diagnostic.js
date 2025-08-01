#!/usr/bin/env node

/**
 * System Diagnostic Script
 * Diagnoses common issues with the celebrity booking platform
 */

const fs = require('fs');
const path = require('path');

class SystemDiagnostic {
  constructor() {
    this.issues = [];
    this.warnings = [];
    this.passed = [];
  }

  async runDiagnostic() {
    console.log('🔍 Running system diagnostic...\n');
    
    this.checkEnvironmentFile();
    this.checkPackageJson();
    this.checkNodeModules();
    this.checkDatabaseConfig();
    this.checkPortAvailability();
    this.checkFileStructure();
    this.generateReport();
  }

  checkEnvironmentFile() {
    console.log('📋 Checking environment configuration...');
    
    const envPath = '.env';
    
    if (!fs.existsSync(envPath)) {
      this.issues.push({
        type: 'critical',
        category: 'Environment',
        message: '.env file is missing',
        solution: 'Create .env file with required variables'
      });
      return;
    }
    
    const envContent = fs.readFileSync(envPath, 'utf8');
    const requiredVars = [
      'SUPABASE_URL',
      'SUPABASE_ANON_KEY',
      'JWT_SECRET',
      'NODE_ENV',
      'PORT'
    ];
    
    const missingVars = [];
    
    for (const varName of requiredVars) {
      if (!envContent.includes(`${varName}=`)) {
        missingVars.push(varName);
      }
    }
    
    if (missingVars.length > 0) {
      this.issues.push({
        type: 'critical',
        category: 'Environment',
        message: `Missing environment variables: ${missingVars.join(', ')}`,
        solution: `Add missing variables to .env file`
      });
    } else {
      this.passed.push('✅ Environment variables are present');
    }
    
    // Check for demo/placeholder values
    if (envContent.includes('supabase-demo') || envContent.includes('your-secure')) {
      this.warnings.push({
        type: 'warning',
        category: 'Environment',
        message: 'Using demo/placeholder values in environment',
        solution: 'Replace demo values with actual production credentials'
      });
    }
  }

  checkPackageJson() {
    console.log('📦 Checking package.json...');
    
    if (!fs.existsSync('package.json')) {
      this.issues.push({
        type: 'critical',
        category: 'Dependencies',
        message: 'package.json is missing',
        solution: 'Run npm init to create package.json'
      });
      return;
    }
    
    try {
      const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
      
      const requiredDeps = [
        'express',
        '@supabase/supabase-js',
        'jsonwebtoken',
        'bcryptjs',
        'cors',
        'helmet',
        'express-rate-limit'
      ];
      
      const missingDeps = requiredDeps.filter(dep => 
        !packageJson.dependencies?.[dep] && !packageJson.devDependencies?.[dep]
      );
      
      if (missingDeps.length > 0) {
        this.issues.push({
          type: 'critical',
          category: 'Dependencies',
          message: `Missing required dependencies: ${missingDeps.join(', ')}`,
          solution: `Run: npm install ${missingDeps.join(' ')}`
        });
      } else {
        this.passed.push('✅ Required dependencies are present');
      }
      
      // Check for start script
      if (!packageJson.scripts?.start && !packageJson.scripts?.dev) {
        this.warnings.push({
          type: 'warning',
          category: 'Scripts',
          message: 'No start or dev script found',
          solution: 'Add start script to package.json'
        });
      }
      
    } catch (error) {
      this.issues.push({
        type: 'critical',
        category: 'Dependencies',
        message: 'Invalid package.json format',
        solution: 'Fix JSON syntax in package.json'
      });
    }
  }

  checkNodeModules() {
    console.log('📁 Checking node_modules...');
    
    if (!fs.existsSync('node_modules')) {
      this.issues.push({
        type: 'critical',
        category: 'Dependencies',
        message: 'node_modules folder is missing',
        solution: 'Run: npm install'
      });
    } else {
      // Check if key modules exist
      const keyModules = ['express', '@supabase/supabase-js', 'jsonwebtoken'];
      const missingModules = keyModules.filter(mod => 
        !fs.existsSync(path.join('node_modules', mod))
      );
      
      if (missingModules.length > 0) {
        this.issues.push({
          type: 'critical',
          category: 'Dependencies',
          message: `Missing key modules: ${missingModules.join(', ')}`,
          solution: 'Run: npm install'
        });
      } else {
        this.passed.push('✅ Key node modules are installed');
      }
    }
  }

  checkDatabaseConfig() {
    console.log('🗄️  Checking database configuration...');
    
    const configPath = 'config/supabase.js';
    
    if (!fs.existsSync(configPath)) {
      this.issues.push({
        type: 'critical',
        category: 'Database',
        message: 'Supabase config file is missing',
        solution: 'Create config/supabase.js with proper configuration'
      });
      return;
    }
    
    try {
      const configContent = fs.readFileSync(configPath, 'utf8');
      
      if (!configContent.includes('createClient')) {
        this.issues.push({
          type: 'critical',
          category: 'Database',
          message: 'Invalid Supabase configuration',
          solution: 'Fix Supabase client initialization in config/supabase.js'
        });
      } else {
        this.passed.push('✅ Database configuration file exists');
      }
      
    } catch (error) {
      this.issues.push({
        type: 'critical',
        category: 'Database',
        message: 'Cannot read database configuration',
        solution: 'Check file permissions and syntax'
      });
    }
  }

  checkPortAvailability() {
    console.log('🔌 Checking port availability...');
    
    // This is a simplified check - in a real scenario you'd use net.isPortTaken
    const defaultPort = 3000;
    
    this.warnings.push({
      type: 'info',
      category: 'Network',
      message: `Default port ${defaultPort} - ensure it's available`,
      solution: 'Change PORT in .env if port is in use'
    });
  }

  checkFileStructure() {
    console.log('📂 Checking file structure...');
    
    const requiredFiles = [
      'app.js',
      'server.js',
      'config/supabase.js',
      'routes/',
      'middleware/',
      'services/'
    ];
    
    const missingFiles = [];
    
    for (const file of requiredFiles) {
      if (!fs.existsSync(file)) {
        missingFiles.push(file);
      }
    }
    
    if (missingFiles.length > 0) {
      this.issues.push({
        type: 'critical',
        category: 'Structure',
        message: `Missing required files/folders: ${missingFiles.join(', ')}`,
        solution: 'Create missing files and folders'
      });
    } else {
      this.passed.push('✅ Core file structure is present');
    }
    
    // Check for main entry point
    let entryPoint = null;
    if (fs.existsSync('server.js')) entryPoint = 'server.js';
    else if (fs.existsSync('app.js')) entryPoint = 'app.js';
    else if (fs.existsSync('index.js')) entryPoint = 'index.js';
    
    if (!entryPoint) {
      this.issues.push({
        type: 'critical',
        category: 'Structure',
        message: 'No main entry point found (server.js, app.js, or index.js)',
        solution: 'Create a main server file'
      });
    } else {
      this.passed.push(`✅ Entry point found: ${entryPoint}`);
    }
  }

  generateReport() {
    console.log('\n' + '='.repeat(80));
    console.log('📊 SYSTEM DIAGNOSTIC REPORT');
    console.log('='.repeat(80));
    
    // Summary
    const criticalIssues = this.issues.filter(i => i.type === 'critical').length;
    const warningIssues = this.warnings.length;
    
    console.log(`🚨 Critical Issues: ${criticalIssues}`);
    console.log(`⚠️  Warnings: ${warningIssues}`);
    console.log(`✅ Passed Checks: ${this.passed.length}`);
    
    // Overall status
    let status = 'HEALTHY';
    if (criticalIssues > 0) {
      status = 'CRITICAL';
    } else if (warningIssues > 2) {
      status = 'WARNING';
    }
    
    const statusEmoji = status === 'HEALTHY' ? '✅' : 
                       status === 'WARNING' ? '⚠️' : '❌';
    
    console.log(`\n${statusEmoji} Overall Status: ${status}`);
    
    // Detailed issues
    if (this.issues.length > 0) {
      console.log('\n🚨 CRITICAL ISSUES:');
      console.log('-'.repeat(80));
      this.issues.forEach((issue, index) => {
        console.log(`${index + 1}. [${issue.category}] ${issue.message}`);
        console.log(`   💡 Solution: ${issue.solution}`);
        console.log('');
      });
    }
    
    if (this.warnings.length > 0) {
      console.log('⚠️  WARNINGS:');
      console.log('-'.repeat(80));
      this.warnings.forEach((warning, index) => {
        console.log(`${index + 1}. [${warning.category}] ${warning.message}`);
        console.log(`   💡 Solution: ${warning.solution}`);
        console.log('');
      });
    }
    
    // Passed checks
    if (this.passed.length > 0) {
      console.log('✅ PASSED CHECKS:');
      console.log('-'.repeat(80));
      this.passed.forEach(check => console.log(check));
      console.log('');
    }
    
    // Quick start guide
    console.log('🚀 QUICK START GUIDE:');
    console.log('-'.repeat(80));
    
    if (criticalIssues > 0) {
      console.log('1. Fix critical issues listed above');
      console.log('2. Install dependencies: npm install');
      console.log('3. Set up environment variables in .env');
      console.log('4. Start the server: npm run dev or npm start');
    } else {
      console.log('1. Install dependencies: npm install');
      console.log('2. Start the server: npm run dev');
      console.log('3. Test the API: curl http://localhost:3000/api/health');
      console.log('4. Check frontend connectivity');
    }
    
    console.log('\n🔄 REFRESH RATE RECOMMENDATIONS:');
    console.log('-'.repeat(80));
    
    if (criticalIssues > 0) {
      console.log('❌ Fix critical issues before setting up refresh rates');
    } else {
      console.log('✅ For optimal performance:');
      console.log('• API polling: 10-15 seconds for live data');
      console.log('• Database queries: Use caching for 5-10 minutes');
      console.log('• Real-time features: WebSocket for instant updates');
      console.log('• Static content: Cache for 1+ hours');
    }
    
    console.log('\n📡 CONNECTION TROUBLESHOOTING:');
    console.log('-'.repeat(80));
    console.log('Frontend connection issues (api.ts:61 Error):');
    console.log('1. Ensure backend server is running on port 3000');
    console.log('2. Check CORS configuration in middleware');
    console.log('3. Verify API endpoint paths match frontend expectations');
    console.log('4. Check network connectivity between frontend and backend');
    console.log('\nTo start backend server:');
    console.log('• cd /Users/laurence/management-project/backend');
    console.log('• npm install (if not done)');
    console.log('• npm run dev or node server.js');
    
    console.log('\n' + '='.repeat(80));
  }
}

// Run diagnostic
async function main() {
  const diagnostic = new SystemDiagnostic();
  await diagnostic.runDiagnostic();
}

if (require.main === module) {
  main().catch(console.error);
}

module.exports = SystemDiagnostic;