import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import type { Pool } from 'pg';
import { describe, expect, it } from 'vitest';
import { migrate } from './migrate';

function fakePool() {
  const applied = new Set<string>();
  const statements: string[] = [];
  const client = {
    query: async (sql: string, params?: string[]) => {
      statements.push(sql);
      if (sql.startsWith('SELECT name')) {
        return { rows: [...applied].map((name) => ({ name })) };
      }
      if (sql.startsWith('INSERT INTO schema_migrations') && params) {
        applied.add(params[0]);
      }
      return { rows: [] };
    },
    release: () => undefined,
  };
  const pool = { connect: async () => client } as unknown as Pool;
  return { pool, statements };
}

describe('migrate', () => {
  it('applies each file once, in filename order, and is idempotent', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'migrations-'));
    writeFileSync(join(dir, '002_b.sql'), 'SELECT 2;');
    writeFileSync(join(dir, '001_components.sql'), 'SELECT 1;');
    const { pool, statements } = fakePool();

    expect(await migrate(pool, dir)).toEqual(['001_components.sql', '002_b.sql']);
    expect(await migrate(pool, dir)).toEqual([]);
    expect(statements.filter((s) => s === 'SELECT 1;')).toHaveLength(1);
    expect(statements).toContain('BEGIN');
    expect(statements).toContain('COMMIT');
  });
});
