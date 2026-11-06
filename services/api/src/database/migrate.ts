import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { Pool } from 'pg';

const MIGRATIONS_DIR = join(__dirname, '..', '..', 'migrations');

export interface SchemaDump {
  [table: string]: {
    columns: { name: string; type: string; nullable: boolean; default: string | null }[];
    constraints: { name: string; definition: string }[];
    indexes: { name: string; definition: string }[];
  };
}

/** A migration's version is the numeric prefix of its file name: '002_x.sql' -> '002'. */
export function versionOf(file: string): string {
  const match = /^(\d+)_/.exec(file);
  if (!match) throw new Error(`Migration "${file}" must start with a numeric version prefix`);
  return match[1];
}

/** Newest applied migration version, or null when none has been applied. */
export async function currentVersion(pool: Pool): Promise<string | null> {
  const { rows } = await pool.query('SELECT name FROM schema_migrations ORDER BY name DESC LIMIT 1');
  return rows.length ? versionOf(rows[0].name) : null;
}

/** Describes the public schema (tables, columns, constraints, indexes), minus the tracking table. */
export async function dumpSchema(pool: Pool): Promise<SchemaDump> {
  const cols = await pool.query(
    `SELECT table_name, column_name, data_type, is_nullable, column_default
       FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name <> 'schema_migrations'
      ORDER BY table_name, ordinal_position`,
  );
  const cons = await pool.query(
    `SELECT c.relname AS table_name, k.conname AS name, pg_get_constraintdef(k.oid) AS definition
       FROM pg_constraint k JOIN pg_class c ON c.oid = k.conrelid
       JOIN pg_namespace n ON n.oid = c.relnamespace
      WHERE n.nspname = 'public' AND c.relname <> 'schema_migrations'
      ORDER BY c.relname, k.conname`,
  );
  const idx = await pool.query(
    `SELECT tablename AS table_name, indexname AS name, indexdef AS definition
       FROM pg_indexes WHERE schemaname = 'public' AND tablename <> 'schema_migrations'
      ORDER BY tablename, indexname`,
  );
  const dump: SchemaDump = {};
  const table = (name: string) => (dump[name] ??= { columns: [], constraints: [], indexes: [] });
  for (const r of cols.rows) {
    table(r.table_name).columns.push({
      name: r.column_name,
      type: r.data_type,
      nullable: r.is_nullable === 'YES',
      default: r.column_default,
    });
  }
  for (const r of cons.rows) table(r.table_name).constraints.push({ name: r.name, definition: r.definition });
  for (const r of idx.rows) table(r.table_name).indexes.push({ name: r.name, definition: r.definition });
  return dump;
}

/**
 * Applies the .sql files in `migrations/` in name order, once each, recording them.
 * Each file runs in its own transaction, so a failure rolls that file back and leaves earlier
 * files committed. Statements that cannot run in a transaction (for example
 * CREATE INDEX CONCURRENTLY) are therefore not allowed in migrations.
 */
export async function migrate(pool: Pool, dir = MIGRATIONS_DIR): Promise<string[]> {
  const files = readdirSync(dir)
    .filter((f) => f.endsWith('.sql'))
    .sort();
  const seen = new Set<string>();
  for (const file of files) {
    const version = versionOf(file);
    if (seen.has(version)) throw new Error(`Duplicate migration version ${version}`);
    seen.add(version);
  }
  await pool.query(
    'CREATE TABLE IF NOT EXISTS schema_migrations (name text PRIMARY KEY, applied_at timestamptz NOT NULL DEFAULT now())',
  );
  const applied: string[] = [];
  for (const file of files) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      // The advisory lock serialises concurrent runners.
      await client.query('SELECT pg_advisory_xact_lock(7019)');
      const done = await client.query('SELECT 1 FROM schema_migrations WHERE name = $1', [file]);
      if (done.rowCount === 0) {
        await client.query(readFileSync(join(dir, file), 'utf8'));
        await client.query('INSERT INTO schema_migrations (name) VALUES ($1)', [file]);
        applied.push(file);
      }
      await client.query('COMMIT');
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }
  return applied;
}

if (require.main === module) {
  const pool = new Pool({
    connectionString:
      process.env.DATABASE_URL ?? 'postgresql://postgres:postgres@localhost:5432/core_api',
  });
  const run =
    process.argv[2] === 'version'
      ? currentVersion(pool).then((v) => console.log(v ?? 'none'))
      : migrate(pool).then((applied) =>
          console.log(applied.length ? `Applied: ${applied.join(', ')}` : 'Up to date'),
        );
  run
    .catch((err) => {
      console.error(err);
      process.exitCode = 1;
    })
    .finally(() => pool.end());
}
