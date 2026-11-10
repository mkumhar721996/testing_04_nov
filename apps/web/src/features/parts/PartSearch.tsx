import { useRef, useState, type FormEvent } from 'react';
import type { Role } from '../../api/auth';
import { CartSummary } from '../cart/CartSummary';
import { useCart } from '../cart/CartProvider';
import { PartSearchResults } from './PartSearchResults';
import { SourceNotice } from './SourceNotice';
import { usePartSearch } from './usePartSearch';

interface Props {
  role: Role;
  onViewCart(): void;
}

export function PartSearch({ role, onViewCart }: Props) {
  const { state, term, search, retry } = usePartSearch();
  const { addToCart } = useCart();
  const [text, setText] = useState('');
  const [added, setAdded] = useState('');
  const input = useRef<HTMLInputElement>(null);
  const loading = state.phase === 'loading';

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const next = text.trim();
    if (!next) return;
    setAdded('');
    search(next);
  };

  return (
    <div className="stack" data-search>
      <form role="search" aria-label="Part search" className="ps-form" onSubmit={submit}>
        <div className="field">
          <input
            ref={input}
            type="search"
            className="input"
            name="q"
            placeholder="Part number or description"
            aria-label="Part number or description"
            value={text}
            onChange={(e) => setText(e.target.value)}
          />
        </div>
        <button type="submit" className="btn btn-primary" disabled={loading}>
          {loading && <span className="spinner" aria-hidden="true" />}
          Search
        </button>
      </form>

      <div aria-live="polite">
        {added && (
          <div className="alert alert-success" role="status">
            {added}
          </div>
        )}
      </div>

      {loading && (
        <div className="card order-card scroll-x">
          <p role="status">Searching…</p>
          <table className="order-table ps-table" aria-label="Loading results" aria-busy="true">
            <tbody>
              {[0, 1, 2].map((i) => (
                <tr key={i}>
                  <td>
                    <div className="skeleton ps-skel" />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {state.phase === 'error' && (
        <div className="alert alert-danger" role="alert">
          <strong>The search didn't finish.</strong> Check your connection and try again.
          <button type="button" className="btn btn-secondary" onClick={retry}>
            Search again
          </button>
        </div>
      )}

      {state.phase === 'ready' && (
        <>
          <SourceNotice unavailable={state.unavailable} onSearchAgain={retry} />
          {state.hits.length === 0 ? (
            <div className="empty-state">
              <h2>No parts found for “{term}”</h2>
              <p>Check the part number or try a word from the description.</p>
              <button type="button" className="btn btn-primary" onClick={() => input.current?.focus()}>
                Search again
              </button>
            </div>
          ) : (
            <PartSearchResults hits={state.hits} canAdd={role !== 'csr'} onAdd={addToCart} onAdded={setAdded} />
          )}
        </>
      )}

      <CartSummary onViewCart={onViewCart} />
    </div>
  );
}
