import { FormEvent, useCallback, useEffect, useState } from 'react';
import { CartLine, changeQuantity, getCart, removeLine } from '../../api/cart';
import { parseQuantity } from './quantity';

type Banner =
  | { kind: 'updated' }
  | { kind: 'over-stock'; part: string; stock: number; quantity: number }
  | { kind: 'removed'; description: string }
  | { kind: 'failed'; text: string };

export function CartPage({ onSearch }: { onSearch: () => void }) {
  const [lines, setLines] = useState<CartLine[] | null>(null);
  const [loadFailed, setLoadFailed] = useState(false);
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [invalidId, setInvalidId] = useState<string | null>(null);
  const [banner, setBanner] = useState<Banner | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(() => {
    setLoadFailed(false);
    setLines(null);
    getCart().then(
      (loaded) => {
        setLines(loaded);
        setDrafts({});
      },
      () => setLoadFailed(true),
    );
  }, []);

  useEffect(load, [load]);

  const replaceLine = (line: CartLine) =>
    setLines((current) => current?.map((l) => (l.id === line.id ? line : l)) ?? null);
  const resetDraft = (line: CartLine) =>
    setDrafts((d) => ({ ...d, [line.id]: String(line.quantity) }));

  async function update(event: FormEvent, line: CartLine) {
    event.preventDefault();
    if (busy) return;
    setBanner(null);
    const quantity = parseQuantity((drafts[line.id] ?? String(line.quantity)).trim());
    if (quantity === null) {
      setInvalidId(line.id);
      return;
    }
    setInvalidId(null);
    setBusy(true);
    const result = await changeQuantity(line.id, quantity);
    setBusy(false);
    if (result.kind === 'ok') {
      replaceLine(result.line);
      resetDraft(result.line);
      setBanner({ kind: 'updated' });
    } else if (result.kind === 'over-stock') {
      resetDraft(line);
      replaceLine({ ...line, stockShown: result.stock });
      setBanner({ kind: 'over-stock', part: line.partNumber, stock: result.stock, quantity: line.quantity });
    } else {
      resetDraft(line);
      setBanner({ kind: 'failed', text: 'We couldn’t update that quantity. Try again.' });
    }
  }

  async function remove(line: CartLine) {
    if (busy) return;
    setBanner(null);
    setInvalidId(null);
    setBusy(true);
    const removed = await removeLine(line.id);
    setBusy(false);
    if (removed) {
      setLines((current) => current?.filter((l) => l.id !== line.id) ?? null);
      setBanner({ kind: 'removed', description: line.description });
    } else {
      setBanner({ kind: 'failed', text: 'We couldn’t remove that line. Try again.' });
    }
  }

  const count = lines?.length ?? 0;

  return (
    <div className="stack">
      <div className="cart-head">
        <h1 className="text-lg" style={{ margin: 0 }}>
          My cart
        </h1>
        {lines && (
          <span className="text-muted">
            {count} {count === 1 ? 'line' : 'lines'}
          </span>
        )}
      </div>
      <p className="text-muted" style={{ margin: 0 }}>
        Only you can see this cart. It holds parts from every SAP instance you buy from.
      </p>

      {loadFailed && (
        <div className="alert alert-danger stack-sm" role="alert">
          <strong>We couldn’t load your cart.</strong>
          <span>Your lines are safe. Check your connection and try again.</span>
          <div>
            <button className="btn btn-secondary btn-sm" type="button" onClick={load}>
              Try again
            </button>
          </div>
        </div>
      )}

      {!loadFailed && lines === null && (
        <div className="card cart-list" role="status" aria-label="Loading your cart">
          <div className="stack" style={{ padding: 'var(--space-3)' }}>
            <div className="skeleton skeleton-row" />
            <div className="skeleton skeleton-row" />
          </div>
        </div>
      )}

      {banner?.kind === 'updated' && (
        <div className="alert alert-success" role="status">
          Cart updated.
        </div>
      )}
      {banner?.kind === 'over-stock' && (
        <div className="alert alert-danger" role="alert">
          Only {banner.stock} in stock for {banner.part}. Quantity kept at {banner.quantity}.
        </div>
      )}
      {banner?.kind === 'removed' && (
        <div className="alert alert-info" role="status">
          {banner.description} removed from your cart.
        </div>
      )}
      {banner?.kind === 'failed' && (
        <div className="alert alert-danger" role="alert">
          {banner.text}
        </div>
      )}

      {lines && lines.length === 0 && (
        <div className="empty-state stack-sm">
          <h2 className="text-lg" style={{ margin: 0 }}>
            Your cart is empty
          </h2>
          <p style={{ margin: 0 }}>Parts you add from search appear here, from every SAP instance.</p>
          <div>
            <button className="btn btn-primary" type="button" onClick={onSearch}>
              Search parts
            </button>
          </div>
        </div>
      )}

      {lines && lines.length > 0 && (
        <ul className="card cart-list" aria-label="Cart lines">
          {lines.map((line) => {
            const invalid = invalidId === line.id;
            const errorId = `qty-error-${line.id}`;
            return (
              <li className="cart-line" key={line.id}>
                <div className="cart-info stack-sm">
                  <strong className="cart-part">{line.partNumber}</strong>
                  <span>{line.description}</span>
                  <div className="cluster">
                    <span className="badge">{line.sapInstance}</span>
                    <span className="badge badge-success">In stock: {line.stockShown}</span>
                  </div>
                </div>
                <form className="qty-form" noValidate onSubmit={(e) => update(e, line)}>
                  <label className="qty-label">
                    Qty
                    <input
                      className={`input qty-input${invalid ? ' is-invalid' : ''}`}
                      type="text"
                      inputMode="numeric"
                      autoComplete="off"
                      aria-label={`Qty for ${line.partNumber}`}
                      aria-invalid={invalid ? true : undefined}
                      aria-describedby={invalid ? errorId : undefined}
                      value={drafts[line.id] ?? String(line.quantity)}
                      onChange={(e) => setDrafts((d) => ({ ...d, [line.id]: e.target.value }))}
                    />
                  </label>
                  <button className="btn btn-secondary btn-sm" type="submit" disabled={busy}>
                    Update
                  </button>
                  <button
                    className="btn btn-ghost btn-sm"
                    type="button"
                    aria-label={`Remove ${line.partNumber}`}
                    disabled={busy}
                    onClick={() => remove(line)}
                  >
                    <svg
                      className="icon"
                      aria-hidden="true"
                      viewBox="0 0 24 24"
                      width="16"
                      height="16"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M3 6h18M8 6V4h8v2M6 6l1 14h10l1-14M10 11v6M14 11v6" />
                    </svg>
                    Remove
                  </button>
                  {invalid && (
                    <span className="field-error qty-error" id={errorId} role="alert">
                      Enter a whole number greater than 0. Quantity stays at {line.quantity}.
                    </span>
                  )}
                </form>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
