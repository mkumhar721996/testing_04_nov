import { Client } from 'pg';

// Connects with DATABASE_URL and runs SELECT 1. Exits non-zero on failure.
async function main(): Promise<void> {
  const client = new Client({ connectionString: process.env.DATABASE_URL });
  try {
    await client.connect();
    await client.query('SELECT 1');
    console.log('connected');
  } finally {
    await client.end().catch(() => undefined);
  }
}

main().catch((err) => {
  // Message only: never print the connection string.
  console.error(err instanceof Error ? err.message : 'connection failed');
  process.exitCode = 1;
});
