import { Pool } from 'pg';

/** Resolves when the database answers a trivial query; rejects otherwise. */
export async function checkConnection(pool: Pool): Promise<void> {
  await pool.query('SELECT 1');
}

if (require.main === module) {
  const pool = new Pool({
    connectionString:
      process.env.DATABASE_URL ?? 'postgresql://postgres:postgres@localhost:5432/core_api',
  });
  checkConnection(pool)
    .then(() => console.log('connected'))
    .catch((err) => {
      // Print the message only: never the connection string.
      console.error(err instanceof Error ? err.message : 'connection failed');
      process.exitCode = 1;
    })
    .finally(() => pool.end());
}
