import { test, expect } from '@playwright/test';

test('home page shows the Dashboard', async ({ page }) => {
  await page.route('**/api/me', (route) => route.fulfill({ json: { name: 'Ada' } }));
  await page.route('**/api/me/card-summary', (route) => route.fulfill({ status: 500 }));
  await page.goto('/');
  await expect(page.getByRole('heading', { level: 1 })).toContainText('Welcome back');
});

test('items route shows the app shell', async ({ page }) => {
  await page.goto('/items');
  await expect(page.getByRole('link', { name: 'Items' })).toHaveAttribute('aria-current', 'page');
});
