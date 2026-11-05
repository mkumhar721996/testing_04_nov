import { CardSection } from './CardSection';
import type { CardSummary, Loadable } from './types';

const pendingActions = [
  { id: 'deposit', label: 'Deposit' },
  { id: 'withdraw', label: 'Withdraw' },
];

export function Hero({ name, card }: { name: string; card: Loadable<CardSummary> }) {
  return (
    <section className="hero" aria-labelledby="hero-title">
      <div className="wrap hero-inner">
        <div className="stack">
          <p>Track your balance, recent activity, and financial goals.</p>
          <h1 className="hero-title" id="hero-title">
            {name ? `Welcome back, ${name}!` : 'Welcome back!'}
          </h1>
          <div className="cluster">
            {pendingActions.map((action) => (
              <button
                key={action.id}
                type="button"
                className="btn btn-secondary btn-pending"
                disabled
              >
                {action.label} <span className="badge soon">Coming soon</span>
              </button>
            ))}
          </div>
        </div>
        <div className="card-slot" aria-live="polite">
          <CardSection card={card} />
        </div>
      </div>
    </section>
  );
}
