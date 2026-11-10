import { fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { OrdersPage } from './OrdersPage';

const list = [
  { id: 'ORD-10424', placedAt: '2026-11-09', source: 'Web', status: 'Partially placed', failedChildCount: 1 },
  { id: 'ORD-10423', placedAt: '2026-11-08', source: 'Web', status: 'All placed', failedChildCount: 0 },
];
const detail = {
  id: 'ORD-10424',
  children: [
    { id: 'ORD-10424-A', sapInstance: 'SAP A (EU)', status: 'placed', lines: [] },
    {
      id: 'ORD-10424-B',
      sapInstance: 'SAP B (US)',
      status: 'failed',
      failureReason: 'SAP B (US) did not respond in time.',
      lines: [],
    },
  ],
};

const stub = (rows: unknown) =>
  vi.stubGlobal(
    'fetch',
    vi.fn((url: string) =>
      Promise.resolve(new Response(JSON.stringify(/orders\/ORD/.test(url) ? detail : rows), { status: 200 })),
    ),
  );

describe('OrdersPage', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('offers View order only on parents with a failed child', async () => {
    stub(list);
    render(<OrdersPage onSearch={vi.fn()} />);
    expect(await screen.findByRole('button', { name: /View order ORD-10424/ })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /View order ORD-10423/ })).not.toBeInTheDocument();
  });

  it('drills down to the failed child order (AC7)', async () => {
    stub(list);
    render(<OrdersPage onSearch={vi.fn()} />);
    fireEvent.click(await screen.findByRole('button', { name: 'View order ORD-10424, 1 failed child order' }));
    const failed = await screen.findByRole('region', { name: 'Child order ORD-10424-B' });
    expect(within(failed).getByText('Failed')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Back to orders' }));
    expect(await screen.findByRole('table', { name: 'Orders, newest first' })).toBeInTheDocument();
  });

  it('explains an empty list', async () => {
    stub([]);
    render(<OrdersPage onSearch={vi.fn()} />);
    expect(await screen.findByRole('heading', { name: 'No orders have been placed yet' })).toBeInTheDocument();
  });
});
