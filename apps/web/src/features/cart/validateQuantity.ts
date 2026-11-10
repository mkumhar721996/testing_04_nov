export type QuantityResult = { ok: true; quantity: number } | { ok: false; message: string };

export function validateQuantity(text: string, stock: number, alreadyInCart: number): QuantityResult {
  const trimmed = text.trim();
  const quantity = /^\d+$/.test(trimmed) ? Number(trimmed) : 0;
  if (quantity < 1) {
    return { ok: false, message: 'Enter a quantity of 1 or more, using digits only. This part was not added.' };
  }
  if (quantity + alreadyInCart > stock) {
    const allowed = Math.max(stock - alreadyInCart, 0);
    const inCart =
      alreadyInCart > 0 ? `, and ${alreadyInCart} ${alreadyInCart === 1 ? 'is' : 'are'} already in your cart` : '';
    return { ok: false, message: `Stock shown is ${stock}. Enter ${allowed} or fewer${inCart}. This part was not added.` };
  }
  return { ok: true, quantity };
}
