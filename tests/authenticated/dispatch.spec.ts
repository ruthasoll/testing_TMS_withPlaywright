import { test, expect } from '../fixtures.js';
import { login } from '../helpers/login.js';

test('search finds a shipment and opens its matching detail', async ({ page }) => {
  await login(page);

  const listResponse = page.waitForResponse((response) =>
    new URL(response.url()).pathname.endsWith('/dispatches/getAll'),
  );
  await page.goto('/dispatches');
  const response = await listResponse;
  expect(response.ok()).toBe(true);
  expect(response.request().headers()['x-organization-id']).toBe(process.env.TMS_ORG_ID);
  const { data }: { data: { dispatchid: number; fo_number: string }[] } = await response.json();
  expect(Array.isArray(data)).toBe(true);
  const configuredId = process.env.TMS_DISPATCH_ID;
  const shipment = configuredId
    ? data.find((item) => String(item.dispatchid) === configuredId)
    : data.find((item) => item.fo_number && data.filter((other) => other.fo_number === item.fo_number).length === 1);
  if (configuredId) expect(shipment, 'Configured dispatch must be visible on the first list page').toBeDefined();
  test.skip(!shipment, 'No shipment with a unique FO number is visible; provide seeded dispatch data.');
  const dispatchId = String(shipment!.dispatchid);
  const foNumber = process.env.TMS_DISPATCH_FO_NUMBER || shipment!.fo_number;

  const search = page.getByPlaceholder('Search', { exact: true }).filter({ visible: true });
  await expect(search).toBeVisible();
  const searchResponse = page.waitForResponse((response) => {
    const url = new URL(response.url());
    return url.pathname.endsWith('/dispatches/getAll') && decodeURIComponent(url.search).includes(foNumber);
  });
  await search.fill(foNumber);
  await search.press('Enter');
  expect((await searchResponse).ok()).toBe(true);

  const shipmentRow = page.getByRole('row').filter({ has: page.getByText(foNumber, { exact: true }) });
  await expect(shipmentRow).toHaveCount(1);
  await expect(shipmentRow).toBeVisible();
  const detailResponse = page.waitForResponse((response) =>
    new URL(response.url()).pathname.endsWith(`/dispatches/getById/${dispatchId}`),
  );
  // The final cell opens detail; clicking the FO text generates a PDF.
  await shipmentRow.getByRole('cell').last().click();
  expect((await detailResponse).ok()).toBe(true);
  await expect(page).toHaveURL(new RegExp(`/dispatches/detail/${dispatchId}$`));
  const identity = page.getByRole('heading', { name: 'Dispatch Identity', exact: true }).locator('..');
  await expect(identity.getByText(foNumber, { exact: true })).toBeVisible();
});
