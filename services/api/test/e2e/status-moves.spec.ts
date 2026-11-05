import { expect, test } from '@playwright/test';
import { Pool } from 'pg';
import { migrate } from '../../src/database/migrate';
import { PgDefectRepository } from '../../src/defects/pg-defect.repository';

// Needs a real Postgres (DATABASE_URL) and the API started with AUTH_DEV_ACTOR=true (fixed Lead).
const pool = new Pool({
  connectionString:
    process.env.DATABASE_URL ?? 'postgresql://postgres:postgres@localhost:5432/core_api',
});

test.beforeAll(async () => {
  await migrate(pool);
});
test.afterAll(async () => {
  await pool.end();
});

let n = 0;
async function seed(status: string): Promise<string> {
  const key = `E2E-${Date.now()}-${n++}`;
  const { rows } = await pool.query(
    'INSERT INTO defects (key, title, status) VALUES ($1, $2, $3) RETURNING id',
    [key, 'E2E defect', status],
  );
  return rows[0].id;
}

test('migration is idempotent and defects default to New', async () => {
  expect(await migrate(pool)).toEqual([]);
  const { rows } = await pool.query(
    "INSERT INTO defects (key, title) VALUES ($1, 't') RETURNING status",
    [`DEF-${Date.now()}-m`],
  );
  expect(rows[0].status).toBe('New');
});

test('Lead rejects a Triaged defect; the reason shows as a comment', async ({ request }) => {
  const id = await seed('Triaged');
  const blank = await request.post(`/defects/${id}/status-moves`, {
    data: { to: 'Rejected', expectedVersion: 1, reason: '   ' },
  });
  expect(blank.status()).toBe(400);

  const res = await request.post(`/defects/${id}/status-moves`, {
    data: { to: 'Rejected', expectedVersion: 1, reason: 'Duplicate of DEF-12' },
  });
  expect(res.status()).toBe(200);
  const view = await (await request.get(`/defects/${id}`)).json();
  expect(view.status).toBe('Rejected');
  expect(view.availableMoves).toEqual([]);
  expect(view.comments.map((c: { body: string }) => c.body)).toContain(
    'Rejected: Duplicate of DEF-12',
  );
});

test('the second move from a stale version is refused with the current status', async ({
  request,
}) => {
  const id = await seed('Resolved');
  const first = await request.post(`/defects/${id}/status-moves`, {
    data: { to: 'In progress', expectedVersion: 1 },
  });
  expect(first.status()).toBe(200);
  const second = await request.post(`/defects/${id}/status-moves`, {
    data: { to: 'In progress', expectedVersion: 1 },
  });
  expect(second.status()).toBe(409);
  expect(await second.json()).toMatchObject({
    currentStatus: 'In progress',
    defect: { rowVersion: 2 },
  });
});

test('two parallel moves from one version: exactly one wins and the version bumps by 1', async () => {
  const id = await seed('Verified');
  const repo = new PgDefectRepository(pool);
  const results = await Promise.all([
    repo.moveStatus(id, 1, 'Closed'),
    repo.moveStatus(id, 1, 'Closed'),
  ]);
  expect(results.filter(Boolean)).toHaveLength(1);
  expect((await repo.findById(id))!.rowVersion).toBe(2);
});
