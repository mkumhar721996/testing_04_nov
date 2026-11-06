export interface CartLineRecord {
  id: string;
  partNumber: string;
  description: string;
  sapInstance: string;
  stockShown: number;
  quantity: number;
}

/** Every method is scoped to one owner: a line owned by someone else behaves as missing. */
export interface CartRepository {
  listByOwner(ownerId: string): Promise<CartLineRecord[]>;
  findOwned(ownerId: string, lineId: string): Promise<CartLineRecord | null>;
  setQuantity(ownerId: string, lineId: string, quantity: number): Promise<CartLineRecord | null>;
  remove(ownerId: string, lineId: string): Promise<boolean>;
  add(ownerId: string, line: Omit<CartLineRecord, 'id'>): Promise<CartLineRecord>;
}

export const CART_REPOSITORY = 'CART_REPOSITORY';
