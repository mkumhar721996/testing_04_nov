import { afterEach, describe, expect, it, vi } from 'vitest';
import { searchParts } from './parts';

afterEach(() => vi.unstubAllGlobals());

const stub = (res: Response) => {
  const fn = vi.fn((_url: string) => Promise.resolve(res));
  vi.stubGlobal('fetch', fn);
  return fn;
};

describe('searchParts', () => {
  it('calls the search endpoint with the encoded term and no instance list', async () => {
    const fn = stub(new Response(JSON.stringify({ results: [], unavailableSources: [] })));
    await searchParts('valve & seal');
    expect(fn.mock.calls[0][0]).toBe('/parts/search?q=valve%20%26%20seal');
  });

  it('returns results and unavailable sources', async () => {
    const body = {
      results: [{ partNumber: 'P1', description: 'D', sapInstance: 'SAP A', stock: 3 }],
      unavailableSources: ['SAP B'],
    };
    stub(new Response(JSON.stringify(body)));
    expect(await searchParts('p')).toEqual(body);
  });

  it('throws on a non-2xx answer', async () => {
    stub(new Response('{}', { status: 502 }));
    await expect(searchParts('p')).rejects.toThrow();
  });

  it('throws on a malformed body', async () => {
    stub(new Response(JSON.stringify({ results: 'nope' })));
    await expect(searchParts('p')).rejects.toThrow();
  });
});
