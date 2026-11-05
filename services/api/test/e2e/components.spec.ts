import { APIRequestContext, expect, test } from '@playwright/test';
import { Pool } from 'pg';

const lead = { Authorization: 'Bearer lead-token' };
const reporter = { Authorization: 'Bearer reporter-token' };

interface Component {
  id: string;
  name: string;
  status: string;
}

const pool = new Pool({
  connectionString:
    process.env.DATABASE_URL ?? 'postgresql://postgres:postgres@localhost:5432/core_api',
});

test.beforeEach(async () => {
  await pool.query('DELETE FROM components');
});

test.afterAll(() => pool.end());

async function add(request: APIRequestContext, name: string): Promise<Component> {
  const res = await request.post('/components', { data: { name }, headers: lead });
  expect(res.status()).toBe(201);
  return res.json();
}

async function list(request: APIRequestContext, query = ''): Promise<Component[]> {
  return (await request.get(`/components${query}`, { headers: lead })).json();
}

test('a non-Lead cannot change the list (AC1)', async ({ request }) => {
  const billing = await add(request, 'Billing');
  const before = await list(request);

  const post = await request.post('/components', { data: { name: 'X' }, headers: reporter });
  const patch = await request.patch(`/components/${billing.id}`, {
    data: { name: 'X' },
    headers: reporter,
  });
  const retire = await request.post(`/components/${billing.id}/retire`, { headers: reporter });

  expect([post.status(), patch.status(), retire.status()]).toEqual([403, 403, 403]);
  expect(await list(request)).toEqual(before);
});

test('requests without a token get 401', async ({ request }) => {
  expect((await request.get('/components')).status()).toBe(401);
});

test('an added component is a dropdown choice (AC3)', async ({ request }) => {
  await add(request, 'Billing');
  const active = await list(request, '?status=active');
  expect(active.map((c) => c.name)).toContain('Billing');
});

test('a renamed component replaces the old name in the dropdown and keeps its id (AC4, AC9)', async ({
  request,
}) => {
  const billing = await add(request, 'Billing');
  const res = await request.patch(`/components/${billing.id}`, {
    data: { name: 'Payments' },
    headers: lead,
  });
  expect(res.status()).toBe(200);
  expect((await res.json()).id).toBe(billing.id);
  const names = (await list(request, '?status=active')).map((c) => c.name);
  expect(names).toContain('Payments');
  expect(names).not.toContain('Billing');
});

test('a retired component stays on record but leaves the dropdown (AC5, AC6)', async ({
  request,
}) => {
  const legacy = await add(request, 'Legacy');
  await add(request, 'Billing');
  const countBefore = (await pool.query('SELECT count(*) FROM components')).rows[0].count;

  const res = await request.post(`/components/${legacy.id}/retire`, { headers: lead });
  expect(res.status()).toBe(200);

  expect(await list(request)).toContainEqual({ id: legacy.id, name: 'Legacy', status: 'retired' });
  expect((await list(request, '?status=active')).map((c) => c.name)).not.toContain('Legacy');
  expect((await pool.query('SELECT count(*) FROM components')).rows[0].count).toBe(countBefore);
});

test('renaming to an existing name is refused by the unique index (AC7)', async ({ request }) => {
  const billing = await add(request, 'Billing');
  await add(request, 'Payments');
  const res = await request.patch(`/components/${billing.id}`, {
    data: { name: 'payments' },
    headers: lead,
  });
  expect(res.status()).toBe(409);
  expect((await list(request)).map((c) => c.name)).toContain('Billing');
});

test('the only active component cannot be retired (AC8)', async ({ request }) => {
  const billing = await add(request, 'Billing');
  const res = await request.post(`/components/${billing.id}/retire`, { headers: lead });
  expect(res.status()).toBe(409);
  expect((await list(request, '?status=active')).map((c) => c.name)).toEqual(['Billing']);
});

test('two concurrent retires cannot leave zero active components (AC8)', async ({ request }) => {
  const a = await add(request, 'Billing');
  const b = await add(request, 'Payments');
  const results = await Promise.all(
    [a, b].map((c) => request.post(`/components/${c.id}/retire`, { headers: lead })),
  );
  expect(results.map((r) => r.status()).sort()).toEqual([200, 409]);
  expect(await list(request, '?status=active')).toHaveLength(1);
});
