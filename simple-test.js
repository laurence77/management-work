#!/usr/bin/env node

// SIMPLE FULL STACK TEST
const http = require('http');

async function testEndpoint(url, name) {
  return new Promise((resolve) => {
    const request = http.get(url, (res) => {
      console.log(`✅ ${name}: ${res.statusCode}`);
      resolve(res.statusCode < 400);
    });
    
    request.on('error', () => {
      console.log(`❌ ${name}: Connection failed`);
      resolve(false);
    });
    
    request.setTimeout(5000, () => {
      console.log(`⏰ ${name}: Timeout`);
      resolve(false);
    });
  });
}

async function runTests() {
  console.log('🧪 SIMPLE STACK TEST\n');
  
  const tests = [
    { url: 'http://localhost:3000/api/health', name: 'Backend Health' },
    { url: 'http://localhost:5173', name: 'Frontend' },
    { url: 'http://localhost:5174', name: 'Admin Dashboard' }
  ];
  
  let passed = 0;
  
  for (const test of tests) {
    const success = await testEndpoint(test.url, test.name);
    if (success) passed++;
  }
  
  console.log(`\n📊 Results: ${passed}/${tests.length} tests passed`);
  
  if (passed === tests.length) {
    console.log('🎉 All services are working!');
  } else {
    console.log('⚠️  Some services need attention. Make sure they are started.');
    console.log('💡 Run: ./start-all-fixed.sh');
  }
}

runTests();