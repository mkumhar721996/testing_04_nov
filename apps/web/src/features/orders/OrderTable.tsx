import { useState } from 'react';
import type { OrderChannel, OrderRow } from '../../api/orders';
import { ChildOrderList } from './ChildOrderList';
import { rollupStatus, statusTone, toneClass } from './status';

const CHANNEL_LABEL: Record<OrderChannel, string> = {
  poc: 'POC',
  historical: 'Historical',
  other: 'Other channel',
};

const dateFormat = new Intl.DateTimeFormat('en-GB', {
  day: 'numeric',
  month: 'short',
  year: 'numeric',
  timeZone: 'UTC',
});

function OrderEntry({ order }: { order: OrderRow }) {
  const [open, setOpen] = useState(false);
  const isPoc = order.channel === 'poc';
  const badge = isPoc
    ? rollupStatus(order.children)
    : { label: order.status ?? '', tone: statusTone(order.status ?? '') };
  const childRowId = `children-${order.id}`;
  const count = order.children.length;

  return (
    <>
      <tr className={`order-row${open ? ' is-open' : ''}`} aria-label={`Order ${order.id}`}>
        <td data-label="Order" className="order-id" data-testid="order-id">
          {order.id}
        </td>
        <td data-label="Order date">
          <time dateTime={order.orderDate}>{dateFormat.format(new Date(order.orderDate))}</time>
        </td>
        <td data-label="Source">
          <span className="badge">{CHANNEL_LABEL[order.channel]}</span>
        </td>
        <td data-label="Status">
          <span className={toneClass(badge.tone)}>{badge.label}</span>
        </td>
        <td data-label="Details" className="col-action">
          {isPoc && (
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              aria-expanded={open}
              aria-controls={childRowId}
              onClick={() => setOpen((v) => !v)}
            >
              {count} child {count === 1 ? 'order' : 'orders'}
            </button>
          )}
        </td>
      </tr>
      {isPoc && (
        <tr className="child-row" id={childRowId} hidden={!open}>
          <td colSpan={5}>
            <ChildOrderList orderId={order.id} children={order.children} />
          </td>
        </tr>
      )}
    </>
  );
}

export function OrderTable({ orders }: { orders: OrderRow[] }) {
  return (
    <table className="order-table" aria-label="Orders, newest first">
      <thead>
        <tr>
          <th scope="col">Order</th>
          <th scope="col">Order date</th>
          <th scope="col">Source</th>
          <th scope="col">Status</th>
          <th scope="col" className="col-action">
            Details
          </th>
        </tr>
      </thead>
      <tbody>
        {orders.map((o) => (
          <OrderEntry key={o.id} order={o} />
        ))}
      </tbody>
    </table>
  );
}
