import { describe, expect, it } from 'vitest';
import { InMemoryCartRepository } from './in-memory-cart.repository';
import { CartService } from './cart.service';

const lineA = {
  partNumber: 'AX-4410-22',
  description: 'Hydraulic hose',
  sapInstance: 'SAP A (EU)',
  stockShown: 24,
  quantity: 2,
};
const lineB = {
  partNumber: 'BR-7731-05',
  description: 'Brake pad set, front',
  sapInstance: 'SAP B (US)',
  stockShown: 10,
  quantity: 2,
};

function setup() {
  const repo = new InMemoryCartRepository();
  return { repo, svc: new CartService(repo) };
}

describe('CartService', () => {
  it('lists lines from every SAP instance in one cart', async () => {
    const { repo, svc } = setup();
    await repo.add('u1', lineA);
    await repo.add('u1', lineB);
    expect((await svc.list('u1')).map((l) => l.sapInstance)).toEqual(['SAP A (EU)', 'SAP B (US)']);
  });

  it('changes quantity 2 to 5', async () => {
    const { repo, svc } = setup();
    const { id } = await repo.add('u1', lineA);
    expect(await svc.changeQuantity('u1', id, 5)).toMatchObject({
      kind: 'ok',
      line: { quantity: 5 },
    });
    expect((await repo.findOwned('u1', id))!.quantity).toBe(5);
  });

  it('removes a line', async () => {
    const { repo, svc } = setup();
    const { id } = await repo.add('u1', lineA);
    expect(await svc.remove('u1', id)).toBe(true);
    expect(await svc.list('u1')).toEqual([]);
  });

  it('only lists the caller’s lines and cannot touch another user’s line', async () => {
    const { repo, svc } = setup();
    await repo.add('A', lineA);
    const b = await repo.add('B', lineB);
    expect((await svc.list('A')).map((l) => l.partNumber)).toEqual([lineA.partNumber]);
    expect(await svc.changeQuantity('A', b.id, 3)).toEqual({ kind: 'not-found' });
    expect(await svc.remove('A', b.id)).toBe(false);
    expect((await repo.findOwned('B', b.id))!.quantity).toBe(2);
  });

  it('refuses a quantity above stock and keeps the stored quantity', async () => {
    const { repo, svc } = setup();
    const { id } = await repo.add('u1', lineB);
    expect(await svc.changeQuantity('u1', id, 11)).toEqual({
      kind: 'over-stock',
      stock: 10,
      quantity: 11,
    });
    expect((await repo.findOwned('u1', id))!.quantity).toBe(2);
  });

  it('allows exactly the stock shown', async () => {
    const { repo, svc } = setup();
    const { id } = await repo.add('u1', lineB);
    expect(await svc.changeQuantity('u1', id, 10)).toMatchObject({
      kind: 'ok',
      line: { quantity: 10 },
    });
  });

  it.each([0, -1, 1.5, 'abc', null, undefined])('refuses %s as invalid', async (v) => {
    const { repo, svc } = setup();
    const { id } = await repo.add('u1', lineA);
    expect(await svc.changeQuantity('u1', id, v)).toEqual({ kind: 'invalid' });
    expect((await repo.findOwned('u1', id))!.quantity).toBe(2);
  });
});
