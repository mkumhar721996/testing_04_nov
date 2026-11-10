import { createContext, useCallback, useContext, useMemo, useRef, useState, type ReactNode } from 'react';
import type { PartHit } from '../../api/parts';
import { validateQuantity } from './validateQuantity';

export interface CartLine {
  partNumber: string;
  description: string;
  sapInstance: string;
  quantity: number;
}

export type AddResult = { ok: true } | { ok: false; message: string };

interface CartContextValue {
  lines: CartLine[];
  addToCart(hit: PartHit, quantityText: string): AddResult;
}

const CartContext = createContext<CartContextValue | null>(null);
const keyOf = (l: { partNumber: string; sapInstance: string }) => `${l.partNumber}|${l.sapInstance}`;

// In-memory cart for this session: one line per part per SAP instance.
export function CartProvider({ children }: { children: ReactNode }) {
  const [lines, setLines] = useState<CartLine[]>([]);
  const current = useRef(lines);

  const addToCart = useCallback((hit: PartHit, quantityText: string): AddResult => {
    const existing = current.current.find((l) => keyOf(l) === keyOf(hit));
    const result = validateQuantity(quantityText, hit.stock, existing?.quantity ?? 0);
    if (!result.ok) return result;
    const next = existing
      ? current.current.map((l) => (l === existing ? { ...l, quantity: l.quantity + result.quantity } : l))
      : [
          ...current.current,
          { partNumber: hit.partNumber, description: hit.description, sapInstance: hit.sapInstance, quantity: result.quantity },
        ];
    current.current = next;
    setLines(next);
    return { ok: true };
  }, []);

  const value = useMemo(() => ({ lines, addToCart }), [lines, addToCart]);
  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart(): CartContextValue {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error('useCart must be used inside CartProvider');
  return ctx;
}
