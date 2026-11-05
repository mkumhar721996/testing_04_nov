import { describe, expect, it } from 'vitest';
import { Worker } from '../src/worker.js';

describe('Worker', () => {
  it('drains queued jobs in order', async () => {
    const worker = new Worker();
    const seen: number[] = [];
    worker.enqueue(() => void seen.push(1));
    worker.enqueue(async () => void seen.push(2));
    expect(worker.pending).toBe(2);
    expect(await worker.drain()).toBe(2);
    expect(seen).toEqual([1, 2]);
    expect(worker.pending).toBe(0);
  });
});
