import { afterEach, describe, expect, it, vi } from 'vitest';
import { fetchCart, fetchOrder, fetchOrders, placeOrder } from './orders';

const stub = (status: number, body: unknown = {}) => {
  const f = vi.fn(() => Promise.resolve(new Response(JSON.stringify(body), { status })));
  vi.stubGlobal('fetch', f);
  return f;
};
const call = (f: ReturnType<typeof stub>) => f.mock.calls[0] as unknown as [string, RequestInit?];

describe('orders api', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('gets the cart', async () => {
    const f = stub(200, []);
    expect(await fetchCart()).toEqual([]);
    expect(call(f)[0]).toMatch(/\/cart$/);
  });
  it('places the order with a POST and no body', async () => {
    const f = stub(200, { id: 'ORD-1', children: [] });
    expect((await placeOrder()).id).toBe('ORD-1');
    expect(call(f)[0]).toMatch(/\/orders$/);
    expect(call(f)[1]?.method).toBe('POST');
    expect(call(f)[1]?.body).toBeUndefined();
  });
  it('lists orders', async () => {
    const f = stub(200, []);
    await fetchOrders();
    expect(call(f)[0]).toMatch(/\/orders$/);
  });
  it('gets one order by encoded id', async () => {
    const f = stub(200, { id: 'a/b', children: [] });
    await fetchOrder('a/b');
    expect(call(f)[0]).toMatch(/\/orders\/a%2Fb$/);
  });
  it.each([
    ['fetchCart', fetchCart],
    ['placeOrder', placeOrder],
    ['fetchOrders', fetchOrders],
    ['fetchOrder', () => fetchOrder('x')],
  ])('%s throws on a 500', async (_n, fn) => {
    stub(500);
    await expect(fn()).rejects.toThrow();
  });
});
