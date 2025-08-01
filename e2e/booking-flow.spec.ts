import { test, expect } from '@playwright/test';

test.describe('Celebrity Booking Flow', () => {
  test.beforeEach(async ({ page }) => {
    // Load authenticated state
    await page.goto('/');
  });

  test('complete booking flow for celebrity', async ({ page }) => {
    // Navigate to celebrities page
    await page.click('[data-testid="nav-celebrities"]');
    await expect(page).toHaveURL(/.*\/celebrities/);
    
    // Search for a celebrity
    await page.fill('[data-testid="celebrity-search"]', 'Famous Actor');
    await page.press('[data-testid="celebrity-search"]', 'Enter');
    
    // Wait for search results
    await page.waitForSelector('[data-testid="celebrity-card"]');
    
    // Click on first celebrity
    await page.click('[data-testid="celebrity-card"]');
    await expect(page).toHaveURL(/.*\/celebrities\/.*/);
    
    // Verify celebrity details are loaded
    await expect(page.locator('[data-testid="celebrity-name"]')).toBeVisible();
    await expect(page.locator('[data-testid="celebrity-description"]')).toBeVisible();
    await expect(page.locator('[data-testid="celebrity-services"]')).toBeVisible();
    
    // Start booking process
    await page.click('[data-testid="book-celebrity-btn"]');
    await expect(page).toHaveURL(/.*\/booking/);
    
    // Fill booking form
    await page.selectOption('[data-testid="service-select"]', 'meet-and-greet');
    
    // Set event date (tomorrow)
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const dateString = tomorrow.toISOString().split('T')[0];
    await page.fill('[data-testid="event-date"]', dateString);
    
    // Fill client information
    await page.fill('[data-testid="client-name"]', 'John Doe');
    await page.fill('[data-testid="client-email"]', 'john.doe@example.com');
    await page.fill('[data-testid="client-phone"]', '+1-555-123-4567');
    
    // Fill event details
    await page.fill('[data-testid="event-location"]', 'Los Angeles, CA');
    await page.fill('[data-testid="event-duration"]', '2');
    await page.fill('[data-testid="event-requirements"]', 'Security required, VIP treatment');
    
    // Verify pricing calculation
    await expect(page.locator('[data-testid="base-price"]')).toBeVisible();
    await expect(page.locator('[data-testid="total-price"]')).toBeVisible();
    
    // Submit booking
    await page.click('[data-testid="submit-booking"]');
    
    // Wait for confirmation
    await page.waitForSelector('[data-testid="booking-confirmation"]');
    await expect(page.locator('[data-testid="booking-confirmation"]')).toContainText('Booking request submitted');
    
    // Verify booking appears in user's bookings
    await page.click('[data-testid="nav-my-bookings"]');
    await expect(page).toHaveURL(/.*\/bookings/);
    
    await page.waitForSelector('[data-testid="booking-item"]');
    await expect(page.locator('[data-testid="booking-item"]').first()).toBeVisible();
  });

  test('booking form validation', async ({ page }) => {
    await page.goto('/booking');
    
    // Try to submit empty form
    await page.click('[data-testid="submit-booking"]');
    
    // Check validation errors
    await expect(page.locator('[data-testid="error-celebrity"]')).toContainText('Celebrity is required');
    await expect(page.locator('[data-testid="error-service"]')).toContainText('Service is required');
    await expect(page.locator('[data-testid="error-date"]')).toContainText('Event date is required');
    await expect(page.locator('[data-testid="error-name"]')).toContainText('Client name is required');
    await expect(page.locator('[data-testid="error-email"]')).toContainText('Email is required');
    
    // Test email validation
    await page.fill('[data-testid="client-email"]', 'invalid-email');
    await page.click('[data-testid="submit-booking"]');
    await expect(page.locator('[data-testid="error-email"]')).toContainText('Please enter a valid email');
    
    // Test phone validation
    await page.fill('[data-testid="client-phone"]', '123');
    await page.click('[data-testid="submit-booking"]');
    await expect(page.locator('[data-testid="error-phone"]')).toContainText('Please enter a valid phone number');
    
    // Test past date validation
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const pastDate = yesterday.toISOString().split('T')[0];
    await page.fill('[data-testid="event-date"]', pastDate);
    await page.click('[data-testid="submit-booking"]');
    await expect(page.locator('[data-testid="error-date"]')).toContainText('Event date must be in the future');
  });

  test('responsive booking form on mobile', async ({ page, isMobile }) => {
    test.skip(!isMobile, 'This test is only for mobile viewports');
    
    await page.goto('/booking');
    
    // Verify mobile layout
    await expect(page.locator('[data-testid="booking-form"]')).toHaveCSS('flex-direction', 'column');
    
    // Check that form fields stack properly on mobile
    const formFields = page.locator('[data-testid^="form-field"]');
    const fieldCount = await formFields.count();
    
    for (let i = 0; i < fieldCount; i++) {
      const field = formFields.nth(i);
      await expect(field).toBeVisible();
    }
    
    // Verify mobile-specific UI elements
    await expect(page.locator('[data-testid="mobile-summary"]')).toBeVisible();
    await expect(page.locator('[data-testid="mobile-actions"]')).toBeVisible();
  });

  test('booking with special requirements', async ({ page }) => {
    await page.goto('/booking');
    
    // Pre-select celebrity and service for this test
    await page.selectOption('[data-testid="celebrity-select"]', 'celebrity-1');
    await page.selectOption('[data-testid="service-select"]', 'private-event');
    
    // Fill basic information
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const dateString = tomorrow.toISOString().split('T')[0];
    
    await page.fill('[data-testid="event-date"]', dateString);
    await page.fill('[data-testid="client-name"]', 'Jane Smith');
    await page.fill('[data-testid="client-email"]', 'jane.smith@example.com');
    await page.fill('[data-testid="client-phone"]', '+1-555-987-6543');
    await page.fill('[data-testid="event-location"]', 'New York, NY');
    await page.fill('[data-testid="event-duration"]', '4');
    
    // Add special requirements
    await page.fill('[data-testid="event-requirements"]', 'Vegetarian catering, wheelchair accessible venue, sign language interpreter needed');
    
    // Add emergency contact
    await page.fill('[data-testid="emergency-contact-name"]', 'Emergency Contact');
    await page.fill('[data-testid="emergency-contact-phone"]', '+1-555-000-0000');
    
    // Submit booking
    await page.click('[data-testid="submit-booking"]');
    
    // Verify confirmation includes special requirements
    await page.waitForSelector('[data-testid="booking-confirmation"]');
    await expect(page.locator('[data-testid="confirmation-requirements"]')).toContainText('Vegetarian catering');
    await expect(page.locator('[data-testid="confirmation-requirements"]')).toContainText('wheelchair accessible');
    await expect(page.locator('[data-testid="confirmation-requirements"]')).toContainText('sign language interpreter');
  });

  test('booking cancellation flow', async ({ page }) => {
    // First create a booking to cancel
    await page.goto('/booking');
    
    // Quick booking setup
    await page.selectOption('[data-testid="celebrity-select"]', 'celebrity-1');
    await page.selectOption('[data-testid="service-select"]', 'meet-and-greet');
    
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const dateString = tomorrow.toISOString().split('T')[0];
    
    await page.fill('[data-testid="event-date"]', dateString);
    await page.fill('[data-testid="client-name"]', 'Test User');
    await page.fill('[data-testid="client-email"]', 'test@example.com');
    await page.fill('[data-testid="client-phone"]', '+1-555-123-4567');
    await page.fill('[data-testid="event-location"]', 'Test Location');
    await page.fill('[data-testid="event-duration"]', '2');
    
    await page.click('[data-testid="submit-booking"]');
    await page.waitForSelector('[data-testid="booking-confirmation"]');
    
    // Navigate to bookings
    await page.click('[data-testid="nav-my-bookings"]');
    await page.waitForSelector('[data-testid="booking-item"]');
    
    // Click on the booking to view details
    await page.click('[data-testid="booking-item"]');
    await expect(page).toHaveURL(/.*\/bookings\/.*/);
    
    // Cancel the booking
    await page.click('[data-testid="cancel-booking-btn"]');
    
    // Confirm cancellation in modal
    await page.waitForSelector('[data-testid="cancel-confirmation-modal"]');
    await page.fill('[data-testid="cancellation-reason"]', 'Change of plans');
    await page.click('[data-testid="confirm-cancellation"]');
    
    // Verify cancellation success
    await page.waitForSelector('[data-testid="cancellation-confirmation"]');
    await expect(page.locator('[data-testid="booking-status"]')).toContainText('Cancelled');
  });

  test('accessibility compliance for booking form', async ({ page }) => {
    await page.goto('/booking');
    
    // Check for proper form labels
    await expect(page.locator('label[for="celebrity-select"]')).toBeVisible();
    await expect(page.locator('label[for="service-select"]')).toBeVisible();
    await expect(page.locator('label[for="event-date"]')).toBeVisible();
    await expect(page.locator('label[for="client-name"]')).toBeVisible();
    await expect(page.locator('label[for="client-email"]')).toBeVisible();
    
    // Check ARIA attributes
    const requiredFields = page.locator('[aria-required="true"]');
    expect(await requiredFields.count()).toBeGreaterThan(0);
    
    // Test keyboard navigation
    await page.keyboard.press('Tab');
    await expect(page.locator('[data-testid="celebrity-select"]')).toBeFocused();
    
    await page.keyboard.press('Tab');
    await expect(page.locator('[data-testid="service-select"]')).toBeFocused();
    
    await page.keyboard.press('Tab');
    await expect(page.locator('[data-testid="event-date"]')).toBeFocused();
    
    // Check for proper error announcements
    await page.click('[data-testid="submit-booking"]');
    
    // Verify error messages have proper ARIA attributes
    const errorMessages = page.locator('[role="alert"]');
    expect(await errorMessages.count()).toBeGreaterThan(0);
    
    // Check for skip links
    await expect(page.locator('[data-testid="skip-to-content"]')).toBeVisible();
  });
});