import { Inject, Injectable } from '@nestjs/common';
import { CART_REPOSITORY, CartLineRecord, CartRepository } from './cart.repository';

export type ChangeQuantityResult =
  | { kind: 'ok'; line: CartLineRecord }
  | { kind: 'invalid' }
  | { kind: 'over-stock'; stock: number; quantity: number }
  | { kind: 'not-found' };

@Injectable()
export class CartService {
  constructor(@Inject(CART_REPOSITORY) private readonly repo: CartRepository) {}

  list(ownerId: string): Promise<CartLineRecord[]> {
    return this.repo.listByOwner(ownerId);
  }

  async changeQuantity(
    ownerId: string,
    lineId: string,
    quantity: unknown,
  ): Promise<ChangeQuantityResult> {
    if (typeof quantity !== 'number' || !Number.isInteger(quantity) || quantity < 1)
      return { kind: 'invalid' };
    const line = await this.repo.findOwned(ownerId, lineId);
    if (!line) return { kind: 'not-found' };
    if (quantity > line.stockShown) return { kind: 'over-stock', stock: line.stockShown, quantity };
    const updated = await this.repo.setQuantity(ownerId, lineId, quantity);
    return updated ? { kind: 'ok', line: updated } : { kind: 'not-found' };
  }

  remove(ownerId: string, lineId: string): Promise<boolean> {
    return this.repo.remove(ownerId, lineId);
  }
}
