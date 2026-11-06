import { expect, test } from '@playwright/test';
import { Pool } from 'pg';
import { PgCartRepository } from '../../src/cart/pg-cart.repository';
import { migrate } from '../../src/database/migrate';

// Needs a real Postgres (DATABASE_URL) and the API started with AUTH_DEV_ACTOR=true (user dev-lead).
const pool = new Pool({
  connectionString:
    process.env.DATABASE_URL ?? 'postgresql://postgres:postgres@localhost:5432/core_api',
});
const repo = new PgCartRepository(pool);

test.beforeAll(async () => {
  await migrate(pool);
});
test.beforeEach(async () => {
  await pool.query("DELETE FROM cart_lines WHERE owner_id IN ('dev-lead', 'someone-else')");
});
test.afterAll(async () => {
  await pool.end();
});

const stock10 = {
  partNumber: 'BR-7731-05',
  description: 'Brake pad set, front',
  sapInstance: 'SAP B (US)',
  stockShown: 10,
  quantity: 2,
};

test('migration is idempotent and has no price or ship-to column', async () => {
  expect(await migrate(pool)).toEqual([]);
  const { rows } = await pool.query(
    "SELECT column_name FROM information_schema.columns WHERE table_name = 'cart_lines'",
  );
  expect(rows.map((r) => r.column_name).join(' ')).not.toMatch(/price|ship/i);
});

test('lists only the caller’s lines, from every instance', async ({ request }) => {
  await repo.add('dev-lead', stock10);
  await repo.add('dev-lead', { ...stock10, partNumber: 'AX-4410-22', sapInstance: 'SAP A (EU)' });
  await repo.add('someone-else', { ...stock10, partNumber: 'ZZ-0000-00' });
  const body = await (await request.get('/cart')).json();
  expect(body.lines.map((l: { partNumber: string }) => l.partNumber).sort()).toEqual([
    'AX-4410-22',
    'BR-7731-05',
  ]);
  expect(JSON.stringify(body)).not.toMatch(/price|ship/i);
});

test('changes quantity, refuses over stock and invalid input, keeping the stored quantity', async ({
  request,
}) => {
  const { id } = await repo.add('dev-lead', stock10);
  const ok = await request.patch(`/cart/lines/${id}`, { data: { quantity: 5 } });
  expect(ok.status()).toBe(200);
  const over = await request.patch(`/cart/lines/${id}`, { data: { quantity: 11 } });
  expect(over.status()).toBe(409);
  expect(await over.json()).toMatchObject({ stock: 10 });
  for (const quantity of [0, 'abc']) {
    const bad = await request.patch(`/cart/lines/${id}`, { data: { quantity } });
    expect(bad.status()).toBe(400);
  }
  const { lines } = await (await request.get('/cart')).json();
  expect(lines[0].quantity).toBe(5);
  const exact = await request.patch(`/cart/lines/${id}`, { data: { quantity: 10 } });
  expect(exact.status()).toBe(200);
});

test('removes a line; another owner’s line is 404', async ({ request }) => {
  const mine = await repo.add('dev-lead', stock10);
  const theirs = await repo.add('someone-else', { ...stock10, partNumber: 'ZZ-0000-00' });
  const patch = await request.patch(`/cart/lines/${theirs.id}`, { data: { quantity: 1 } });
  expect(patch.status()).toBe(404);
  expect((await request.delete(`/cart/lines/${theirs.id}`)).status()).toBe(404);
  expect((await request.delete(`/cart/lines/${mine.id}`)).status()).toBe(204);
  expect((await (await request.get('/cart')).json()).lines).toEqual([]);
});
