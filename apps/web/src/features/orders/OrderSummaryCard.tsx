import type { Order } from '../../api/orders';
import { ROLL_UP_BADGE, rollUpStatus } from './rollUpStatus';

export function OrderSummaryCard({ order }: { order: Order }) {
  const rolled = rollUpStatus(order.children);
  return (
    <section className="card stack-sm" aria-label={`Parent order ${order.id}`}>
      <h2 className="text-lg">
        Order <span className="order-id">{order.id}</span>
      </h2>
      <dl className="summary">
        <div>
          <dt>Status</dt>
          <dd>
            <span className={`badge ${ROLL_UP_BADGE[rolled]}`}>{rolled}</span>
          </dd>
        </div>
        <div>
          <dt>Child orders</dt>
          <dd>{order.children.length} (one per SAP instance)</dd>
        </div>
        {order.placedAt && (
          <div>
            <dt>Order date</dt>
            <dd>{order.placedAt}</dd>
          </div>
        )}
      </dl>
    </section>
  );
}
