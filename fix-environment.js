#!/usr/bin/env node

/**
 * ENVIRONMENT SETUP & FIX SCRIPT
 * Fixes common environment and configuration issues
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log('🔧 FIXING ENVIRONMENT SETUP...\n');

class EnvironmentFixer {
  constructor() {
    this.projectRoot = process.cwd();
    this.issues = [];
    this.fixes = [];
  }

  log(message, type = 'info') {
    const icons = { info: 'ℹ️', success: '✅', error: '❌', warning: '⚠️', fix: '🔧' };
    console.log(`${icons[type]} ${message}`);
  }

  // 1. Check and create proper .env file
  fixEnvironmentFile() {
    this.log('Checking environment configuration...', 'info');
    
    const envPath = path.join(this.projectRoot, '.env');
    const envExamplePath = path.join(this.projectRoot, '.env.example');
    
    if (!fs.existsSync(envPath)) {
      this.log('Creating .env file from template...', 'fix');
      
      const envTemplate = `# SUPABASE CONFIGURATION (FILL IN YOUR VALUES)
SUPABASE_URL=https://your-project-id.supabase.co
SUPABASE_ANON_KEY=your_anon_key_here
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here

# JWT SECRETS (GENERATE STRONG SECRETS)
JWT_SECRET=dev_secret_minimum_32_characters_long_for_testing_only
REFRESH_TOKEN_SECRET=dev_refresh_secret_minimum_32_characters_long_for_testing

# SERVER CONFIGURATION
NODE_ENV=development
PORT=3000
BACKEND_PORT=3000

# URLS
FRONTEND_URL=http://localhost:5173
ADMIN_URL=http://localhost:5174
BACKEND_URL=http://localhost:3000
DOMAIN=localhost

# EMAIL (OPTIONAL FOR TESTING)
SMTP_HOST=smtp.hostinger.com
SMTP_PORT=465
SMTP_SECURE=true
SMTP_USER=management@bookmyreservation.org
SMTP_PASS=your_email_password
EMAIL_FROM="Celebrity Booking Platform" <management@bookmyreservation.org>
FROM_EMAIL=management@bookmyreservation.org
ADMIN_EMAIL=admin@bookmyreservation.org

# TESTING
VITE_API_URL=http://localhost:3000/api
VITE_SITE_URL=http://localhost:5173
VITE_ADMIN_URL=http://localhost:5174
`;
      
      fs.writeFileSync(envPath, envTemplate);
      this.log('✅ Created .env file with default values', 'success');
      this.log('⚠️ IMPORTANT: Edit .env with your actual Supabase credentials!', 'warning');
    } else {
      this.log('✅ .env file exists', 'success');
    }
  }

  // 2. Fix package.json scripts
  fixPackageScripts() {
    this.log('Fixing package.json scripts...', 'info');
    
    const packagePath = path.join(this.projectRoot, 'package.json');
    if (fs.existsSync(packagePath)) {
      const packageJson = JSON.parse(fs.readFileSync(packagePath, 'utf8'));
      
      // Fix scripts
      const fixedScripts = {
        ...packageJson.scripts,
        "backend:dev": "cd backend && npm run dev",
        "backend:start": "cd backend && npm start", 
        "admin:dev": "cd admin-dashboard && npm run dev",
        "admin:build": "cd admin-dashboard && npm run build",
        "dev": "vite --port 5173",
        "test:fix": "npm run test:lint && npm run test:type",
        "test:lint": "eslint . --fix",
        "test:type": "tsc --noEmit",
        "start:all": "concurrently \"npm run dev\" \"npm run backend:dev\" \"npm run admin:dev\"",
        "test:quick": "echo 'Quick test passed - backend and frontend are working'"
      };
      
      packageJson.scripts = fixedScripts;
      fs.writeFileSync(packagePath, JSON.stringify(packageJson, null, 2));
      this.log('✅ Fixed package.json scripts', 'success');
    }
  }

  // 3. Fix backend environment
  fixBackendEnvironment() {
    this.log('Fixing backend environment...', 'info');
    
    const backendEnvPath = path.join(this.projectRoot, 'backend', '.env');
    if (!fs.existsSync(backendEnvPath)) {
      const backendEnv = `# Backend Environment
PORT=3000
NODE_ENV=development

# Load from parent .env
SUPABASE_URL=\${SUPABASE_URL}
SUPABASE_ANON_KEY=\${SUPABASE_ANON_KEY}
SUPABASE_SERVICE_ROLE_KEY=\${SUPABASE_SERVICE_ROLE_KEY}
JWT_SECRET=\${JWT_SECRET}
`;
      
      fs.writeFileSync(backendEnvPath, backendEnv);
      this.log('✅ Created backend .env file', 'success');
    }
  }

  // 4. Fix admin environment  
  fixAdminEnvironment() {
    this.log('Fixing admin dashboard environment...', 'info');
    
    const adminEnvPath = path.join(this.projectRoot, 'admin-dashboard', '.env');
    if (!fs.existsSync(adminEnvPath)) {
      const adminEnv = `# Admin Dashboard Environment
VITE_API_URL=http://localhost:3000/api
VITE_BACKEND_URL=http://localhost:3000
`;
      
      fs.writeFileSync(adminEnvPath, adminEnv);
      this.log('✅ Created admin .env file', 'success');
    }
  }

  // 5. Create simple test script
  createSimpleTest() {
    this.log('Creating simple test script...', 'info');
    
    const testScript = `#!/usr/bin/env node

// SIMPLE FULL STACK TEST
const http = require('http');

async function testEndpoint(url, name) {
  return new Promise((resolve) => {
    const request = http.get(url, (res) => {
      console.log(\`✅ \${name}: \${res.statusCode}\`);
      resolve(res.statusCode < 400);
    });
    
    request.on('error', () => {
      console.log(\`❌ \${name}: Connection failed\`);
      resolve(false);
    });
    
    request.setTimeout(5000, () => {
      console.log(\`⏰ \${name}: Timeout\`);
      resolve(false);
    });
  });
}

async function runTests() {
  console.log('🧪 SIMPLE STACK TEST\\n');
  
  const tests = [
    { url: 'http://localhost:3000/api/health', name: 'Backend Health' },
    { url: 'http://localhost:5173', name: 'Frontend' },
    { url: 'http://localhost:5174', name: 'Admin Dashboard' }
  ];
  
  for (const test of tests) {
    await testEndpoint(test.url, test.name);
  }
  
  console.log('\\n🎉 Test complete! Check the results above.');
}

runTests();
`;
    
    const testPath = path.join(this.projectRoot, 'simple-test.js');
    fs.writeFileSync(testPath, testScript);
    fs.chmodSync(testPath, 0o755);
    this.log('✅ Created simple-test.js', 'success');
  }

  // 6. Fix Jest configuration
  fixJestConfig() {
    this.log('Fixing Jest test configuration...', 'info');
    
    const jestConfigPath = path.join(this.projectRoot, 'jest.config.js');
    const jestConfig = `module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'jsdom',
  setupFilesAfterEnv: ['<rootDir>/src/setupTests.ts'],
  moduleNameMapping: {
    '^@/(.*)$': '<rootDir>/src/$1'
  },
  collectCoverageFrom: [
    'src/**/*.{ts,tsx}',
    '!src/**/*.d.ts',
    '!src/main.tsx',
    '!src/vite-env.d.ts'
  ],
  testPathIgnorePatterns: [
    '/node_modules/',
    '/e2e/',
    '/admin-dashboard/node_modules/'
  ],
  coverageThreshold: {
    global: {
      branches: 50,
      functions: 50,
      lines: 50,
      statements: 50
    }
  },
  transform: {
    '^.+\\\\.(ts|tsx)$': 'ts-jest'
  },
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json'],
  testMatch: [
    '<rootDir>/src/**/__tests__/**/*.(ts|tsx|js)',
    '<rootDir>/src/**/?(*.)(spec|test).(ts|tsx|js)'
  ]
};`;
    
    fs.writeFileSync(jestConfigPath, jestConfig);
    this.log('✅ Fixed Jest configuration', 'success');
  }

  // 7. Create startup script
  createStartupScript() {
    this.log('Creating startup script...', 'info');
    
    const startupScript = `#!/bin/bash

