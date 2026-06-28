import { test, expect } from '@playwright/test';

test.describe('Login Flow', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login');
  });

  test('Tier 1: Happy path credential login redirects to dashboard and displays user name in Navbar', async ({ page }) => {
    // Fill credentials
    await page.fill('#email', 'admin');
    await page.fill('#password', 'admin');
    await page.click('button[type="submit"]');

    // Verify redirect to dashboard
    await page.waitForURL('**/dashboard');
    await expect(page.locator('text=Dashboard')).toBeVisible();

    // Verify name is visible on Navbar
    await expect(page.locator('#navbar-user-name')).toContainText('Admin');
  });

  test('Tier 1: Invalid credentials return error banner', async ({ page }) => {
    await page.fill('#email', 'nonexistent@example.com');
    await page.fill('#password', 'wrongpassword');
    await page.click('button[type="submit"]');

    // Verify error message is visible
    await expect(page.locator('#login-error')).toBeVisible();
    await expect(page.locator('#login-error')).toContainText('Invalid credentials');
  });

  test('Tier 2: Boundary/corner cases - empty fields, extremely long inputs, special chars, logout redirection', async ({ page }) => {
    // 1. Empty fields (HTML5 validation should prevent submission, or show validation error)
    await page.click('button[type="submit"]');
    // Ensure we are still on login page
    await expect(page.url()).toContain('/login');

    // 2. Extremely long inputs
    const longString = 'a'.repeat(500) + '@example.com';
    await page.fill('#email', longString);
    await page.fill('#password', 'a'.repeat(500));
    await page.click('button[type="submit"]');
    await expect(page.locator('#login-error')).toBeVisible();

    // 3. Special/unicode characters in login fields
    await page.fill('#email', 'üñîcødê@example.com');
    await page.fill('#password', 'spécial_ch@r$');
    await page.click('button[type="submit"]');
    await expect(page.locator('#login-error')).toBeVisible();

    // 4. Successful login -> Logout clears session and redirects back to login page
    await page.fill('#email', 'admin');
    await page.fill('#password', 'admin');
    await page.click('button[type="submit"]');
    await page.waitForURL('**/dashboard');

    // Click logout
    await page.click('text=Logout');
    
    // Verify redirection to home or login page (Navbar logout redirects to home '/')
    await page.waitForURL('**/');
    
    // Attempting to visit /dashboard should show it but it is protected or has no session
    // Let's verify navbar now has "Login" link instead of "Logout"
    await expect(page.locator('text=Login')).toBeVisible();
  });
});
