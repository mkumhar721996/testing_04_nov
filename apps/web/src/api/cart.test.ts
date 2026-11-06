import { afterEach } from 'vitest';
import { changeQuantity, getCart, removeLine } from './cart';

const line = {
  id: 'l-1',
  partNumber: 'BR-7731-05',
  description: 'Brake pad set, front',
  sapInstance: 'SAP B (US)',
  stockShown: 10,
  quantity: 5,
};

const reply = (status: number, body?: unknown) =>
  vi.stubGlobal(
    'fetch',
    vi.fn(() =>
      Promise.resolve(new Response(body === undefined ? null : JSON.stringify(body), { status })),
    ),
  );

afterEach(() => vi.unstubAllGlobals());

describe('cart api', () => {
  it('getCart returns the lines and throws on failure', async () => {
    reply(200, { lines: [line] });
    expect(await getCart()).toEqual([line]);
    reply(500, {});
    await expect(getCart()).rejects.toThrow();
  });

  it('maps change results', async () => {
    reply(200, line);
    expect(await changeQuantity('l-1', 5)).toEqual({ kind: 'ok', line });
    reply(409, { message: 'Only 10 in stock.', stock: 10 });
    expect(await changeQuantity('l-1', 11)).toEqual({ kind: 'over-stock', stock: 10 });
    reply(400, { message: 'Bad' });
    expect(await changeQuantity('l-1', 0)).toEqual({ kind: 'invalid', message: 'Bad' });
    reply(404, {});
    expect(await changeQuantity('l-1', 1)).toEqual({ kind: 'error' });
  });

  it('removeLine reports success', async () => {
    reply(204);
    expect(await removeLine('l-1')).toBe(true);
    reply(404, {});
    expect(await removeLine('l-1')).toBe(false);
  });
});
