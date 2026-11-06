import { randomUUID } from 'node:crypto';
import { CartLineRecord, CartRepository } from './cart.repository';

/** Test double for CartRepository with the same owner scoping as Postgres. */
export class InMemoryCartRepository implements CartRepository {
  private lines: { ownerId: string; line: CartLineRecord }[] = [];

  async listByOwner(ownerId: string) {
    return this.lines.filter((l) => l.ownerId === ownerId).map((l) => ({ ...l.line }));
  }

  async findOwned(ownerId: string, lineId: string) {
    const found = this.lines.find((l) => l.ownerId === ownerId && l.line.id === lineId);
    return found ? { ...found.line } : null;
  }

  async setQuantity(ownerId: string, lineId: string, quantity: number) {
    const found = this.lines.find((l) => l.ownerId === ownerId && l.line.id === lineId);
    if (!found) return null;
    found.line.quantity = quantity;
    return { ...found.line };
  }

  async remove(ownerId: string, lineId: string) {
    const before = this.lines.length;
    this.lines = this.lines.filter((l) => !(l.ownerId === ownerId && l.line.id === lineId));
    return this.lines.length < before;
  }

  async add(ownerId: string, line: Omit<CartLineRecord, 'id'>) {
    const record = { id: randomUUID(), ...line };
    this.lines.push({ ownerId, line: record });
    return { ...record };
  }
}
