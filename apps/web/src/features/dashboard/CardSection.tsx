import { CardVisual } from './CardVisual';
import type { CardSummary, Loadable } from './types';

const skeletonWidths = ['40%', '70%', '55%', '45%'];

export function CardSection({ card }: { card: Loadable<CardSummary> }) {
  if (card.status === 'loading') {
    return (
      <div className="card-panel" role="status" aria-label="Loading card and balance">
        {skeletonWidths.map((width) => (
          <span key={width} className="skeleton" style={{ width }} />
        ))}
      </div>
    );
  }
  if (card.status === 'error' || !card.data) {
    return (
      <div className="card-panel" role="alert">
        <h2>Card and balance unavailable</h2>
        <p>
          We couldn't load your card and balance. The rest of your dashboard is not affected. Try
          again to reload this section.
        </p>
        <div>
          <button type="button" className="btn btn-primary" onClick={card.reload}>
            Try again
          </button>
        </div>
      </div>
    );
  }
  return <CardVisual {...card.data} />;
}
