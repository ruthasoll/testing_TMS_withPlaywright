import { test, expect } from '../fixtures.js';

test('a protected dispatch page redirects a signed-out user to login', async ({ page }) => {
  await page.goto('/dispatches');
  await expect(page).toHaveURL(/\/login(?:\?.*)?$/);
  await expect(page.getByRole('heading', { name: 'Welcome back' })).toBeVisible();
});

test('email and password are required', async ({ page }) => {
  await page.goto('/login');
  await page.getByRole('button', { name: 'Login', exact: true }).click();
  await expect(page.getByText('Please input your email.', { exact: true })).toBeVisible();
  await expect(page.getByText('Please input your password.', { exact: true })).toBeVisible();
});

test('rejected credentials show an error and leave the user signed out', async ({ page }) => {
  // Simulate rejection without repeated failed login attempts against a real account.
  await page.route('**/api/auth/sign-in/email', (route) => route.fulfill({
    status: 401,
    headers: {
      'access-control-allow-origin': new URL(process.env.PLAYWRIGHT_BASE_URL ?? 'http://localhost:3000').origin,
      'access-control-allow-credentials': 'true',
    },
    json: { code: 'INVALID_EMAIL_OR_PASSWORD', message: 'Invalid email or password' },
  }));
  await page.goto('/login');
  await page.getByLabel('Email', { exact: true }).fill('invalid@example.com');
  await page.getByLabel('Password', { exact: true }).fill('invalid-password');
  await page.getByRole('button', { name: 'Login', exact: true }).click();
  await expect(page.getByText('Wrong Password', { exact: true })).toBeVisible();
  await expect(page).toHaveURL(/\/login$/);
  expect(await page.evaluate(() => localStorage.getItem('accessToken'))).toBeNull();
});
