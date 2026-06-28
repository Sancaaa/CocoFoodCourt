import { test, expect } from '@playwright/test';

test.describe('Registration Flow', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/register');
  });

  test('Tier 1: Happy path registration creates user and redirects to login', async ({ page }) => {
    const randomEmail = `testuser_${Date.now()}@example.com`;

    await page.fill('#name', 'Jane Doe');
    await page.fill('#email', randomEmail);
    await page.fill('#password', 'SecurePassword123');
    await page.fill('#confirmPassword', 'SecurePassword123');
    await page.click('button[type="submit"]');

    // Should see success message
    await expect(page.locator('#register-success')).toBeVisible();
    await expect(page.locator('#register-success')).toContainText('Registration successful');

    // Wait for redirect to login page
    await page.waitForURL('**/login**');

    // Verify we can log in with new credentials
    await page.fill('#email', randomEmail);
    await page.fill('#password', 'SecurePassword123');
    await page.click('button[type="submit"]');
    await page.waitForURL('**/dashboard');
    await expect(page.locator('#navbar-user-name')).toContainText('Jane Doe');
  });

  test('Tier 2: Boundary/corner cases - password mismatch, email format, duplicates, SQL Injection characters', async ({ page }) => {
    const duplicateEmail = `dup_${Date.now()}@example.com`;

    // 1. Password mismatch
    await page.fill('#name', 'Mismatched User');
    await page.fill('#email', 'mismatch@example.com');
    await page.fill('#password', 'Password123');
    await page.fill('#confirmPassword', 'Different123');
    await page.click('button[type="submit"]');
    await expect(page.locator('#register-error')).toBeVisible();
    await expect(page.locator('#register-error')).toContainText('Passwords do not match');

    // 2. Email format validation
    await page.fill('#email', 'invalidemail.com');
    await page.fill('#password', 'Password123');
    await page.fill('#confirmPassword', 'Password123');
    await page.click('button[type="submit"]');
    await expect(page.locator('#register-error')).toBeVisible();
    await expect(page.locator('#register-error')).toContainText('Invalid email format');

    // 3. Setup duplicate user
    await page.goto('/register');
    await page.fill('#name', 'Dup User');
    await page.fill('#email', duplicateEmail);
    await page.fill('#password', 'Password123');
    await page.fill('#confirmPassword', 'Password123');
    await page.click('button[type="submit"]');
    await page.waitForURL('**/login**');

    // Try registering same email again
    await page.goto('/register');
    await page.fill('#name', 'Dup User');
    await page.fill('#email', duplicateEmail);
    await page.fill('#password', 'Password123');
    await page.fill('#confirmPassword', 'Password123');
    await page.click('button[type="submit"]');
    await expect(page.locator('#register-error')).toBeVisible();
    await expect(page.locator('#register-error')).toContainText('Email already registered');

    // 4. Inputs with SQL-injection-like characters (should be sanitized/escaped correctly)
    const sqlEmail = `sql_${Date.now()}@example.com`;
    await page.fill('#name', "Robert'); DROP TABLE res_users; --");
    await page.fill('#email', sqlEmail);
    await page.fill('#password', "admin' OR '1'='1");
    await page.fill('#confirmPassword', "admin' OR '1'='1");
    await page.click('button[type="submit"]');
    await page.waitForURL('**/login**');

    // Login to verify the user exists with literal SQL characters name
    await page.fill('#email', sqlEmail);
    await page.fill('#password', "admin' OR '1'='1");
    await page.click('button[type="submit"]');
    await page.waitForURL('**/dashboard');
    await expect(page.locator('#navbar-user-name')).toContainText("Robert'); DROP TABLE res_users; --");
  });
});
