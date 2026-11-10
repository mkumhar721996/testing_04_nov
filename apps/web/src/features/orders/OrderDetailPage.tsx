import { fetchOrder } from '../../api/orders';
import { useResource } from '../dashboard/useResource';
import { ChildOrderCard } from './ChildOrderCard';
import { OrderSummaryCard } from './OrderSummaryCard';

export function OrderDetailPage({ id, onBack }: { id: string; onBack: () => void }) {
  const order = useResource(() => fetchOrder(id));
  return (
    <div className="stack">
      <div>
        <button className="btn btn-ghost" type="button" onClick={onBack}>
          Back to orders
        </button>
      </div>
      <h1>Order detail</h1>
      {order.status === 'loading' && (
        <div className="stack" role="status" aria-label="Loading order">
          <span className="skeleton" />
          <span className="skeleton" />
          <span className="skeleton" />
        </div>
      )}
      {order.status === 'error' && (
        <div className="alert alert-danger" role="alert">
          <strong>We couldn’t load this order.</strong> Check your connection and try again.{' '}
          <button className="btn btn-secondary" type="button" onClick={order.reload}>
            Try again
          </button>
        </div>
      )}
      {order.data && (
        <>
          <OrderSummaryCard order={order.data} />
          <h2 className="text-lg">Child orders</h2>
          {order.data.children.map((c) => (
            <ChildOrderCard key={c.id} child={c} />
          ))}
        </>
      )}
    </div>
  );
}
