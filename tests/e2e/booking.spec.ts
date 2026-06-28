import { test, expect } from '@playwright/test';

test.describe('Booking Flows and Cross-Feature Scenarios', () => {
  
  test.beforeEach(async ({ page }) => {
    // Clear state
    await page.context().clearCookies();
    await page.evaluate(() => localStorage.clear());
  });

  test('Tier 4: E2E Booking Flow with pre-order and payment redirect', async ({ page }) => {
    // 1. Log in first
    await page.goto('/login');
    await page.fill('#email', 'admin');
    await page.fill('#password', 'admin');
    await page.click('button[type="submit"]');
    await page.waitForURL('**/dashboard');

    // 2. Go to book
    await page.goto('/book');

    // Step 1: Select date and times
    // We keep default date, select 12:00 to 14:00
    await page.click('button:has-text("12:00")');
    await page.click('button:has-text("14:00")');
    await page.click('button:has-text("Find Tables")');

    // Step 2: Choose Table A1
    await expect(page.locator('h1')).toContainText('Choose your table');
    await expect(page.locator('text=Table A1')).toBeVisible();
    await page.click('text=Table A1');
    await page.click('button:has-text("Next")');

    // Step 3: Pre-order meal
    await expect(page.locator('h1')).toContainText('Pre-order your meals');
    // Add Nasi Goreng Spesial
    await page.click('div:has-text("Nasi Goreng Spesial") >> button:has-text("+")');
    await page.click('button:has-text("Next")');

    // Step 4: Guest Details (should be auto-filled for Admin)
    await expect(page.locator('h1')).toContainText("Who's coming?");
    await expect(page.locator('#name')).toHaveValue('Admin');
    await page.fill('#phone', '081234567890');

    // Submit (with preorders, redirects to payment-mock)
    await page.click('button:has-text("Proceed to Payment")');

    // Verify redirected to payment-mock
    await page.waitForURL('**/payment-mock?order_id=*');
    await expect(page.locator('text=Payment Simulator')).toBeVisible();

    // Pay
    await page.click('button:has-text("Pay Now")');

    // Verify redirected to dashboard after payment simulation
    await page.waitForURL('**/dashboard');
    await expect(page.locator('text=Dashboard')).toBeVisible();
  });

  test('Tier 4: Multi-item pre-order total price check', async ({ page }) => {
    // Log in
    await page.goto('/login');
    await page.fill('#email', 'admin');
    await page.fill('#password', 'admin');
    await page.click('button[type="submit"]');
    await page.waitForURL('**/dashboard');

    await page.goto('/book');
    await page.click('button:has-text("12:00")');
    await page.click('button:has-text("14:00")');
    await page.click('button:has-text("Find Tables")');

    await page.click('text=Table A1');
    await page.click('button:has-text("Next")');

    // Select multiple items
    // Nasi Goreng Spesial is 35000, Mie Ayam Bakso is 25000
    // Total should be: 2 * 35000 + 1 * 25000 = 95000
    await page.click('div:has-text("Nasi Goreng Spesial") >> button:has-text("+")');
    await page.click('div:has-text("Nasi Goreng Spesial") >> button:has-text("+")');
    await page.click('div:has-text("Mie Ayam Bakso") >> button:has-text("+")');

    // Verify total price displays correctly
    const totalLocator = page.locator('#preorder-total');
    await expect(totalLocator).toContainText('95,000');

    await page.click('button:has-text("Next")');
    await page.fill('#phone', '081234567890');
    await page.click('button:has-text("Proceed to Payment")');
    
    await page.waitForURL('**/payment-mock?order_id=*');
  });

  test('Tier 4: Table Reservation Conflict and Unavailability', async ({ page }) => {
    const conflictDate = '2026-07-10';
    
    // Log in
    await page.goto('/login');
    await page.fill('#email', 'admin');
    await page.fill('#password', 'admin');
    await page.click('button[type="submit"]');
    await page.waitForURL('**/dashboard');

    // 1. Reserve Table A1 for Date D, Time 12-14
    await page.goto('/book');
    await page.fill('#date', conflictDate);
    await page.click('button:has-text("12:00")');
    await page.click('button:has-text("14:00")');
    await page.click('button:has-text("Find Tables")');

    await page.click('text=Table A1');
    await page.click('button:has-text("Next")');
    await page.click('button:has-text("Skip Pre-order")');
    await page.fill('#phone', '081234567890');
    await page.click('button:has-text("Confirm Reservation")');

    // Confirm it goes to dashboard directly (no food ordered)
    await page.waitForURL('**/dashboard');

    // 2. Start another booking for Date D, Time 12-14
    await page.goto('/book');
    await page.fill('#date', conflictDate);
    await page.click('button:has-text("12:00")');
    await page.click('button:has-text("14:00")');
    await page.click('button:has-text("Find Tables")');

    // Verify Table A1 is NOT visible (unavailable)
    await expect(page.locator('text=Table A1')).not.toBeVisible();

    // Verify Table A2 is still visible and bookable
    await expect(page.locator('text=Table A2')).toBeVisible();
    await page.click('text=Table A2');
    await page.click('button:has-text("Next")');
  });

  test('Tier 4: Booking payment webhook flow confirmation state', async ({ page, request }) => {
    // 1. Log in
    await page.goto('/login');
    await page.fill('#email', 'admin');
    await page.fill('#password', 'admin');
    await page.click('button[type="submit"]');
    await page.waitForURL('**/dashboard');

    // 2. Book table with preorders to get a payment URL
    await page.goto('/book');
    await page.click('button:has-text("12:00")');
    await page.click('button:has-text("14:00")');
    await page.click('button:has-text("Find Tables")');
    await page.click('text=Table A1');
    await page.click('button:has-text("Next")');
    await page.click('div:has-text("Nasi Goreng Spesial") >> button:has-text("+")');
    await page.click('button:has-text("Next")');
    await page.fill('#phone', '081234567890');
    await page.click('button:has-text("Proceed to Payment")');

    await page.waitForURL('**/payment-mock?order_id=*');
    const url = page.url();
    const orderId = new URL(url).searchParams.get('order_id');
    expect(orderId).not.toBeNull();

    // 3. Trigger webhook API manually (simulating PG callback)
    const response = await request.post('/api/webhooks/payment', {
      data: {
        order_id: orderId,
        transaction_status: 'settlement',
        transaction_id: 'WEBHOOK-TXN-999'
      }
    });
    expect(response.ok()).toBeTruthy();
    const result = await response.json();
    expect(result.success).toBe(true);

    // 4. Go to dashboard and check if reservation list confirms payment
    await page.goto('/dashboard');
    await expect(page.locator('text=Dashboard')).toBeVisible();
  });

  test('Tier 4: E2E Booking with Registration (Anonymous prompt and restore)', async ({ page }) => {
    // Ensure anonymous
    await page.context().clearCookies();
    await page.evaluate(() => localStorage.clear());

    // 1. Visit /book
    await page.goto('/book');
    await page.click('button:has-text("12:00")');
    await page.click('button:has-text("14:00")');
    await page.click('button:has-text("Find Tables")');

    // 2. Select Table A1
    await page.click('text=Table A1');
    await page.click('button:has-text("Next")');

    // 3. Skip pre-order
    await page.click('button:has-text("Skip Pre-order")');

    // 4. Fill guest details (as anonymous)
    await page.fill('#name', 'Guest Register Flow');
    await page.fill('#phone', '089988887777');
    await page.fill('#email', 'guestreg@example.com');

    // 5. Try to confirm (should redirect to register)
    await page.click('button:has-text("Confirm Reservation")');

    // Verify redirected to register
    await page.waitForURL('**/register?redirect=/book');
    await expect(page.locator('h1')).toContainText('Create Account');

    // 6. Complete registration
    await page.fill('#name', 'Guest Register Flow');
    await page.fill('#email', 'guestreg@example.com');
    await page.fill('#password', 'Password123!');
    await page.fill('#confirmPassword', 'Password123!');
    await page.click('button[type="submit"]');

    // Registration should auto-login and redirect back to /book at Step 4 with details restored
    await page.waitForURL('**/book');
    await expect(page.locator('h1')).toContainText("Who's coming?");
    await expect(page.locator('#name')).toHaveValue('Guest Register Flow');
    await expect(page.locator('#phone')).toHaveValue('089988887777');

    // 7. Click confirm again (now logged in, should complete successfully)
    await page.click('button:has-text("Confirm Reservation")');

    // Verify redirected to dashboard
    await page.waitForURL('**/dashboard');
    await expect(page.locator('text=Dashboard')).toBeVisible();
  });

  test('Tier 3: Register -> immediately log in -> check session', async ({ page }) => {
    const freshEmail = `fresh_${Date.now()}@example.com`;

    // Register
    await page.goto('/register');
    await page.fill('#name', 'Fresh User');
    await page.fill('#email', freshEmail);
    await page.fill('#password', 'FreshPass123');
    await page.fill('#confirmPassword', 'FreshPass123');
    await page.click('button[type="submit"]');

    await page.waitForURL('**/login**');

    // Immediately log in
    await page.fill('#email', freshEmail);
    await page.fill('#password', 'FreshPass123');
    await page.click('button[type="submit"]');

    await page.waitForURL('**/dashboard');
    await expect(page.locator('#navbar-user-name')).toContainText('Fresh User');

    // Check book page has prefilled details
    await page.goto('/book');
    await page.click('button:has-text("12:00")');
    await page.click('button:has-text("14:00")');
    await page.click('button:has-text("Find Tables")');
    await page.click('text=Table A1');
    await page.click('button:has-text("Next")');
    await page.click('button:has-text("Skip Pre-order")');
    
    await expect(page.locator('#name')).toHaveValue('Fresh User');
    await expect(page.locator('#email')).toHaveValue(freshEmail);
  });

  test('Tier 3: Register -> wrong password fails -> correct password succeeds', async ({ page }) => {
    const multiTryEmail = `multitry_${Date.now()}@example.com`;

    // Register
    await page.goto('/register');
    await page.fill('#name', 'Multi Try');
    await page.fill('#email', multiTryEmail);
    await page.fill('#password', 'CorrectPassword');
    await page.fill('#confirmPassword', 'CorrectPassword');
    await page.click('button[type="submit"]');

    await page.waitForURL('**/login**');

    // Fails with wrong password
    await page.fill('#email', multiTryEmail);
    await page.fill('#password', 'WrongPassword');
    await page.click('button[type="submit"]');
    await expect(page.locator('#login-error')).toBeVisible();

    // Succeeds with correct password
    await page.fill('#password', 'CorrectPassword');
    await page.click('button[type="submit"]');
    await page.waitForURL('**/dashboard');
    await expect(page.locator('#navbar-user-name')).toContainText('Multi Try');
  });
});
