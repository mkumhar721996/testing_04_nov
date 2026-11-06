import { formatMoney } from './formatMoney';
import { SectionPanel, useRetry } from './SectionPanel';
import type { Loadable, Transaction } from './types';

type RecentTransactionsProps = {
  transactions: Loadable<Transaction[]>;
  currency: string;
  onSoon: (message: string) => void;
};

const STATUS = {
  in_progress: { label: 'In progress', className: 'badge badge-warning' },
  completed: { label: 'Completed', className: 'badge badge-success' },
} as const;

const initials = (merchant: string) =>
  merchant
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word[0].toUpperCase())
    .join('');

const formatWhen = (iso: string) =>
  new Intl.DateTimeFormat('en-GB', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(new Date(iso));

export function RecentTransactions({ transactions, currency, onSoon }: RecentTransactionsProps) {
  const { retrying, retry } = useRetry(transactions);
  const failed = transactions.status === 'error' || (retrying && transactions.status === 'loading');
  const data = transactions.data;

  return (
    <section className="card" aria-labelledby="transactions-heading">
      <div className="stack">
        <div className="between">
          <h3 id="transactions-heading">Recent transactions</h3>
          {!failed && (
            <a
              href="#"
              className="link-soon"
              onClick={(event) => {
                event.preventDefault();
                onSoon('Full transaction list is coming soon');
              }}
            >
              View all
            </a>
          )}
        </div>
        {failed ? (
          <SectionPanel
            title="Recent transactions unavailable"
            text="We couldn't load your transactions. Your yearly overview is not affected. Try again to reload this list."
            pending={retrying}
            onRetry={retry}
          />
        ) : transactions.status === 'loading' || !data ? (
          <div className="stack stack-sm" role="status" aria-label="Loading recent transactions">
            {[0, 1, 2].map((i) => (
              <span
                key={i}
                className="skeleton"
                style={{ width: '100%', height: 'var(--control-height-lg)' }}
              />
            ))}
          </div>
        ) : data.length === 0 ? (
          <div className="empty-state">
            <h4>No transactions yet</h4>
            <p>Your recent activity will appear here once you make a deposit or payment.</p>
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => onSoon('Deposit is coming soon')}
            >
              Deposit <span className="badge">Coming soon</span>
            </button>
          </div>
        ) : (
          <ul className="tx-list stack-sm" aria-label="Latest transactions">
            {data.map((tx) => (
              <li key={tx.id} className="tx">
                <span className="avatar" aria-hidden="true">
                  {initials(tx.merchant)}
                </span>
                <div className="tx-main">
                  <strong>{tx.merchant}</strong>
                  <div className="text-muted text-sm">{formatWhen(tx.occurredAt)}</div>
                </div>
                <span className={STATUS[tx.status].className}>{STATUS[tx.status].label}</span>
                {tx.cardLast4 && <span className="text-muted">•••• {tx.cardLast4}</span>}
                <strong className="tx-amount">{formatMoney(tx.amount, currency, true)}</strong>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
