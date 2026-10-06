import { expect, type Page } from '@playwright/test';
import { required } from './environment.js';

export async function login(page: Page, restricted = false): Promise<void> {
  const prefix = restricted ? 'TMS_RESTRICTED' : 'TMS';
  const email = required(`${prefix}_EMAIL`);
  const password = required(`${prefix}_PASSWORD`);
  const organizationId = required(`${prefix}_ORG_ID`);

  await page.goto('/login');
  await page.getByLabel('Email', { exact: true }).fill(email);
  await page.getByLabel('Password', { exact: true }).fill(password);
  const organizationsResponse = page.waitForResponse((response) =>
    new URL(response.url()).pathname.endsWith('/auth/get-user-organizations'),
  );
  await page.getByRole('button', { name: 'Login', exact: true }).click();
  const response = await organizationsResponse;
  expect(response.ok(), 'Account organization lookup should succeed').toBe(true);
  const organizations: { organizationId: number; organizationName?: string }[] = await response.json();
  const organization = organizations.find((org) => String(org.organizationId) === organizationId);
  expect(organization, `Account must have access to organization ${organizationId}`).toBeDefined();
  const organizationName = organization!.organizationName || `Organization ${organizationId}`;

  // Wait for either organization selection or a completed single-organization login.
  await expect(async () => {
    const choosingOrganization = await page.getByRole('dialog', { name: 'Select Organization' }).isVisible();
    const signedIn = new URL(page.url()).pathname === '/';
    expect(choosingOrganization || signedIn).toBe(true);
  }).toPass({ timeout: 20_000 });

  const dialog = page.getByRole('dialog', { name: 'Select Organization' });
  if (await dialog.isVisible()) {
    await dialog.getByRole('combobox').click();
    // Ant Design exposes option names through its visible dropdown items.
    await page.locator('.ant-select-item-option').filter({ hasText: organizationName }).getByText(organizationName, { exact: true }).click();
    await dialog.getByRole('button', { name: 'Continue', exact: true }).click();
  }

  await expect(page).toHaveURL(/\/$/);
  await expect.poll(() => page.evaluate(() => localStorage.getItem('organizationId'))).toBe(organizationId);
  await expect.poll(() => page.evaluate(() => localStorage.getItem('accessToken'))).toBeTruthy();
  // Dispatches initially filter by this value; wait for the dashboard profile request.
  await expect.poll(() => page.evaluate(() => localStorage.getItem('userId'))).toMatch(/^\d+$/);
  await expect(page.getByRole('button', { name: 'Notifications', exact: true })).toBeVisible();
}
