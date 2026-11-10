import { fireEvent, render, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import type { OrderRow } from '../../api/orders';
import { OrderTable } from './OrderTable';
import { rollupStatus } from './status';

const standalone = (id: string, channel: 'historical' | 'other', status: string): OrderRow => ({
  id,
  orderDate: '2026-11-06',
  channel,
  status,
  children: [],
});
const poc = (id: string, kids: [string, string][], orderDate = '2026-11-09'): OrderRow => ({
  id,
  orderDate,
  channel: 'poc',
  status: null,
  children: kids.map(([sapInstance, status], i) => ({
    id: `${id}-${String.fromCharCode(65 + i)}`,
    sapInstance,
    status,
  })),
});
const kids: [string, string][] = [
  ['SAP A (EU)', 'Placed'],
  ['SAP B (US)', 'Placed'],
];

describe('OrderTable', () => {
  it('keeps the order received, newest first (AC2)', () => {
    const o = (id: string, d: string) => ({ ...standalone(id, 'other', 'Shipped'), orderDate: d });
    render(
      <OrderTable orders={[o('ORD-3', '2026-11-09'), o('ORD-2', '2026-11-08'), o('ORD-1', '2026-11-07')]} />,
    );
    expect(screen.getAllByTestId('order-id').map((n) => n.textContent)).toEqual([
      'ORD-3',
      'ORD-2',
      'ORD-1',
    ]);
  });

  it('shows a POC order as one parent row with a collapsed toggle (AC3)', () => {
    render(<OrderTable orders={[poc('ORD-10426', kids)]} />);
    expect(screen.getAllByRole('row', { name: /ORD-10426/ })).toHaveLength(1);
    expect(screen.getByRole('button', { name: /2 child orders/i })).toHaveAttribute(
      'aria-expanded',
      'false',
    );
  });

  it('drills down to each child with SAP instance and status, and collapses (AC4)', () => {
    render(<OrderTable orders={[poc('ORD-10426', [['SAP A (EU)', 'Placed'], ['SAP B (US)', 'Failed']])]} />);
    const toggle = screen.getByRole('button', { name: /child orders/i });
    fireEvent.click(toggle);
    expect(toggle).toHaveAttribute('aria-expanded', 'true');
    const items = within(screen.getByRole('list', { name: 'Child orders for ORD-10426' })).getAllByRole(
      'listitem',
    );
    expect(items).toHaveLength(2);
    expect(items[0]).toHaveTextContent('SAP A (EU)');
    expect(items[0]).toHaveTextContent('Placed');
    expect(items[1]).toHaveTextContent('SAP B (US)');
    expect(items[1]).toHaveTextContent('Failed');
    fireEvent.click(toggle);
    expect(toggle).toHaveAttribute('aria-expanded', 'false');
  });

  it('never renders child orders as rows (AC5)', () => {
    const { container } = render(<OrderTable orders={[poc('ORD-10426', kids)]} />);
    expect(container.querySelectorAll('tr.order-row')).toHaveLength(1);
    fireEvent.click(screen.getByRole('button', { name: /child orders/i }));
    expect(container.querySelectorAll('tr.order-row')).toHaveLength(1);
    expect(screen.queryByRole('row', { name: /ORD-10426-A/ })).not.toBeInTheDocument();
  });

  it('shows historical and other-channel orders as standalone rows (AC6)', () => {
    render(
      <OrderTable
        orders={[standalone('ORD-10422', 'historical', 'Delivered'), standalone('ORD-10425', 'other', 'Processing')]}
      />,
    );
    expect(screen.getAllByRole('row')).toHaveLength(3);
    expect(screen.queryByRole('button', { name: /child order/i })).not.toBeInTheDocument();
    expect(screen.getByText('Historical')).toBeInTheDocument();
    expect(screen.getByText('Other channel')).toBeInTheDocument();
    expect(screen.getByText('Delivered')).toBeInTheDocument();
  });
});

describe('rollupStatus', () => {
  const kid = (status: string) => ({ id: 'x', sapInstance: 's', status });
  it('rolls child statuses up', () => {
    expect(rollupStatus([kid('Placed'), kid('Placed')]).label).toBe('All placed');
    expect(rollupStatus([kid('Placed'), kid('Failed')]).label).toBe('Partially placed');
    expect(rollupStatus([kid('Failed')]).label).toBe('Failed');
    expect(rollupStatus([kid('Placed'), kid('Retrying')]).label).toBe('Retrying');
  });
});
