import { test, expect } from '@playwright/test';

const card = { last4: '9286', expiry: '08/32', balance: { amount: '12680.42', currency: 'USD' } };

test('Try again reloads only the card section', async ({ page }) => {
  const calls = { me: 0, card: 0 };
  await page.route('**/api/me', (route) => {
    calls.me += 1;
    return route.fulfill({ json: { name: 'Ada' } });
  });
  await page.route('**/api/me/card-summary', (route) => {
    calls.card += 1;
    return calls.card === 1 ? route.fulfill({ status: 500 }) : route.fulfill({ json: card });
  });

  await page.goto('/');
  await expect(page.getByRole('alert')).toContainText('Card and balance unavailable');
  await page.getByRole('button', { name: 'Try again' }).click();
  await expect(page.getByLabel('Card ending in 9286')).toBeVisible();
  expect(calls).toEqual({ me: 1, card: 2 });
});

test('placeholder nav items open no page', async ({ page }) => {
  await page.route('**/api/me', (route) => route.fulfill({ json: { name: 'Ada' } }));
  await page.route('**/api/me/card-summary', (route) => route.fulfill({ json: card }));
  await page.goto('/');
  for (const label of ['Loans', 'Deposits', 'Documents', 'Reports']) {
    await page.getByRole('button', { name: new RegExp(label) }).click();
    await expect(page).toHaveURL('/');
  }
});
