import { useState } from 'react';
import { fetchCart, placeOrder } from '../../api/orders';
import type { CartLine, Order } from '../../api/orders';
import { useResource } from '../dashboard/useResource';
import { OrderConfirmation } from './OrderConfirmation';

const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? '' : 's'}`;

export function CartPage({
  onSearch,
  onViewOrders,
}: {
  onSearch: () => void;
  onViewOrders: () => void;
}) {
  const cart = useResource(fetchCart);
  const [placed, setPlaced] = useState<Order | null>(null);
  const [pending, setPending] = useState(false);
  const [failed, setFailed] = useState(false);

  if (placed) {
    return (
      <OrderConfirmation
        order={placed}
        onViewOrders={onViewOrders}
        onBackToCart={() => {
          setPlaced(null);
          cart.reload();
        }}
      />
    );
  }

  const place = async () => {
    setPending(true);
    setFailed(false);
    try {
      setPlaced(await placeOrder());
    } catch {
      setFailed(true);
    } finally {
      setPending(false);
    }
  };

  if (cart.status === 'loading')
    return (
      <div className="stack" role="status" aria-label="Loading cart">
        <span className="skeleton" />
        <span className="skeleton" />
      </div>
    );
  if (cart.status === 'error')
    return (
      <div className="alert alert-danger" role="alert">
        <strong>We couldn’t load your cart.</strong>{' '}
        <button className="btn btn-secondary" type="button" onClick={cart.reload}>
          Try again
        </button>
      </div>
    );

  const lines: CartLine[] = cart.data ?? [];
  if (lines.length === 0)
    return (
      <div className="empty-state">
        <h1>Your cart is empty</h1>
        <p>Parts you add to the cart appear here, ready to order.</p>
        <button className="btn btn-primary" type="button" onClick={onSearch}>
          Search parts
        </button>
      </div>
    );

  const instances = new Set(lines.map((l) => l.sapInstance)).size;
  return (
    <div className="stack">
      <h1>Cart</h1>
      {failed && (
        <div className="alert alert-danger" role="alert">
          <strong>We couldn’t place your order.</strong> Your cart is unchanged and nothing was
          ordered. Check your connection and select Place order again.
        </div>
      )}
      <div className="card scroll-x">
        <table className="order-table" aria-label="Cart lines">
          <thead>
            <tr>
              <th scope="col">Part number</th>
              <th scope="col">Description</th>
              <th scope="col">SAP instance</th>
              <th scope="col" className="col-num">
                Stock
              </th>
              <th scope="col" className="col-num">
                Quantity
              </th>
            </tr>
          </thead>
          <tbody>
            {lines.map((l) => (
              <tr key={`${l.sapInstance}-${l.partNumber}`}>
                <td>
                  <span className="order-id">{l.partNumber}</span>
                </td>
                <td>{l.description}</td>
                <td>
                  <span className="badge">{l.sapInstance}</span>
                </td>
                <td className="col-num">{l.stock}</td>
                <td className="col-num">{l.quantity}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <section className="card cluster">
        <p>
          {plural(lines.length, 'line')} from {plural(instances, 'SAP instance')}
        </p>
        <button
          className="btn btn-primary"
          type="button"
          disabled={pending}
          aria-busy={pending}
          onClick={place}
        >
          {pending && <span className="spinner" aria-hidden="true" />}
          {pending ? 'Placing order…' : 'Place order'}
        </button>
      </section>
    </div>
  );
}
