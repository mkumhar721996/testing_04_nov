/** A decimal amount string as currency; `signed` also shows "+" for money in. */
export function formatMoney(amount: string, currency: string, signed = false): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    signDisplay: signed ? 'exceptZero' : 'auto',
  }).format(Number(amount));
}
