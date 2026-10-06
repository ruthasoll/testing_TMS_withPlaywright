import { test, expect } from '../fixtures.js';
import { login } from '../helpers/login.js';

test('valid credentials establish a session that survives a reload', async ({ page }) => {
  await login(page);
  await page.reload();
  await expect(page.getByRole('button', { name: 'Notifications', exact: true })).toBeVisible();
  await expect(page).toHaveURL(/\/$/);
  expect(await page.evaluate(() => localStorage.getItem('accessToken'))).toBeTruthy();
});

test('signing out removes access to protected pages', async ({ page }) => {
  await login(page);
  // The desktop sign-out icon has a tooltip but no accessible button name.
  await page.getByRole('button').filter({ has: page.locator('[aria-label="logout"]') }).click();
  await expect(page).toHaveURL(/\/login$/);
  expect(await page.evaluate(() => localStorage.getItem('accessToken'))).toBeNull();
  await page.goto('/dispatches');
  await expect(page).toHaveURL(/\/login$/);
});

test('an expired API session returns the user to login', async ({ page }) => {
  await login(page);
  await page.route('**/api/auth/get-session**', (route) => route.fulfill({ json: null }));
  await page.route('**/dispatches/getAll**', (route) => route.fulfill({
    status: 401,
    json: { message: 'Session expired' },
  }));
  await page.goto('/dispatches');
  await expect(page).toHaveURL(/\/login$/);
  await expect(page.getByRole('heading', { name: 'Welcome back' })).toBeVisible();
});
