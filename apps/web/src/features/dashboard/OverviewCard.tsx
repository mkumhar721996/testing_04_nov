import { formatMoney } from './formatMoney';
import { OverviewChart } from './OverviewChart';
import { SectionPanel, useRetry } from './SectionPanel';
import type { Loadable, Overview } from './types';

type OverviewCardProps = { overview: Loadable<Overview>; onSoon: (message: string) => void };

const TREND_VERBS = { up: '↗ Increasing', down: '↘ Decreasing', flat: 'No change' } as const;

export function OverviewCard({ overview, onSoon }: OverviewCardProps) {
  const { retrying, retry } = useRetry(overview);
  const failed = overview.status === 'error' || (retrying && overview.status === 'loading');
  const data = overview.data;

  return (
    <section className="card" aria-labelledby="overview-heading">
      <div className="stack">
        <div className="between">
          <h3 id="overview-heading">Overview</h3>
          {!failed && (
            <div className="cluster">
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => onSoon('Period selection is coming soon')}
              >
                Year{' '}
                <svg className="icon" aria-hidden="true" viewBox="0 0 24 24">
                  <path d="m6 9 6 6 6-6" />
                </svg>
              </button>
              <button
                type="button"
                className="btn btn-secondary btn-icon"
                aria-label="Share overview"
                onClick={() => onSoon('Sharing is coming soon')}
              >
                <svg className="icon" aria-hidden="true" viewBox="0 0 24 24">
                  <path d="M5 12h14" />
                  <path d="m12 5 7 7-7 7" />
                </svg>
              </button>
            </div>
          )}
        </div>
        {failed ? (
          <SectionPanel
            title="Overview unavailable"
            text="We couldn't load your yearly overview. Your recent transactions are not affected. Try again to reload this card."
            pending={retrying}
            onRetry={retry}
          />
        ) : overview.status === 'loading' || !data ? (
          <div className="stack" role="status" aria-label="Loading overview">
            <span className="skeleton" style={{ width: '35%', height: 'var(--control-height-md)' }} />
            <span className="skeleton" style={{ width: '50%' }} />
            <span className="skeleton sk-chart" />
          </div>
        ) : !data.hasMovement ? (
          <div className="empty-state">
            <h4>No money movement in {data.year}</h4>
            <p>Deposits, withdrawals and payments on your account will build this year's chart.</p>
          </div>
        ) : (
          <div className="stack">
            <div
              className="stat"
              aria-label={`Total for ${data.year}: ${formatMoney(data.total, data.currency)}`}
            >
              {formatMoney(data.total, data.currency)}
            </div>
            {data.trend && (
              <span className="text-muted">
                {TREND_VERBS[data.trend.direction]}{' '}
                {data.trend.direction === 'flat'
                  ? `vs ${data.trend.previousYear}`
                  : `${data.trend.percent}% on ${data.trend.previousYear}`}
              </span>
            )}
            <OverviewChart overview={data} />
          </div>
        )}
      </div>
    </section>
  );
}
