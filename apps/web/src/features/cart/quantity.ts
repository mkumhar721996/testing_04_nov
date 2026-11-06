/** A whole number of at least 1, or null when the text is blank, zero, negative or not a number. */
export function parseQuantity(raw: string): number | null {
  if (!/^\d+$/.test(raw)) return null;
  const n = Number(raw);
  return Number.isSafeInteger(n) && n >= 1 ? n : null;
}
