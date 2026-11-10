import { useState } from 'react';
import { fetchOrders } from '../../api/orders';
import { useResource } from '../dashboard/useResource';
import { OrderDetailPage } from './OrderDetailPage';

export function OrdersPage({ onSearch }: { onSearch: () => void }) {
  const orders = useResource(fetchOrders);
  const [openId, setOpenId] = useState<string | null>(null);

  if (openId) return <OrderDetailPage id={openId} onBack={() => setOpenId(null)} />;

  if (orders.status === 'loading')
    return (
      <div className="stack" role="status" aria-label="Loading orders">
        <span className="skeleton" />
        <span className="skeleton" />
        <span className="skeleton" />
      </div>
    );
  if (orders.status === 'error')
    return (
      <div className="alert alert-danger" role="alert">
        <strong>We couldn’t load the orders.</strong> Check your connection and try again.{' '}
        <button className="btn btn-secondary" type="button" onClick={orders.reload}>
          Try again
        </button>
      </div>
    );

  const rows = orders.data ?? [];
  if (rows.length === 0)
    return (
      <div className="empty-state">
        <h1>No orders have been placed yet</h1>
        <p>Orders appear here once a buyer places one from the cart.</p>
        <button className="btn btn-primary" type="button" onClick={onSearch}>
          Search parts
        </button>
      </div>
    );

  return (
    <div className="stack">
      <h1>Orders</h1>
      <div className="card order-card scroll-x">
        <table className="order-table" aria-label="Orders, newest first">
          <thead>
            <tr>
              <th scope="col">Order</th>
              <th scope="col">Order date</th>
              <th scope="col">Source</th>
              <th scope="col">Status</th>
              <th scope="col" className="col-action">
                Details
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((o) => (
              <tr key={o.id}>
                <td>
                  <span className="order-id">{o.id}</span>
                </td>
                <td>{o.placedAt}</td>
                <td>{o.source}</td>
                <td>{o.status}</td>
                <td className="col-action">
                  {o.failedChildCount > 0 && (
                    <button
                      className="btn btn-secondary"
                      type="button"
                      aria-label={`View order ${o.id}, ${o.failedChildCount} failed child ${o.failedChildCount === 1 ? 'order' : 'orders'}`}
                      onClick={() => setOpenId(o.id)}
                    >
                      View order
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
