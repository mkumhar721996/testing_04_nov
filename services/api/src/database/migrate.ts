import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { Pool } from 'pg';

const MIGRATIONS_DIR = join(__dirname, '..', '..', 'migrations');

/** Applies the .sql files in `migrations/` in name order, once each, recording them. */
export async function migrate(pool: Pool, dir = MIGRATIONS_DIR): Promise<string[]> {
  await pool.query(
    'CREATE TABLE IF NOT EXISTS schema_migrations (name text PRIMARY KEY, applied_at timestamptz NOT NULL DEFAULT now())',
  );
  const applied: string[] = [];
  const files = readdirSync(dir)
    .filter((f) => f.endsWith('.sql'))
    .sort();
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
      // A failed rollback must not mask the migration error.
      await client.query('ROLLBACK').catch(() => undefined);
      throw err;
    } finally {
      client.release();
    }
  }
  return applied;
}

/**
 * Latest applied migration version: the highest file name in schema_migrations without `.sql`
 * (the numeric prefix is not unique), or null when none is applied or the table is missing.
 */
export async function latestVersion(pool: Pool): Promise<string | null> {
  try {
    const { rows } = await pool.query('SELECT name FROM schema_migrations ORDER BY name DESC LIMIT 1');
    return rows.length ? String(rows[0].name).replace(/\.sql$/, '') : null;
  } catch (err) {
    if ((err as { code?: string }).code === '42P01') return null; // undefined_table
    throw err;
  }
}

if (require.main === module) {
  const pool = new Pool({
    connectionString:
      process.env.DATABASE_URL ?? 'postgresql://postgres:postgres@localhost:5432/core_api',
  });
  const command = process.argv[2] ?? 'up';
  const run =
    command === 'version'
      ? latestVersion(pool).then((v) => console.log(v ?? 'none'))
      : command === 'up'
        ? migrate(pool).then((applied) =>
            console.log(applied.length ? `Applied: ${applied.join(', ')}` : 'Up to date'),
          )
        : Promise.reject(new Error(`Unknown command "${command}". Use "up" or "version".`));
  run
    .catch((err) => {
      console.error(err);
      process.exitCode = 1;
    })
    .finally(() => pool.end());
}
