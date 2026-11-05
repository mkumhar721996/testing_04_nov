import { expect, test } from '@playwright/test';
import { Pool } from 'pg';
import { migrate } from '../../src/database/migrate';

// Needs a real Postgres (DATABASE_URL) and the API started with AUTH_DEV_ACTOR=true (fixed Lead).
const pool = new Pool({
  connectionString:
    process.env.DATABASE_URL ?? 'postgresql://postgres:postgres@localhost:5432/core_api',
});
const run = `${Date.now()}`;

test.beforeAll(async () => {
  await migrate(pool);
  await pool.query(
    `INSERT INTO app_users (id, name, role) VALUES
       ($1, 'E2E Developer', 'Developer'), ($2, 'E2E Tester', 'Tester'), ($3, 'E2E Lead', 'Lead')
     ON CONFLICT (id) DO NOTHING`,
    [`dev-${run}`, `tester-${run}`, `lead-${run}`],
  );
});
test.afterAll(async () => {
  await pool.query('DELETE FROM app_users WHERE id = ANY($1)', [
    [`dev-${run}`, `tester-${run}`, `lead-${run}`],
  ]);
  await pool.end();
});

test('migration 002 is idempotent', async () => {
  expect(await migrate(pool)).toEqual([]);
});

test('only Developers are offered, and only they can be assigned', async ({ request }) => {
  const ids = (await (await request.get('/developers')).json()).map((d: { id: string }) => d.id);
  expect(ids).toContain(`dev-${run}`);
  expect(ids).not.toContain(`tester-${run}`);
  expect(ids).not.toContain(`lead-${run}`);

  const { rows } = await pool.query(
    "INSERT INTO defects (key, title, status) VALUES ($1, 't', 'New') RETURNING id",
    [`E2E-OWN-${run}`],
  );
  const id = rows[0].id;
  const bad = await request.put(`/defects/${id}/owner`, {
    data: { ownerId: `tester-${run}`, expectedVersion: 1 },
  });
  expect(bad.status()).toBe(400);
  const ok = await request.put(`/defects/${id}/owner`, {
    data: { ownerId: `dev-${run}`, expectedVersion: 1 },
  });
  expect(ok.status()).toBe(200);
  expect(await ok.json()).toMatchObject({ ownerName: 'E2E Developer', status: 'New' });
});

test('a legacy free-text owner is still returned', async ({ request }) => {
  const { rows } = await pool.query(
    "INSERT INTO defects (key, title, status, owner_id, owner_name) VALUES ($1, 't', 'Triaged', 'legacy', 'Legacy Name') RETURNING id",
    [`E2E-LEG-${run}`],
  );
  const view = await (await request.get(`/defects/${rows[0].id}`)).json();
  expect(view).toMatchObject({ ownerId: 'legacy', ownerName: 'Legacy Name' });
});
