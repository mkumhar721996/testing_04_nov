import { afterEach, describe, expect, it, vi } from 'vitest';
import { setAuthHooks } from './http';
import { addCartLines, lookupParts } from './quickOrder';

const line = { part: 'BRG-6204-2RS', description: 'Bearing', instance: 'SAP A (EU)', quantity: 12 };

function mockFetch(status: number, body: unknown = {}) {
  const fn = vi.fn().mockImplementation(
    async () => new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } }),
  );
  vi.stubGlobal('fetch', fn);
  return fn;
}

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('quick-order api', () => {
  it('looks up parts and returns the parsed matches', async () => {
    const matches = [{ part: 'BRG-6204-2RS', description: 'Bearing', stock: [{ instance: 'SAP A (EU)', available: 3 }] }];
    const fetchMock = mockFetch(200, matches);
    expect(await lookupParts(['BRG-6204-2RS'])).toEqual(matches);
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe('/parts/lookup');
    expect(init.body).toBe('{"partNumbers":["BRG-6204-2RS"]}');
  });

  it('posts cart lines with the bearer token', async () => {
    setAuthHooks({ getToken: () => 'fake-token', onUnauthorized: () => {} });
    const fetchMock = mockFetch(200);
    expect(await addCartLines([line])).toEqual({ kind: 'ok' });
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe('/cart/lines');
    expect((init.headers as Headers).get('Authorization')).toBe('Bearer fake-token');
    expect(init.body).toBe(JSON.stringify({ lines: [line] }));
    setAuthHooks({ getToken: () => null, onUnauthorized: () => {} });
  });

  it('reports an error on a non-2xx response', async () => {
    mockFetch(500);
    expect(await addCartLines([line])).toEqual({ kind: 'error' });
  });

  it('reports an error when the request throws', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('offline')));
    expect(await addCartLines([line])).toEqual({ kind: 'error' });
  });
});
