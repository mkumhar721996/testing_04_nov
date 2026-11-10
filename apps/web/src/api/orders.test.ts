import { afterEach, describe, expect, it, vi } from 'vitest';
import { setAuthHooks } from './http';
import { getOrders } from './orders';

const page = { items: [], total: 0, page: 1, pageSize: 25 };

describe('getOrders', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    setAuthHooks({ getToken: () => null, onUnauthorized: () => {} });
  });

  it('requests the page with a fixed page size and no Distributor id (AC2, AC7)', async () => {
    const fetchMock = vi.fn(() => Promise.resolve(new Response(JSON.stringify(page))));
    vi.stubGlobal('fetch', fetchMock);
    setAuthHooks({ getToken: () => 'test-token', onUnauthorized: () => {} });

    await expect(getOrders(1)).resolves.toEqual(page);

    const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    expect(String(url)).toContain('/orders?page=1&pageSize=25');
    expect(String(url)).not.toMatch(/distributor/i);
    expect(new Headers(init.headers).get('Authorization')).toBe('Bearer test-token');
  });

  it('throws on a non-ok response', async () => {
    vi.stubGlobal('fetch', vi.fn(() => Promise.resolve(new Response('{}', { status: 500 }))));
    await expect(getOrders(1)).rejects.toThrow();
  });
});
