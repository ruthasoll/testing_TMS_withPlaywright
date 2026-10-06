import { test, expect } from '../fixtures.js';
import { login } from '../helpers/login.js';
import { required } from '../helpers/environment.js';

test('switching organizations updates the organization header used for dispatches', async ({ page }) => {
  const secondId = required('TMS_SECOND_ORG_ID');
  expect(secondId).not.toBe(required('TMS_ORG_ID'));
  const organizationsResponse = page.waitForResponse((response) =>
    new URL(response.url()).pathname.endsWith('/auth/get-user-organizations'),
  );
  await login(page);
  const organizations: { organizationId: number; organizationName: string }[] = await (await organizationsResponse).json();
  const secondOrganization = organizations.find((org) => String(org.organizationId) === secondId);
  test.skip(!secondOrganization, `Account is not assigned to organization ${secondId}; grant test access before switching.`);
  const secondName = secondOrganization!.organizationName;
  const switched = page.waitForEvent('load');
  await page.locator('header').getByRole('combobox').click();
  await page.locator('.ant-select-item-option').filter({ hasText: secondName }).getByText(secondName, { exact: true }).click();
  await switched;
  await expect.poll(() => page.evaluate(() => localStorage.getItem('organizationId'))).toBe(secondId);
  await expect(page.getByRole('button', { name: 'Notifications', exact: true })).toBeVisible();

  const responsePromise = page.waitForResponse((response) =>
    new URL(response.url()).pathname.endsWith('/dispatches/getAll') &&
    response.request().headers()['x-organization-id'] === secondId,
  );
  await page.goto('/dispatches');
  const response = await responsePromise;
  expect(response.ok()).toBe(true);
});

test('a Maintenance Viewer cannot open the dispatch list by direct URL', async ({ page }) => {
  test.skip(!process.env.TMS_RESTRICTED_EMAIL, 'Provide a separate Maintenance Viewer account to test this role.');
  await login(page, true);
  await page.goto('/dispatches');
  await expect(page).toHaveURL(/\/vehicles(?:\?.*)?$/);
  await expect(page.getByPlaceholder('Search', { exact: true }).filter({ visible: true })).toBeVisible();
});
