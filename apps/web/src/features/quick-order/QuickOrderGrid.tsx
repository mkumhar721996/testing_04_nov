import type { ClipboardEvent } from 'react';
import { Outcome, QuickOrderApi, Row, useQuickOrder } from './useQuickOrder';

const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;

function OutcomeAlert({ outcome }: { outcome: Outcome }) {
  switch (outcome.kind) {
    case 'success':
      return (
        <div className="alert alert-success" role="status">
          <strong>{plural(outcome.ok, 'row was', 'rows were')} added to your cart.</strong> Each part
          appears once per SAP instance that holds it.
        </div>
      );
    case 'partial':
      return (
        <div className="alert alert-warning" role="alert">
          <strong>
            {outcome.ok} of {outcome.ok + outcome.bad} rows added to your cart.
          </strong>{' '}
          {plural(outcome.bad, 'row needs', 'rows need')} correcting. Fix it and select Add to cart
          again.
        </div>
      );
    case 'flagged':
      return (
        <div className="alert alert-danger" role="alert">
          <strong>{plural(outcome.bad, 'row needs', 'rows need')} correcting.</strong> Nothing was
          added to your cart. Fix the flagged rows and select Add to cart again.
        </div>
      );
    case 'empty':
      return (
        <div className="alert alert-warning" role="status">
          <strong>Nothing to add.</strong> Enter a part number and quantity in at least one row.
        </div>
      );
    case 'error':
      return (
        <div className="alert alert-danger stack-sm" role="alert">
          <strong>We couldn’t add your rows.</strong>
          <span>
            Nothing was added to your cart and your grid is unchanged. Check your connection and
            select Add to cart again.
          </span>
        </div>
      );
  }
}

export function QuickOrderGrid(props: QuickOrderApi) {
  const q = useQuickOrder(props);

  const onPaste = (e: ClipboardEvent<HTMLInputElement>, row: Row) => {
    if (q.paste(row.key, e.clipboardData.getData('text'))) e.preventDefault();
  };

  return (
    <div className="stack" data-quick>
      <div aria-live="polite">{q.outcome && <OutcomeAlert outcome={q.outcome} />}</div>
      <div className="card order-card">
        <div className="scroll-x">
          <table className="order-table qo-table" aria-label="Quick-order rows">
            <thead>
              <tr>
                <th scope="col">Row</th>
                <th scope="col">Part number</th>
                <th scope="col" className="col-num">
                  Quantity
                </th>
                <th scope="col">Match and stock shown</th>
                <th scope="col">Status</th>
                <th scope="col" className="col-action">
                  Remove
                </th>
              </tr>
            </thead>
            <tbody>
              {q.rows.map((r, i) => {
                const n = i + 1;
                const err = r.result && !r.result.ok ? r.result : null;
                const errId = `qo-error-${r.key}`;
                const key = r.part.trim().toUpperCase();
                const match = q.matches[key];
                const field = (f: 'part' | 'qty') => ({
                  'aria-invalid': err?.field === f ? true : undefined,
                  'aria-describedby': err?.field === f ? errId : undefined,
                });
                return (
                  <tr
                    key={r.key}
                    className={r.added ? 'is-added' : err ? 'is-flagged' : undefined}
                  >
                    <td className="qo-rownum">{n}</td>
                    <td>
                      <input
                        className={`input qo-part${err?.field === 'part' ? ' is-invalid' : ''}`}
                        value={r.part}
                        aria-label={`Part number, row ${n}`}
                        autoComplete="off"
                        spellCheck={false}
                        disabled={r.added}
                        onChange={(e) => q.update(r.key, 'part', e.target.value)}
                        onBlur={() => q.checkPart(r.part)}
                        onPaste={(e) => onPaste(e, r)}
                        {...field('part')}
                      />
                    </td>
                    <td>
                      <input
                        className={`input qo-qty${err?.field === 'qty' ? ' is-invalid' : ''}`}
                        value={r.qty}
                        inputMode="numeric"
                        aria-label={`Quantity, row ${n}`}
                        autoComplete="off"
                        disabled={r.added}
                        onChange={(e) => q.update(r.key, 'qty', e.target.value)}
                        onPaste={(e) => onPaste(e, r)}
                        {...field('qty')}
                      />
                    </td>
                    <td>
                      {match ? (
                        <div className="qo-match">
                          <span>{match.description}</span>
                          {match.stock.map((s) => (
                            <span className="badge" key={s.instance}>
                              {s.instance}: {s.available} in stock
                            </span>
                          ))}
                        </div>
                      ) : (
                        <span className="text-muted qo-match">
                          {r.part.trim() && match === null
                            ? 'No match'
                            : 'Shown after you enter a part number'}
                        </span>
                      )}
                    </td>
                    <td className="qo-status">
                      {r.added ? (
                        <span className="badge badge-success">Added to cart</span>
                      ) : err ? (
                        <p className="qo-error" id={errId}>
                          {err.message}
                        </p>
                      ) : null}
                    </td>
                    <td className="col-action">
                      <button
                        className="btn btn-ghost btn-icon"
                        type="button"
                        aria-label={`Remove row ${n}`}
                        onClick={() => q.removeRow(r.key)}
                      >
                        ×
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <div className="qo-bar">
          <button className="btn btn-secondary" type="button" onClick={q.addRow}>
            + Add row
          </button>
          <button className="btn btn-ghost" type="button" onClick={q.clear}>
            Clear grid
          </button>
          <span className="spacer" />
          <span className="qo-count" role="status">
            {q.note || `${plural(q.filled, 'row', 'rows')} entered`}
          </span>
          {q.pending ? (
            <button className="btn btn-primary" type="button" disabled aria-busy="true">
              <span className="spinner" aria-hidden="true" />
              Adding to cart…
            </button>
          ) : (
            <button className="btn btn-primary" type="button" onClick={q.add}>
              Add to cart
            </button>
          )}
        </div>
      </div>
      {q.cart.length > 0 && (
        <section className="card order-card scroll-x" aria-label="Added to your cart">
          <div className="qo-heading">
            <h2 className="text-lg">Added to your cart</h2>
          </div>
          <table className="order-table" aria-label="Lines added to the unified cart">
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
              {q.cart.map((l, i) => (
                <tr key={i}>
                  <td>
                    <span className="order-id">{l.part}</span>
                  </td>
                  <td>{l.description}</td>
                  <td>
                    <span className="badge">{l.instance}</span>
                  </td>
                  <td className="col-num">{l.quantity}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}
      {q.toast && (
        <div className="toast is-open" role="status">
          {q.toast}
        </div>
      )}
    </div>
  );
}
