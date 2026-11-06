import { mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { expect, test } from '@playwright/test';
import { Pool } from 'pg';
import { checkConnection } from '../../src/database/check';
import { currentVersion, dumpSchema, migrate } from '../../src/database/migrate';
import { createScratchDb } from './support/scratch-db';

const MIGRATIONS = join(__dirname, '../../migrations');
const expectedSchema = JSON.parse(readFileSync(join(MIGRATIONS, 'expected-schema.json'), 'utf8'));

function fixture(files: Record<string, string>): string {
  const dir = mkdtempSync(join(tmpdir(), 'mig-'));
  for (const [name, sql] of Object.entries(files)) writeFileSync(join(dir, name), sql);
  return dir;
}
const read = (name: string) => readFileSync(join(MIGRATIONS, name), 'utf8');
const listTables = async (pool: Pool) =>
  (
    await pool.query("SELECT tablename FROM pg_tables WHERE schemaname = 'public' ORDER BY 1")
  ).rows.map((r) => r.tablename);

let db: Awaited<ReturnType<typeof createScratchDb>>;
test.beforeEach(async () => {
  db = await createScratchDb();
});
test.afterEach(async () => {
  await db.drop();
});

test('client can connect', async () => {
  const pool = new Pool({
    connectionString:
      process.env.DATABASE_URL ?? 'postgresql://postgres:postgres@localhost:5432/core_api',
  });
  await expect(checkConnection(pool)).resolves.toBeUndefined();
  await pool.end();
});

test('migrated empty database matches the current schema', async () => {
  await migrate(db.pool);
  expect(await dumpSchema(db.pool)).toEqual(expectedSchema);
});

test('running migrations again leaves the schema unchanged', async () => {
  await migrate(db.pool);
  const before = await dumpSchema(db.pool);
  expect(await migrate(db.pool)).toEqual([]);
  expect(await dumpSchema(db.pool)).toEqual(before);
});

test('tooling-proof migration alone yields only tracking and proof tables', async () => {
  await migrate(db.pool, fixture({ '002_tooling_proof.sql': read('002_tooling_proof.sql') }));
  expect(await listTables(db.pool)).toEqual(['schema_migrations', 'tooling_proof']);
});

test('real migrations create the known table set', async () => {
  await migrate(db.pool);
  expect(await listTables(db.pool)).toEqual([
    'defect_comments',
    'defects',
    'schema_migrations',
    'tooling_proof',
  ]);
});

test('a failing migration leaves schema and version unchanged', async () => {
  const good = { '001_ok.sql': 'CREATE TABLE a (id int);' };
  await migrate(db.pool, fixture(good));
  const before = await dumpSchema(db.pool);
  const bad = fixture({ ...good, '002_bad.sql': 'CREATE TABLE b (id int); SELECT 1/0;' });
  await expect(migrate(db.pool, bad)).rejects.toThrow();
  expect(await dumpSchema(db.pool)).toEqual(before);
  expect(await currentVersion(db.pool)).toBe('001');
});

test('version is null when empty and latest after migrating', async () => {
  await migrate(db.pool, fixture({}));
  expect(await currentVersion(db.pool)).toBeNull();
  await migrate(db.pool);
  expect(await currentVersion(db.pool)).toBe('002');
});

test('existing data survives applying the tooling-proof migration', async () => {
  await migrate(db.pool, fixture({ '001_defects.sql': read('001_defects.sql') }));
  await db.pool.query("INSERT INTO defects (key, title) VALUES ('KEEP-1', 't')");
  await migrate(db.pool);
  const { rows } = await db.pool.query("SELECT key FROM defects WHERE key = 'KEEP-1'");
  expect(rows).toHaveLength(1);
  expect(await listTables(db.pool)).toContain('tooling_proof');
});
