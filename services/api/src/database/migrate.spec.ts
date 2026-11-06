import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it, vi } from 'vitest';
import type { Pool } from 'pg';
import { migrate, versionOf } from './migrate';

describe('versionOf', () => {
  it('reads the numeric filename prefix', () => {
    expect(versionOf('002_tooling_proof.sql')).toBe('002');
  });
  it('throws on a name without a numeric prefix', () => {
    expect(() => versionOf('tooling.sql')).toThrow();
  });
});

describe('migrate validation', () => {
  it('rejects duplicate versions before any query', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'mig-'));
    writeFileSync(join(dir, '001_a.sql'), 'SELECT 1');
    writeFileSync(join(dir, '001_b.sql'), 'SELECT 1');
    const query = vi.fn();
    await expect(migrate({ query } as unknown as Pool, dir)).rejects.toThrow(/duplicate/i);
    expect(query).not.toHaveBeenCalled();
  });
});
