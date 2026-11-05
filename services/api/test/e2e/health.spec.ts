import { expect, test } from '@playwright/test';

test('GET /health returns ok', async ({ request }) => {
  const res = await request.get('/health');
  expect(res.ok()).toBe(true);
  expect(await res.json()).toEqual({ status: 'ok' });
});
