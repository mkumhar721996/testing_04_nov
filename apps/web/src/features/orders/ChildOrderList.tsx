import type { ChildOrder } from '../../api/orders';
import { statusTone, toneClass } from './status';

export function ChildOrderList({ orderId, children }: { orderId: string; children: ChildOrder[] }) {
  return (
    <>
      <p className="child-title">Child orders</p>
      <ul className="child-list" aria-label={`Child orders for ${orderId}`}>
        {children.map((c) => (
          <li key={c.id}>
            <span className="child-ref">{c.id}</span>
            <span className="badge">{c.sapInstance}</span>
            <span className={toneClass(statusTone(c.status))}>{c.status}</span>
          </li>
        ))}
      </ul>
    </>
  );
}
