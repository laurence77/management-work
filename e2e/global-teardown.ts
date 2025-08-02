import { chromium, FullConfig } from '@playwright/test';
import { promises as fs } from 'fs';

async function globalTeardown(config: FullConfig) {
  console.log('🧹 Starting E2E test global teardown...');
  
  const browser = await chromium.launch();
  const page = await browser.newPage();
  
  try {
    // Clean up test data
    console.log('🗑️ Cleaning up test data...');
    
    const backendUrl = process.env.BACKEND_URL || 'http://localhost:3000';
    
    // Clean up test bookings
    await page.goto(`${backendUrl}/api/bookings/test-cleanup`, {
      waitUntil: 'networkidle'
    });
    
    // Clean up test celebrities
    await page.goto(`${backendUrl}/api/celebrities/test-cleanup`, {
      waitUntil: 'networkidle'
    });
    
    // Clean up test users
    await page.goto(`${backendUrl}/api/auth/test-cleanup`, {
      waitUntil: 'networkidle'
    });
    
    console.log('✅ Test data cleanup complete');
    
    // Remove authentication state file
    try {
      await fs.unlink('e2e/auth-state.json');
      console.log('✅ Authentication state file removed');
    } catch (error) {
      // File might not exist, which is fine
      console.log('ℹ️ Authentication state file not found (already cleaned up)');
    }
    
    // Generate test report summary
    console.log('📊 Generating test report summary...');
    
    try {
      const reportData = {
        timestamp: new Date().toISOString(),
        environment: process.env.NODE_ENV || 'test',
        baseUrl: process.env.E2E_BASE_URL || 'http://localhost:5173',
        backendUrl: backendUrl,
        cleanup: {
          testData: 'completed',
          authState: 'removed'
        }
      };
      
      await fs.writeFile('test-results/teardown-summary.json', JSON.stringify(reportData, null, 2));
      console.log('✅ Test report summary generated');
      
    } catch (error) {
      console.warn('⚠️ Could not generate test report summary:', error);
    }
    
  } catch (error) {
    console.error('❌ Global teardown encountered error:', error);
    // Don't throw here - we want teardown to be as robust as possible
  } finally {
    await browser.close();
  }
  
  console.log('🎉 E2E test global teardown completed');
}

export default globalTeardown;