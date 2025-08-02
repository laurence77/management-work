import { chromium, FullConfig } from '@playwright/test';

async function globalSetup(config: FullConfig) {
  console.log('🚀 Starting E2E test global setup...');
  
  const browser = await chromium.launch();
  const page = await browser.newPage();
  
  try {
    // Health check for backend API
    console.log('⚕️ Checking backend health...');
    const backendUrl = process.env.BACKEND_URL || 'http://localhost:3000';
    const response = await page.goto(`${backendUrl}/api/health`);
    
    if (!response?.ok()) {
      throw new Error(`Backend health check failed: ${response?.status()}`);
    }
    
    console.log('✅ Backend is healthy');
    
    // Setup test data if needed
    console.log('📊 Setting up test data...');
    
    // Create test user account
    await page.goto(`${backendUrl}/api/auth/test-setup`, {
      waitUntil: 'networkidle'
    });
    
    // Seed test celebrities
    await page.goto(`${backendUrl}/api/celebrities/test-seed`, {
      waitUntil: 'networkidle'
    });
    
    console.log('✅ Test data setup complete');
    
    // Authenticate and store session
    console.log('🔐 Authenticating test user...');
    
    await page.goto(`${process.env.E2E_BASE_URL || 'http://localhost:5173'}/login`);
    
    await page.fill('[data-testid="email-input"]', 'test@example.com');
    await page.fill('[data-testid="password-input"]', 'test-password-123');
    await page.click('[data-testid="login-submit"]');
    
    // Wait for authentication to complete
    await page.waitForURL('**/dashboard');
    
    // Save authentication state
    await page.context().storageState({ path: 'e2e/auth-state.json' });
    
    console.log('✅ Authentication state saved');
    
  } catch (error) {
    console.error('❌ Global setup failed:', error);
    throw error;
  } finally {
    await browser.close();
  }
  
  console.log('🎉 E2E test global setup completed successfully');
}

export default globalSetup;