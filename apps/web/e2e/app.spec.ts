import { test, expect } from '@playwright/test';

test('home page shows the components settings inside the shell', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Components' })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Settings' })).toHaveAttribute(
    'aria-current',
    'page',
  );
});
