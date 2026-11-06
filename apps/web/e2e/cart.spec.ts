import { test, expect } from '@playwright/test';

// The Core API is stubbed at the network edge here; the API's own e2e covers the real Postgres path.
test('a buyer changes a quantity, is refused above stock, and removes a line', async ({ page }) => {
  await page.addInitScript(() =>
    sessionStorage.setItem(
      'session',
      JSON.stringify({ token: 'fake-token', name: 'Sam Buyer', title: 'Buyer', role: 'buyer', expiresAt: null }),
    ),
  );
  const lines = [
    { id: 'l-a', partNumber: 'AX-4410-22', description: 'Hydraulic seal kit, 40mm', sapInstance: 'SAP A (EU)', stockShown: 24, quantity: 2 },
    { id: 'l-b', partNumber: 'BR-7731-05', description: 'Brake pad set, front', sapInstance: 'SAP B (US)', stockShown: 10, quantity: 2 },
  ];
  await page.route('**/cart', (route) => route.fulfill({ json: { lines } }));
  await page.route('**/cart/lines/l-a', (route) => {
    if (route.request().method() === 'DELETE') {
      lines.shift();
      return route.fulfill({ status: 204 });
    }
    return route.fulfill({ json: { ...lines[0], quantity: 5 } });
  });
  await page.route('**/cart/lines/l-b', (route) =>
    route.fulfill({ status: 409, json: { message: 'Only 10 in stock.', stock: 10 } }),
  );

  await page.goto('/');
  await page.getByRole('link', { name: 'Cart' }).click();
  await expect(page.getByText('SAP A (EU)')).toBeVisible();
  await expect(page.getByText('SAP B (US)')).toBeVisible();

  await page.getByLabel('Qty for AX-4410-22').fill('5');
  await page.getByRole('button', { name: 'Update' }).first().click();
  await expect(page.getByText('Cart updated.')).toBeVisible();

  await page.getByLabel('Qty for BR-7731-05').fill('11');
  await page.getByRole('button', { name: 'Update' }).nth(1).click();
  await expect(page.getByText('Only 10 in stock for BR-7731-05. Quantity kept at 2.')).toBeVisible();
  await expect(page.getByLabel('Qty for BR-7731-05')).toHaveValue('2');

  await page.getByRole('button', { name: 'Remove AX-4410-22' }).click();
  await expect(page.getByText('AX-4410-22')).toHaveCount(0);
});
