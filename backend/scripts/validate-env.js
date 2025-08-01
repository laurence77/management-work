#!/usr/bin/env node

/**
 * Standalone Environment Variable Validation Script
 * Can be run independently to validate environment configuration
 * Usage: node scripts/validate-env.js [--fix] [--env-file=.env]
 */

const fs = require('fs');
const path = require('path');
const { EnvValidator } = require('../utils/env-validator');

// Parse command line arguments
const args = process.argv.slice(2);
const shouldFix = args.includes('--fix');
const envFileArg = args.find(arg => arg.startsWith('--env-file='));
const envFile = envFileArg ? envFileArg.split('=')[1] : '.env';

// Load environment file
const envPath = path.resolve(process.cwd(), envFile);
if (fs.existsSync(envPath)) {
  require('dotenv').config({ path: envPath });
  console.log(`📁 Loaded environment from: ${envPath}`);
} else {
  console.log(`⚠️ Environment file not found: ${envPath}`);
  console.log('Using system environment variables only');
}

console.log('\n🔍 Celebrity Booking Platform - Environment Validation');
console.log('=' .repeat(60));

// Create and run validator
const validator = new EnvValidator();
const result = validator.validate();
const summary = validator.getValidationSummary();

// Display summary
console.log(`\n📊 VALIDATION SUMMARY:`);
console.log(`   Total variables:    ${summary.total}`);
console.log(`   Required variables: ${summary.required}`);
console.log(`   Set variables:      ${summary.set}`);
console.log(`   Errors:             ${summary.errors}`);
console.log(`   Warnings:           ${summary.warnings}`);

// Display errors
if (result.errors.length > 0) {
  console.log(`\n❌ VALIDATION ERRORS (${result.errors.length}):`);
  result.errors.forEach((error, index) => {
    console.log(`   ${index + 1}. ${error}`);
  });
}

// Display warnings
if (result.warnings.length > 0) {
  console.log(`\n⚠️ VALIDATION WARNINGS (${result.warnings.length}):`);
  result.warnings.forEach((warning, index) => {
    console.log(`   ${index + 1}. ${warning}`);
  });
}

// Success message
if (result.isValid) {
  console.log('\n✅ All environment variables are valid!');
  
  if (result.warnings.length > 0) {
    console.log('📝 Consider addressing the warnings above for optimal security.');
  }
} else {
  console.log('\n❌ Environment validation failed!');
  console.log('📝 Please fix the errors above before starting the application.');
}

// Auto-fix suggestions
if (shouldFix && !result.isValid) {
  console.log('\n🔧 AUTO-FIX SUGGESTIONS:');
  
  // Generate missing environment variables template
  const missingVars = result.errors
    .filter(error => error.includes('is required but not set'))
    .map(error => error.split(' ')[0]);
  
  if (missingVars.length > 0) {
    console.log('\n📝 Add these missing variables to your .env file:');
    console.log('-'.repeat(50));
    
    missingVars.forEach(varName => {
      const rule = validator.validationRules[varName];
      console.log(`# ${rule.description}`);
      
      // Provide example values based on type
      switch (varName) {
        case 'JWT_SECRET':
        case 'REFRESH_TOKEN_SECRET':
          console.log(`${varName}=# Generate with: openssl rand -hex 64`);
          break;
        case 'SUPABASE_URL':
          console.log(`${varName}=https://your-project.supabase.co`);
          break;
        case 'SUPABASE_ANON_KEY':
        case 'SUPABASE_SERVICE_ROLE_KEY':
        case 'SUPABASE_SERVICE_KEY':
          console.log(`${varName}=# Get from Supabase project settings`);
          break;
        case 'SMTP_PASS':
          console.log(`${varName}=# Your email provider password or app password`);
          break;
        default:
          console.log(`${varName}=# ${rule.description}`);
      }
      console.log('');
    });
  }
  
  // Security improvements
  if (result.errors.some(error => error.includes('JWT_SECRET and REFRESH_TOKEN_SECRET must be different'))) {
    console.log('🔐 Generate separate JWT secrets:');
    console.log('   openssl rand -hex 64  # For JWT_SECRET');
    console.log('   openssl rand -hex 64  # For REFRESH_TOKEN_SECRET');
    console.log('');
  }
}

// Environment-specific recommendations
console.log('\n💡 ENVIRONMENT-SPECIFIC RECOMMENDATIONS:');

if (process.env.NODE_ENV === 'production') {
  console.log('🏭 Production Environment:');
  console.log('   ✓ Ensure all URLs use HTTPS');
  console.log('   ✓ Use strong, unique passwords');
  console.log('   ✓ Enable SMTP security (SMTP_SECURE=true)');
  console.log('   ✓ Review and rotate secrets regularly');
  console.log('   ✓ Monitor environment variable access');
} else {
  console.log('🔧 Development Environment:');
  console.log('   ✓ Use .env.local for local overrides');
  console.log('   ✓ Never commit real production credentials');
  console.log('   ✓ Test with production-like configuration');
  console.log('   ✓ Validate before deploying to production');
}

console.log('\n📚 SECURITY BEST PRACTICES:');
console.log('   ✓ Keep .env files out of version control');
console.log('   ✓ Use different secrets for different environments');
console.log('   ✓ Rotate secrets regularly');
console.log('   ✓ Use principle of least privilege for API keys');
console.log('   ✓ Monitor for exposed credentials');

console.log('\n' + '='.repeat(60));

// Exit with appropriate code
process.exit(result.isValid ? 0 : 1);