import { describe, expect, it } from 'vitest';
import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import { CartController } from './cart.controller';
import { CartService } from './cart.service';
import { InMemoryCartRepository } from './in-memory-cart.repository';

const actor = { id: 'u1', name: 'U', role: 'Lead' } as never;
const line = {
  partNumber: 'BR-7731-05',
  description: 'Brake pad set, front',
  sapInstance: 'SAP B (US)',
  stockShown: 10,
  quantity: 2,
};

async function setup() {
  const repo = new InMemoryCartRepository();
  const ctrl = new CartController(new CartService(repo));
  const { id } = await repo.add('u1', line);
  return { ctrl, id };
}

describe('CartController', () => {
  it('lists lines with only the cart fields (no price, no ship-to)', async () => {
    const { ctrl } = await setup();
    const body = await ctrl.list(actor);
    expect(Object.keys(body.lines[0]).sort()).toEqual([
      'description',
      'id',
      'partNumber',
      'quantity',
      'sapInstance',
      'stockShown',
    ]);
    expect(JSON.stringify(body)).not.toMatch(/price|ship/i);
  });

  it('returns the updated line', async () => {
    const { ctrl, id } = await setup();
    expect(await ctrl.change(id, actor, { quantity: 10 })).toMatchObject({ quantity: 10 });
  });

  it('maps invalid to 400', async () => {
    const { ctrl, id } = await setup();
    await expect(ctrl.change(id, actor, { quantity: 0 })).rejects.toBeInstanceOf(
      BadRequestException,
    );
    await expect(ctrl.change(id, actor, { quantity: 'abc' })).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });

  it('maps over-stock to 409 carrying the stock', async () => {
    const { ctrl, id } = await setup();
    const err = await ctrl.change(id, actor, { quantity: 11 }).catch((e) => e);
    expect(err).toBeInstanceOf(ConflictException);
    expect(err.getResponse()).toMatchObject({ stock: 10 });
  });

  it('maps a foreign or missing line to 404', async () => {
    const { ctrl, id } = await setup();
    const other = { id: 'u2', name: 'V', role: 'Lead' } as never;
    await expect(ctrl.change(id, other, { quantity: 1 })).rejects.toBeInstanceOf(
      NotFoundException,
    );
    await expect(ctrl.remove(id, other)).rejects.toBeInstanceOf(NotFoundException);
    await expect(ctrl.remove(id, actor)).resolves.toBeUndefined();
  });
});
