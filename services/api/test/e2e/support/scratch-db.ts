import { randomBytes } from 'node:crypto';
import { Pool } from 'pg';

const DEFAULT_URL = 'postgresql://postgres:postgres@localhost:5432/core_api';

/** Creates a uniquely named empty database; `drop` removes it. Never touches the shared schema. */
export async function createScratchDb(): Promise<{ pool: Pool; drop: () => Promise<void> }> {
  const adminUrl = process.env.DATABASE_ADMIN_URL ?? process.env.DATABASE_URL ?? DEFAULT_URL;
  const name = `scratch_${randomBytes(6).toString('hex')}`;
  const admin = new Pool({ connectionString: adminUrl });
  await admin.query(`CREATE DATABASE ${name}`);
  const url = new URL(adminUrl);
  url.pathname = `/${name}`;
  const pool = new Pool({ connectionString: url.toString() });
  return {
    pool,
    drop: async () => {
      await pool.end();
      await admin.query(`DROP DATABASE ${name} WITH (FORCE)`);
      await admin.end();
    },
  };
}
