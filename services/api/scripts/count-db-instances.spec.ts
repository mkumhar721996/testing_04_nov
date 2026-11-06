import { describe, expect, it } from 'vitest';
import { countInstances } from './count-db-instances';

describe('countInstances', () => {
  it('counts the listed instances', () => {
    expect(countInstances({ DBInstances: [{ DBInstanceIdentifier: 'x' }] })).toBe(1);
    expect(countInstances({ DBInstances: [] })).toBe(0);
  });
  it('treats unexpected output as zero instances', () => {
    expect(countInstances(null)).toBe(0);
    expect(countInstances({})).toBe(0);
  });
});
