import 'dotenv/config';
import { defineConfig, devices } from '@playwright/test';
import { isProductionUrl } from './tests/helpers/environment.js';

const baseURL = process.env.PLAYWRIGHT_BASE_URL ?? 'http://localhost:3000';
const hostname = new URL(baseURL).hostname;
const local = ['localhost', '127.0.0.1', '[::1]'].includes(hostname);

if (isProductionUrl(baseURL) && process.env.TEST_ENV !== 'production-smoke') {
  throw new Error('Production requires TEST_ENV=production-smoke. Business-changing requests are blocked.');
}
if (!local && !['staging', 'production-smoke'].includes(process.env.TEST_ENV ?? '')) {
  throw new Error('For a remote test site, set TEST_ENV=staging or production-smoke in .env.');
}

export default defineConfig({
  testDir: './tests',
  fullyParallel: false,
  workers: 1,
  forbidOnly: !!process.env.CI,
  retries: process.env.TEST_ENV === 'production-smoke' ? 0 : process.env.CI ? 1 : 0,
  timeout: 60_000,
  expect: { timeout: 15_000 },
  reporter: [['list'], ['html', { open: 'never' }]],
  use: {
    ...devices['Desktop Chrome'],
    baseURL,
    timezoneId: 'Africa/Addis_Ababa',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    serviceWorkers: 'block',
  },
  projects: [
    { name: 'public', testMatch: '**/public/**/*.spec.ts' },
    { name: 'authenticated', testMatch: '**/authenticated/**/*.spec.ts' },
  ],
});
