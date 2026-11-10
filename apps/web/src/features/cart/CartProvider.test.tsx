import { act, renderHook } from '@testing-library/react';
import type { ReactNode } from 'react';
import { describe, expect, it } from 'vitest';
import { CartProvider, useCart } from './CartProvider';
import { validateQuantity } from './validateQuantity';

const hit = { partNumber: 'GSK-FL-DN50', description: 'Flange gasket, DN50', sapInstance: 'SAP A (EU)', stock: 10 };
const wrapper = ({ children }: { children: ReactNode }) => <CartProvider>{children}</CartProvider>;

describe('validateQuantity', () => {
  it('accepts a quantity up to the stock shown', () => {
    expect(validateQuantity('10', 10, 0)).toEqual({ ok: true, quantity: 10 });
  });
  it('refuses more than the stock shown and names the stock', () => {
    expect(validateQuantity('11', 10, 0)).toEqual({
      ok: false,
      message: 'Stock shown is 10. Enter 10 or fewer. This part was not added.',
    });
  });
  it('counts what is already in the cart', () => {
    expect(validateQuantity('5', 10, 6)).toEqual({
      ok: false,
      message: 'Stock shown is 10. Enter 4 or fewer, and 6 are already in your cart. This part was not added.',
    });
  });
  it.each(['0', '-1', '1.5', '', 'abc'])('refuses %j', (text) => {
    const r = validateQuantity(text, 10, 0);
    expect(r.ok).toBe(false);
  });
});

describe('CartProvider', () => {
  it('adds a part to the cart', () => {
    const { result } = renderHook(() => useCart(), { wrapper });
    act(() => {
      expect(result.current.addToCart(hit, '1')).toEqual({ ok: true });
    });
    expect(result.current.lines).toEqual([
      { partNumber: 'GSK-FL-DN50', description: 'Flange gasket, DN50', sapInstance: 'SAP A (EU)', quantity: 1 },
    ]);
  });
  it('does not add 11 when stock is 10', () => {
    const { result } = renderHook(() => useCart(), { wrapper });
    act(() => {
      expect(result.current.addToCart(hit, '11').ok).toBe(false);
    });
    expect(result.current.lines).toEqual([]);
  });
  it('sums repeated adds and refuses beyond stock', () => {
    const { result } = renderHook(() => useCart(), { wrapper });
    act(() => {
      result.current.addToCart(hit, '6');
    });
    act(() => {
      expect(result.current.addToCart(hit, '5').ok).toBe(false);
    });
    act(() => {
      expect(result.current.addToCart(hit, '4').ok).toBe(true);
    });
    expect(result.current.lines[0].quantity).toBe(10);
  });
});
