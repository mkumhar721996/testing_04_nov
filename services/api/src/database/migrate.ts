import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { Pool } from 'pg';

// Applies the unapplied `*.sql` files in filename order, one transaction each,
// and returns the names applied.
export async function migrate(pool: Pool, dir = 'migrations'): Promise<string[]> {
  const client = await pool.connect();
  try {
    await client.query(
      'CREATE TABLE IF NOT EXISTS schema_migrations (name text PRIMARY KEY)',
    );
    const done = await client.query<{ name: string }>('SELECT name FROM schema_migrations');
    const doneNames = new Set(done.rows.map((row) => row.name));
    const files = readdirSync(dir)
      .filter((file) => file.endsWith('.sql'))
      .sort();
    const applied: string[] = [];
    for (const file of files) {
      if (doneNames.has(file)) continue;
      await client.query('BEGIN');
      try {
        await client.query(readFileSync(join(dir, file), 'utf8'));
        await client.query('INSERT INTO schema_migrations (name) VALUES ($1)', [file]);
        await client.query('COMMIT');
      } catch (error) {
        await client.query('ROLLBACK');
        throw error;
      }
      applied.push(file);
    }
    return applied;
  } finally {
    client.release();
  }
}

if (require.main === module) {
  const pool = new Pool({
    connectionString:
      process.env.DATABASE_URL ?? 'postgresql://postgres:postgres@localhost:5432/core_api',
  });
  migrate(pool)
    .then((applied) => console.log(applied.length ? `Applied: ${applied.join(', ')}` : 'Up to date'))
    .catch((error) => {
      console.error(error);
      process.exitCode = 1;
    })
    .finally(() => pool.end());
}
