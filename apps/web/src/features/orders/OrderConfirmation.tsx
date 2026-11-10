import type { Order } from '../../api/orders';
import { ChildOrderCard } from './ChildOrderCard';
import { OrderSummaryCard } from './OrderSummaryCard';
import { rollUpStatus } from './rollUpStatus';

function OutcomeAlert({ order }: { order: Order }) {
  const rolled = rollUpStatus(order.children);
  if (rolled === 'All placed')
    return (
      <div className="alert alert-success" role="status">
        <strong>Your order was placed.</strong> Every child order was accepted by its SAP instance.
      </div>
    );
  if (rolled === 'Failed')
    return (
      <div className="alert alert-danger" role="status">
        <strong>Your order was not placed.</strong> Every child order failed. Your cart is empty, but
        the lines are kept on the failed child orders below.
      </div>
    );
  return (
    <div className="alert alert-warning" role="status">
      <strong>Your order was partly placed.</strong> The failed child orders are shown below. The
      others were placed and stay placed.
    </div>
  );
}

export function OrderConfirmation({
  order,
  onViewOrders,
  onBackToCart,
}: {
  order: Order;
  onViewOrders: () => void;
  onBackToCart: () => void;
}) {
  const allPlaced = rollUpStatus(order.children) === 'All placed';
  return (
    <div className="stack">
      <h1>Order confirmation</h1>
      <OutcomeAlert order={order} />
      <OrderSummaryCard order={order} />
      <h2 className="text-lg">Child orders</h2>
      {order.children.map((c) => (
        <ChildOrderCard key={c.id} child={c} />
      ))}
      <div className="cluster">
        <button className="btn btn-primary" type="button" onClick={onViewOrders}>
          View orders
        </button>
        <button className="btn btn-secondary" type="button" onClick={onBackToCart}>
          Back to cart
        </button>
      </div>
      {allPlaced && <div className="toast is-open">Order {order.id} placed.</div>}
    </div>
  );
}
