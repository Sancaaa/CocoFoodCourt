import { test, expect } from '@playwright/test';

test.describe('Sanity & Integration Flow', () => {
  test('should load booking flow, select table, skip pre-order, and create reservation', async ({ page }) => {
    // 1. Go to booking page
    await page.goto('/book');
    await expect(page.locator('h1')).toContainText('When are you visiting?');

    // 2. Select Arrival and Departure times
    // Let's click arrival time (e.g. 10:00 or 12:00)
    await page.click('button:has-text("12:00")');
    await page.click('button:has-text("14:00")');

    // Click Find Tables
    await page.click('button:has-text("Find Tables")');

    // 3. Table Selection step
    await expect(page.locator('h1')).toContainText('Choose your table');
    // We should see Table A1 from the mock server
    await expect(page.locator('text=Table A1')).toBeVisible();
    await page.click('text=Table A1');
    await page.click('button:has-text("Next")');

    // 4. Pre-order step
    await expect(page.locator('h1')).toContainText('Pre-order your meals');
    // We should see menu items from mock server
    await expect(page.locator('text=Nasi Goreng Spesial')).toBeVisible();
    await page.click('button:has-text("Skip Pre-order")');

    // 5. Customer Details step
    await expect(page.locator('h1')).toContainText("Who's coming?");
    await page.fill('#name', 'Test Customer');
    await page.fill('#phone', '081234567890');
    await page.fill('#email', 'test@example.com');
    await page.fill('#notes', 'Please seat us near the window.');

    // Submit reservation
    await page.click('button:has-text("Confirm Reservation")');

    // 6. Verification: Redirect to Dashboard
    await page.waitForURL('**/dashboard');
    await expect(page.locator('text=Dashboard')).toBeVisible();
  });
});
