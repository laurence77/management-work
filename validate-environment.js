#!/usr/bin/env node
/**
 * Environment Validation Script
 * Validates that all required environment variables are set
 */

const fs = require('fs');
const path = require('path');

// Colors for console output
const colors = {
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  reset: '\x1b[0m'
};

const log = {
  error: (msg) => console.log(`${colors.red}❌ ${msg}${colors.reset}`),
  success: (msg) => console.log(`${colors.green}✅ ${msg}${colors.reset}`),
  warning: (msg) => console.log(`${colors.yellow}⚠️  ${msg}${colors.reset}`),
  info: (msg) => console.log(`${colors.blue}ℹ️  ${msg}${colors.reset}`)
};

// Required environment variables
const requiredVars = {
  main: [
    'ADMIN_PASSWORD',
    'MANAGEMENT_PASSWORD'
  ],
  backend: [
    'SUPABASE_URL',
    'SUPABASE_ANON_KEY',
    'JWT_SECRET',
    'SMTP_USER',
    'SMTP_PASS'
  ],
  optional: [
    'SUPABASE_SERVICE_ROLE_KEY',
    'REFRESH_TOKEN_SECRET',
    'OPENAI_API_KEY',
    'STRIPE_SECRET_KEY',
    'CLOUDINARY_API_KEY'
  ]
};

/**
 * Load environment variables from a file
 */
function loadEnvFile(filePath) {
  if (!fs.existsSync(filePath)) {
    return null;
  }
  
  const envContent = fs.readFileSync(filePath, 'utf8');
  const env = {};
  
  envContent.split('\n').forEach(line => {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith('#')) {
      const [key, ...valueParts] = trimmed.split('=');
      if (key && valueParts.length > 0) {
        env[key.trim()] = valueParts.join('=').trim();
      }
    }
  });
  
  return env;
}

/**
 * Check if a value is properly set (not empty, not placeholder)
 */
function isValueSet(value) {
  if (!value || value.trim() === '') return false;
  
  // Check for common placeholder patterns
  const placeholders = [
    'your_',
    'YOUR_',
    'changeme',
    'CHANGEME',
    'placeholder',
    'PLACEHOLDER',
    'replace_with',
    'REPLACE_WITH'
  ];
  
  return !placeholders.some(placeholder => value.includes(placeholder));
}

/**
 * Validate environment configuration
 */
function validateEnvironment() {
  console.log(`${colors.blue}🔧 Celebrity Booking Platform - Environment Validation${colors.reset}\n`);
  
  let hasErrors = false;
  let hasWarnings = false;
  
  // Check main project .env
  log.info('Checking main project environment...');
  const mainEnv = loadEnvFile('.env');
  
  if (!mainEnv) {
    log.error('Main .env file not found. Run: cp .env.example .env');
    hasErrors = true;
  } else {
    requiredVars.main.forEach(varName => {
      if (!isValueSet(mainEnv[varName])) {
        log.error(`${varName} is not set in main .env file`);
        hasErrors = true;
      } else {
        log.success(`${varName} is configured`);
      }
    });
  }
  
  // Check backend .env
  log.info('\nChecking backend environment...');
  const backendEnv = loadEnvFile('backend/.env');
  
  if (!backendEnv) {
    log.error('Backend .env file not found. Run: cp backend/.env.example backend/.env');
    hasErrors = true;
  } else {
    requiredVars.backend.forEach(varName => {
      const value = backendEnv[varName] || mainEnv?.[varName] || process.env[varName];
      if (!isValueSet(value)) {
        log.error(`${varName} is not set in backend/.env file`);
        hasErrors = true;
      } else {
        log.success(`${varName} is configured`);
      }
    });
  }
  
  // Check admin dashboard .env
  log.info('\nChecking admin dashboard environment...');
  const adminEnv = loadEnvFile('admin-dashboard/.env');
  
  if (!adminEnv) {
    log.error('Admin dashboard .env file not found. Run: cp admin-dashboard/.env.example admin-dashboard/.env');
    hasErrors = true;
  } else {
    const requiredAdminVars = ['VITE_SUPABASE_URL', 'VITE_SUPABASE_ANON_KEY'];
    requiredAdminVars.forEach(varName => {
      if (!isValueSet(adminEnv[varName])) {
        log.error(`${varName} is not set in admin-dashboard/.env file`);
        hasErrors = true;
      } else {
        log.success(`${varName} is configured`);
      }
    });
  }
  
  // Check optional variables
  log.info('\nChecking optional environment variables...');
  requiredVars.optional.forEach(varName => {
    const value = mainEnv?.[varName] || backendEnv?.[varName] || process.env[varName];
    if (!isValueSet(value)) {
      log.warning(`${varName} is not configured (optional)`);
      hasWarnings = true;
    } else {
      log.success(`${varName} is configured`);
    }
  });
  
  // Final result
  console.log('\n' + '='.repeat(60));
  
  if (hasErrors) {
    log.error('Environment validation FAILED!');
    log.error('Please fix the errors above before starting the application.');
    process.exit(1);
  } else if (hasWarnings) {
    log.warning('Environment validation completed with warnings.');
    log.info('The application will start, but some features may not work without optional variables.');
  } else {
    log.success('Environment validation PASSED!');
    log.success('All required environment variables are properly configured.');
  }
  
  console.log('\n📚 For setup help, see: ./setup-environment.sh');
}

// Run validation
validateEnvironment();