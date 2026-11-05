import { test, expect } from '@playwright/test';

test('home page shows heading', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Web App' })).toBeVisible();
});
