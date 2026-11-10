import type { ChildOrder, OrderLine } from '../../api/orders';

function Icon({ d }: { d: string }) {
  return (
    <svg
      className="icon"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      aria-hidden="true"
    >
      <path d={d} />
    </svg>
  );
}

const CHECK = 'M20 6 9 17l-5-5';
const ALERT = 'M12 8v4M12 16h.01M22 12a10 10 0 1 1-20 0 10 10 0 0 1 20 0Z';

export function LinesTable({ lines, label }: { lines: OrderLine[]; label: string }) {
  return (
    <div className="scroll-x">
      <table className="order-table" aria-label={label}>
        <thead>
          <tr>
            <th scope="col">Part number</th>
            <th scope="col">Description</th>
            <th scope="col" className="col-num">
              Quantity
            </th>
          </tr>
        </thead>
        <tbody>
          {lines.map((l) => (
            <tr key={l.partNumber}>
              <td>
                <span className="order-id">{l.partNumber}</span>
              </td>
              <td>{l.description}</td>
              <td className="col-num">{l.quantity}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function ChildOrderCard({ child }: { child: ChildOrder }) {
  const failed = child.status === 'failed';
  const n = child.lines.length;
  return (
    <section
      className={`card child-card${failed ? ' is-failed' : ''}`}
      aria-label={`Child order ${child.id}`}
    >
      <div className="child-head">
        <span className="badge">{child.sapInstance}</span>
        <span className="child-ref">{child.id}</span>
        {failed ? (
          <span className="badge badge-danger">
            <Icon d={ALERT} />
            Failed
          </span>
        ) : (
          <span className="badge badge-success">
            <Icon d={CHECK} />
            Placed
          </span>
        )}
      </div>
      {failed && (
        <p className="child-reason">
          {child.failureReason} None of its {n} {n === 1 ? 'line was' : 'lines were'} ordered.
        </p>
      )}
      <LinesTable lines={child.lines} label={`Lines of child order ${child.id}`} />
    </section>
  );
}