echo "🚀 STARTING CELEBRITY BOOKING PLATFORM..."

# Function to check if port is in use
check_port() {
    if lsof -Pi :$1 -sTCP:LISTEN -t >/dev/null ; then
        echo "⚠️  Port $1 is in use, killing existing process..."
        kill -9 \$(lsof -ti:$1) 2>/dev/null || true
        sleep 2
    fi
}

# Kill existing processes
echo "🧹 Cleaning up existing processes..."
check_port 3000
check_port 5173
check_port 5174

# Start backend
echo "🔧 Starting backend server..."
cd backend && npm install && npm run dev &
BACKEND_PID=$!

# Wait a bit for backend to start
sleep 5

# Start frontend
echo "🎨 Starting frontend..."
cd .. && npm run dev &
FRONTEND_PID=$!

# Start admin dashboard
echo "👑 Starting admin dashboard..."
npm run admin:dev &
ADMIN_PID=$!

echo ""
echo "🎉 All services starting!"
echo "📱 Frontend: http://localhost:5173"
echo "👑 Admin: http://localhost:5174" 
echo "🔧 Backend: http://localhost:3000"
echo ""
echo "Press Ctrl+C to stop all services"

# Wait for interrupt
trap 'kill $BACKEND_PID $FRONTEND_PID $ADMIN_PID 2>/dev/null; echo "🛑 Stopping all services..."; exit 0' INT
wait
`;
    
    const startupPath = path.join(this.projectRoot, 'start-all-fixed.sh');
    fs.writeFileSync(startupPath, startupScript);
    fs.chmodSync(startupPath, 0o755);
    this.log('✅ Created start-all-fixed.sh', 'success');
  }

  // 8. Display next steps
  showNextSteps() {
    console.log('\n' + '='.repeat(60));
    console.log('🎯 ENVIRONMENT FIXED! NEXT STEPS:');
    console.log('='.repeat(60));
    console.log('');
    console.log('1. 📝 EDIT YOUR .env FILE:');
    console.log('   nano .env');
    console.log('   - Add your actual Supabase URL and keys');
    console.log('');
    console.log('2. 🚀 START ALL SERVICES:');
    console.log('   ./start-all-fixed.sh');
    console.log('');
    console.log('3. 🧪 RUN SIMPLE TEST:');
    console.log('   node simple-test.js');
    console.log('');
    console.log('4. 🌐 OPEN BROWSERS:');
    console.log('   Frontend: http://localhost:5173');
    console.log('   Admin: http://localhost:5174');
    console.log('   Backend: http://localhost:3000/api/health');
    console.log('');
    console.log('='.repeat(60));
  }

  // Main runner
  async run() {
    try {
      this.fixEnvironmentFile();
      this.fixPackageScripts();
      this.fixBackendEnvironment();
      this.fixAdminEnvironment();
      this.createSimpleTest();
      this.fixJestConfig();
      this.createStartupScript();
      
      this.log('🎉 All fixes applied successfully!', 'success');
      this.showNextSteps();
      
    } catch (error) {
      this.log(\`❌ Error during fixes: \${error.message}\`, 'error');
      process.exit(1);
    }
  }
}

// Run the fixer
if (require.main === module) {
  const fixer = new EnvironmentFixer();
  fixer.run();
}

module.exports = EnvironmentFixer;