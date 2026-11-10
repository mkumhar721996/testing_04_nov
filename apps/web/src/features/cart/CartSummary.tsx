import { useCart } from './CartProvider';

export function CartSummary({ onViewCart }: { onViewCart(): void }) {
  const { lines } = useCart();
  if (lines.length === 0) return null;
  return (
    <section className="stack" aria-labelledby="in-your-cart">
      <h2 id="in-your-cart" className="text-lg">
        In your cart
      </h2>
      <div className="card order-card scroll-x">
        <table className="order-table" aria-label="Cart lines">
          <thead>
            <tr>
              <th scope="col">Part number</th>
              <th scope="col">Description</th>
              <th scope="col">SAP instance</th>
              <th scope="col" className="col-num">
                Quantity
              </th>
            </tr>
          </thead>
          <tbody>
            {lines.map((l) => (
              <tr key={`${l.partNumber}|${l.sapInstance}`}>
                <td className="order-id">{l.partNumber}</td>
                <td>{l.description}</td>
                <td>{l.sapInstance}</td>
                <td className="col-num">{l.quantity}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div>
        <button type="button" className="btn btn-secondary" onClick={onViewCart}>
          View cart
        </button>
      </div>
    </section>
  );
}
