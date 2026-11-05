import { test, expect } from '@playwright/test';

test('home page shows the app shell', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('link', { name: 'Items' })).toHaveAttribute('aria-current', 'page');
});
