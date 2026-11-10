import { useState } from 'react';
import type { PartHit } from '../../api/parts';
import type { AddResult } from '../cart/CartProvider';

interface Props {
  hits: PartHit[];
  canAdd: boolean;
  onAdd(hit: PartHit, quantityText: string): AddResult;
  onAdded(message: string): void;
}

const rowKey = (h: PartHit) => `${h.partNumber}|${h.sapInstance}`;

const Icon = ({ path }: { path: string }) => (
  <svg className="icon" aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d={path} />
  </svg>
);

function StockBadge({ stock }: { stock: number }) {
  return stock > 0 ? (
    <span className="badge badge-success">
      <Icon path="M20 6 9 17l-5-5" />
      {stock} in stock
    </span>
  ) : (
    <span className="badge badge-danger">
      <Icon path="M12 8v4M12 16h.01M22 12a10 10 0 1 1-20 0 10 10 0 0 1 20 0" />
      Out of stock
    </span>
  );
}

export function PartSearchResults({ hits, canAdd, onAdd, onAdded }: Props) {
  const [quantities, setQuantities] = useState<Record<string, string>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});

  const add = (hit: PartHit) => {
    const key = rowKey(hit);
    const text = quantities[key] ?? '1';
    const result = onAdd(hit, text);
    if (result.ok) {
      setErrors((e) => ({ ...e, [key]: '' }));
      onAdded(`${text.trim()} × ${hit.partNumber} (${hit.sapInstance}) added to your cart.`);
    } else {
      setErrors((e) => ({ ...e, [key]: result.message }));
    }
  };

  return (
    <div className="card order-card scroll-x">
      <table className="order-table ps-table" aria-label="Search results">
        <thead>
          <tr>
            <th scope="col">Part number</th>
            <th scope="col">Description</th>
            <th scope="col">SAP instance</th>
            <th scope="col">Stock availability</th>
            {canAdd && <th scope="col">Quantity</th>}
          </tr>
        </thead>
        <tbody>
          {hits.map((hit) => {
            const key = rowKey(hit);
            const error = errors[key];
            const msgId = `ps-msg-${key.replace(/[^A-Za-z0-9_-]/g, '_')}`;
            return (
              <tr key={key} className={error ? 'is-flagged' : undefined}>
                <td className="order-id">{hit.partNumber}</td>
                <td className="ps-desc">{hit.description}</td>
                <td>{hit.sapInstance}</td>
                <td>
                  <StockBadge stock={hit.stock} />
                </td>
                {canAdd && (
                  <td className="ps-qty-cell">
                    <div className="ps-act">
                      <input
                        className={`input ps-qty${error ? ' is-invalid' : ''}`}
                        type="text"
                        inputMode="numeric"
                        aria-label={`Quantity for ${hit.partNumber}, ${hit.sapInstance}`}
                        aria-invalid={error ? true : undefined}
                        aria-describedby={error ? msgId : undefined}
                        value={quantities[key] ?? '1'}
                        disabled={hit.stock < 1}
                        onChange={(e) => setQuantities((q) => ({ ...q, [key]: e.target.value }))}
                      />
                      <button
                        type="button"
                        className="btn btn-primary"
                        aria-label={`Add ${hit.partNumber} from ${hit.sapInstance} to cart`}
                        disabled={hit.stock < 1}
                        onClick={() => add(hit)}
                      >
                        Add to cart
                      </button>
                    </div>
                    {error && (
                      <p id={msgId} className="qo-error ps-row-msg">
                        {error}
                      </p>
                    )}
                  </td>
                )}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
