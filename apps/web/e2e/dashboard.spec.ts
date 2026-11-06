import { test, expect } from '@playwright/test';

const card = { last4: '9286', expiry: '08/32', balance: { amount: '12680.42', currency: 'USD' } };

const overview = {
  year: 2026,
  currency: 'USD',
  total: '1842.56',
  trend: { direction: 'up', percent: '2.46', previousYear: 2025 },
  months: Array.from({ length: 12 }, (_, i) => ({ month: i + 1, net: String(100 + i) })),
  hasMovement: true,
};
const transactions = [
  {
    id: '1',
    merchant: 'Adobe Creative Cloud',
    occurredAt: '2026-11-06T09:42:00.000Z',
    status: 'in_progress',
    cardLast4: '2841',
    amount: '-59.99',
  },
];

test('an overview failure leaves the transactions list intact', async ({ page }) => {
  await page.route('**/api/me', (route) => route.fulfill({ json: { name: 'Ada' } }));
  await page.route('**/api/me/card-summary', (route) => route.fulfill({ json: card }));
  await page.route('**/api/me/overview', (route) => route.fulfill({ status: 500 }));
  await page.route('**/api/me/transactions', (route) => route.fulfill({ json: transactions }));
  await page.goto('/');
  await expect(page.getByRole('alert', { name: /overview unavailable/i })).toBeVisible();
  await expect(page.getByText('Adobe Creative Cloud')).toBeVisible();
});

test('a transactions failure leaves the overview intact', async ({ page }) => {
  await page.route('**/api/me', (route) => route.fulfill({ json: { name: 'Ada' } }));
  await page.route('**/api/me/card-summary', (route) => route.fulfill({ json: card }));
  await page.route('**/api/me/overview', (route) => route.fulfill({ json: overview }));
  await page.route('**/api/me/transactions', (route) => route.fulfill({ status: 500 }));
  await page.goto('/');
  await expect(page.getByRole('alert', { name: /recent transactions unavailable/i })).toBeVisible();
  await expect(page.getByLabel(/Total for 2026/)).toBeVisible();
  await expect(page.getByRole('img', { name: /one bar for each month/i })).toBeVisible();
});

test('Try again reloads only the card section', async ({ page }) => {
  await page.route('**/api/me/overview', (route) => route.fulfill({ json: overview }));
  await page.route('**/api/me/transactions', (route) => route.fulfill({ json: transactions }));
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
  await page.route('**/api/me/overview', (route) => route.fulfill({ json: overview }));
  await page.route('**/api/me/transactions', (route) => route.fulfill({ json: transactions }));
  await page.route('**/api/me', (route) => route.fulfill({ json: { name: 'Ada' } }));
  await page.route('**/api/me/card-summary', (route) => route.fulfill({ json: card }));
  await page.goto('/');
  for (const label of ['Loans', 'Deposits', 'Documents', 'Reports']) {
    await page.getByRole('button', { name: new RegExp(label) }).click();
    await expect(page).toHaveURL('/');
  }
});
