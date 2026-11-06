import type { CardSummary } from './types';

export function CardVisual({ last4, expiry, balance }: CardSummary) {
  const formatted = new Intl.NumberFormat(undefined, {
    style: 'currency',
    currency: balance.currency,
  }).format(Number(balance.amount));

  return (
    <div className="card-visual" role="group" aria-label="Your card">
      <div className="card-row">
        <span aria-label={`Card ending in ${last4}`}>•••• {last4}</span>
        <span>
          <span className="text-sm">Expires </span>
          <span>{expiry}</span>
        </span>
      </div>
      <div>
        <div className="text-sm">Account balance</div>
        <div className="card-balance">{formatted}</div>
      </div>
    </div>
  );
}
