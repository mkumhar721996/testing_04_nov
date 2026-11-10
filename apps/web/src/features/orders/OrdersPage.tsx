import { useEffect, useRef, useState } from 'react';
import { OrderPager } from './OrderPager';
import { OrderTable } from './OrderTable';
import { useOrders } from './useOrders';

export function OrdersPage({ onSearch }: { onSearch: () => void }) {
  const [page, setPage] = useState(1);
  const { status, data, reload } = useOrders(page);
  const pagerRef = useRef<HTMLElement>(null);
  const pageChanged = useRef(false);

  // After a page change, keep keyboard users in the pager.
  useEffect(() => {
    if (status === 'ready' && pageChanged.current) {
      pageChanged.current = false;
      pagerRef.current?.querySelector<HTMLButtonElement>('button:not(:disabled)')?.focus();
    }
  }, [status]);

  const goTo = (next: number) => {
    pageChanged.current = true;
    setPage(next);
  };

  return (
    <div className="stack">
      <div className="page-head">
        <h1 className="text-lg">Orders</h1>
        {data?.distributorName && <span className="text-muted">{data.distributorName}</span>}
      </div>

      {status === 'loading' && (
        <div className="card order-card" role="status" aria-label="Loading your orders">
          <div className="stack">
            <div className="skeleton skeleton-row" />
            <div className="skeleton skeleton-row" />
            <div className="skeleton skeleton-row" />
          </div>
        </div>
      )}

      {status === 'error' && (
        <div className="alert alert-danger stack-sm" role="alert">
          <strong>We couldn’t load your orders.</strong>
          <span>Your orders are safe. Check your connection and try again.</span>
          <div>
            <button type="button" className="btn btn-secondary btn-sm" onClick={reload}>
              Try again
            </button>
          </div>
        </div>
      )}

      {status === 'ready' && data && data.total === 0 && (
        <div className="empty-state stack-sm">
          <h2 className="text-lg">No orders have been placed yet</h2>
          <p>
            Orders placed for your Distributor appear here, newest first. Find parts and place the
            first one.
          </p>
          <div>
            <button type="button" className="btn btn-primary" onClick={onSearch}>
              Search parts
            </button>
          </div>
        </div>
      )}

      {status === 'ready' && data && data.total > 0 && (
        <div className="card order-card">
          <OrderTable orders={data.items} />
          <OrderPager
            ref={pagerRef}
            page={data.page}
            pageSize={data.pageSize}
            total={data.total}
            onPage={goTo}
          />
        </div>
      )}
    </div>
  );
}
