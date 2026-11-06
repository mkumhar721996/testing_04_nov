import { execFileSync } from 'node:child_process';
import { randomBytes } from 'node:crypto';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { Pool } from 'pg';
import { latestVersion, migrate } from './migrate';

const ADMIN_URL = process.env.DATABASE_URL;
const ROOT = join(__dirname, '..', '..');
const FIXTURES = join(ROOT, 'test', 'fixtures');
const PROOF_DIR = join(FIXTURES, 'migrations-proof');
const FAIL_DIR = join(FIXTURES, 'migrations-fail');

// Schema produced by the real migrations/ directory (information_schema.columns plus table names).
const EXPECTED_SCHEMA = [
  'accounts.id:bigint:NO:nextval(\'accounts_id_seq\'::regclass)',
  'accounts.owner_subject:text:NO:',
  'accounts.display_name:text:NO:',
  'accounts.balance_minor:bigint:NO:',
  'accounts.currency:character:NO:',
  'cards.id:bigint:NO:nextval(\'cards_id_seq\'::regclass)',
  'cards.account_id:bigint:NO:',
  'cards.number_last4:character:NO:',
  'cards.expiry_month:smallint:NO:',
  'cards.expiry_year:smallint:NO:',
  'defect_comments.id:uuid:NO:gen_random_uuid()',
  'defect_comments.defect_id:uuid:NO:',
  'defect_comments.author_id:text:NO:',
  'defect_comments.author_name:text:NO:',
  'defect_comments.body:text:NO:',
  'defect_comments.created_at:timestamp with time zone:NO:now()',
  'defects.id:uuid:NO:gen_random_uuid()',
  'defects.key:text:NO:',
  'defects.title:text:NO:',
  "defects.status:text:NO:'New'::text",
  'defects.owner_id:text:YES:',
  'defects.owner_name:text:YES:',
  'defects.row_version:integer:NO:1',
  'defects.created_at:timestamp with time zone:NO:now()',
  'defects.updated_at:timestamp with time zone:NO:now()',
  'tooling_proof.id:smallint:NO:',
  'tooling_proof.note:text:NO:',
  'tooling_proof.created_at:timestamp with time zone:NO:now()',
];

async function dumpSchema(pool: Pool): Promise<string[]> {
  const { rows } = await pool.query(
    `SELECT table_name, column_name, data_type, is_nullable, column_default
       FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name <> 'schema_migrations'
      ORDER BY table_name, ordinal_position`,
  );
  return rows.map(
    (r) =>
      `${r.table_name}.${r.column_name}:${r.data_type}:${r.is_nullable}:${r.column_default ?? ''}`,
  );
}

async function listTables(pool: Pool): Promise<string[]> {
  const { rows } = await pool.query(
    "SELECT tablename FROM pg_tables WHERE schemaname = 'public' ORDER BY 1",
  );
  return rows.map((r) => r.tablename);
}

describe.skipIf(!ADMIN_URL)('migrations against a throwaway database', () => {
  let admin: Pool;
  let pool: Pool;
  let dbUrl: string;
  let dbName: string;

  beforeEach(async () => {
    dbName = `migrate_test_${randomBytes(6).toString('hex')}`;
    admin = new Pool({ connectionString: ADMIN_URL });
    await admin.query(`CREATE DATABASE ${dbName}`);
    const url = new URL(ADMIN_URL!);
    url.pathname = `/${dbName}`;
    dbUrl = url.toString();
    pool = new Pool({ connectionString: dbUrl });
  });
  afterEach(async () => {
    await pool.end();
    await admin.query(`DROP DATABASE ${dbName} WITH (FORCE)`);
    await admin.end();
  });

  it('client can connect (AC1)', async () => {
    const res = await pool.query('SELECT 1 AS ok');
    expect(res.rows[0].ok).toBe(1);
  });

  it('builds the current schema on an empty database (AC2)', async () => {
    await migrate(pool);
    expect(await dumpSchema(pool)).toEqual(EXPECTED_SCHEMA);
  });

  it('leaves the schema unchanged when run again (AC3)', async () => {
    await migrate(pool);
    const before = await dumpSchema(pool);
    expect(await migrate(pool)).toEqual([]);
    expect(await dumpSchema(pool)).toEqual(before);
  });

  it('creates only the tracking and tooling-proof tables from the proof migration (AC4)', async () => {
    await migrate(pool, PROOF_DIR);
    expect(await listTables(pool)).toEqual(['schema_migrations', 'tooling_proof']);
  });

  it('lists exactly the known tables for the real migrations (AC4)', async () => {
    await migrate(pool);
    expect(await listTables(pool)).toEqual([
      'accounts',
      'cards',
      'defect_comments',
      'defects',
      'schema_migrations',
      'tooling_proof',
    ]);
  });

  it('rolls back a migration that fails partway (AC6)', async () => {
    await expect(migrate(pool, FAIL_DIR)).rejects.toThrow();
    expect(await listTables(pool)).toEqual(['ok_table', 'schema_migrations']);
    expect(await listTables(pool)).not.toContain('half_created');
  });

  it('keeps the version before the failed migration (AC7)', async () => {
    await expect(migrate(pool, FAIL_DIR)).rejects.toThrow();
    expect(await latestVersion(pool)).toBe('001_ok');
  });

  it('reports no version on an empty database (AC7)', async () => {
    expect(await latestVersion(pool)).toBeNull();
  });

  it('prints the latest version from the version command (AC8)', async () => {
    await migrate(pool);
    const stdout = execFileSync(join(ROOT, 'node_modules', '.bin', 'tsx'), [
      'src/database/migrate.ts',
      'version',
    ], { cwd: ROOT, env: { ...process.env, DATABASE_URL: dbUrl }, encoding: 'utf8' });
    expect(stdout.trim()).toBe('002_tooling_proof');
  });
});
