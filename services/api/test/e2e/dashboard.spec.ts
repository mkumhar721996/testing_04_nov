import { expect, test } from '@playwright/test';

// Needs a database with migrations/001_accounts_and_cards.sql applied and seeds/dev-dashboard.sql
// loaded, plus the authentication layer (Entra ID story) verifying the request. Until that story
// lands no request carries a verified user, so only the 401 path can run.
test('GET /me/card-summary without a verified user is 401', async ({ request }) => {
  const res = await request.get('/me/card-summary');
  expect(res.status()).toBe(401);
});

test('GET /me without a verified user is 401', async ({ request }) => {
  const res = await request.get('/me');
  expect(res.status()).toBe(401);
});

test('GET /me/overview without a verified user is 401', async ({ request }) => {
  const res = await request.get('/me/overview');
  expect(res.status()).toBe(401);
});

test('GET /me/transactions without a verified user is 401', async ({ request }) => {
  const res = await request.get('/me/transactions');
  expect(res.status()).toBe(401);
});

test.fixme('seeded user gets only last4, expiry and balance in under 500 ms', async ({ request }) => {
  const started = Date.now();
  const res = await request.get('/me/card-summary');
  expect(Date.now() - started).toBeLessThan(500);
  expect(res.status()).toBe(200);
  expect(Object.keys(await res.json())).toEqual(['last4', 'expiry', 'balance']);
});
