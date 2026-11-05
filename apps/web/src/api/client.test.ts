import { afterEach, describe, expect, it, vi } from 'vitest';
import * as token from '../auth/token';
import { ApiError, addComponent, listComponents, renameComponent, retireComponent } from './client';

function mockFetch(status: number, body: unknown) {
  const fn = vi.fn().mockImplementation(async () =>
    new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } }),
  );
  vi.stubGlobal('fetch', fn);
  return fn;
}

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('api client', () => {
  it('lists active components under /api without an auth header when there is no token', async () => {
    const fetchMock = mockFetch(200, [{ id: '1', name: 'Billing', status: 'active' }]);
    expect(await listComponents('active')).toHaveLength(1);
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe('/api/components?status=active');
    expect((init.headers as Headers).has('Authorization')).toBe(false);
  });

  it('sends the bearer token when there is one', async () => {
    vi.spyOn(token, 'getAccessToken').mockReturnValue('abc');
    const fetchMock = mockFetch(200, []);
    await listComponents();
    expect((fetchMock.mock.calls[0][1].headers as Headers).get('Authorization')).toBe('Bearer abc');
  });

  it('sends add, rename and retire as the API expects', async () => {
    const fetchMock = mockFetch(200, {});
    await addComponent('Billing');
    await renameComponent('1', 'Payments');
    await retireComponent('1');
    expect(fetchMock.mock.calls.map(([url, init]) => [url, init.method, init.body])).toEqual([
      ['/api/components', 'POST', '{"name":"Billing"}'],
      ['/api/components/1', 'PATCH', '{"name":"Payments"}'],
      ['/api/components/1/retire', 'POST', undefined],
    ]);
  });

  it('throws an ApiError carrying the server message', async () => {
    mockFetch(409, { message: 'A component named "Payments" already exists.' });
    await expect(renameComponent('1', 'Payments')).rejects.toMatchObject({
      status: 409,
      message: 'A component named "Payments" already exists.',
    });
    await expect(renameComponent('1', 'Payments')).rejects.toBeInstanceOf(ApiError);
  });
});
