import { test, expect } from '@playwright/test';

// The Core API is stubbed at the network edge here (the web app has no database access and the
// API has no create-defect endpoint yet); the API's own e2e covers the real Postgres path.
test('a Lead rejects a Triaged defect with a reason', async ({ page }) => {
  let defect: Record<string, unknown> = {
    id: 'd-1',
    key: 'DEF-14',
    title: 'Login button unresponsive on Safari',
    status: 'Triaged',
    rowVersion: 1,
    ownerId: null,
    ownerName: null,
    comments: [],
    availableMoves: [{ to: 'Rejected', label: 'Reject', requiresReason: true }],
  };
  await page.route('**/defects/d-1', (route) => route.fulfill({ json: defect }));
  await page.route('**/defects/d-1/status-moves', (route) => {
    defect = {
      ...defect,
      status: 'Rejected',
      rowVersion: 2,
      availableMoves: [],
      comments: [
        {
          id: 'c-1',
          authorName: 'Dev Lead',
          body: 'Rejected: Duplicate of DEF-12',
          createdAt: new Date().toISOString(),
        },
      ],
    };
    return route.fulfill({ json: defect });
  });

  await page.goto('/items/d-1');
  await expect(page.getByText('Status: Triaged')).toBeVisible();
  await page.getByRole('button', { name: 'Reject', exact: true }).click();
  await page.getByLabel('Reason').fill('Duplicate of DEF-12');
  await page.getByRole('button', { name: 'Reject defect' }).click();

  await expect(page.getByText('Status: Rejected')).toBeVisible();
  await expect(page.getByText('Rejected: Duplicate of DEF-12')).toBeVisible();
  await expect(page.getByText('No status move is available for a Rejected defect.')).toBeVisible();
  await expect(page.getByRole('button', { name: /^Reject/ })).toHaveCount(0);
});
