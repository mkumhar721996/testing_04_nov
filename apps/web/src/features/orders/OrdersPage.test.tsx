import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { OrderPage, OrderRow } from '../../api/orders';
import { OrdersPage } from './OrdersPage';

const rows = (n: number, start = 1): OrderRow[] =>
  Array.from({ length: n }, (_, i) => ({
    id: `ORD-${10000 + start + i}`,
    orderDate: '2026-11-09',
    channel: 'other',
    status: 'Shipped',
    children: [],
  }));
const body = (items: OrderRow[], total: number, page = 1): OrderPage => ({
  items,
  total,
  page,
  pageSize: 25,
});
const json = (b: unknown) => Promise.resolve(new Response(JSON.stringify(b)));
const stub = (impl: (url: string) => Promise<Response>) => {
  const fetchMock = vi.fn(impl);
  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
};

describe('OrdersPage', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('shows 25 rows and a Next control for 26 orders, then page 2 (AC1, AC7)', async () => {
    const fetchMock = stub((url) =>
      json(url.includes('page=2') ? body(rows(1, 26), 26, 2) : body(rows(25), 26)),
    );
    render(<OrdersPage onSearch={() => {}} />);
    expect(await screen.findAllByRole('row')).toHaveLength(26);
    expect(screen.queryByText('ORD-20990')).toBeNull();
    expect(screen.getByRole('button', { name: 'Next page' })).toBeEnabled();
    expect(screen.getByRole('button', { name: 'Previous page' })).toBeDisabled();
    fireEvent.click(screen.getByRole('button', { name: 'Next page' }));
    await waitFor(() => expect(screen.getAllByRole('row')).toHaveLength(2));
    expect(fetchMock).toHaveBeenLastCalledWith(
      expect.stringContaining('/orders?page=2&pageSize=25'),
      expect.anything(),
    );
  });

  it('shows all 25 orders on one page for exactly 25 (AC8)', async () => {
    stub(() => json(body(rows(25), 25)));
    render(<OrdersPage onSearch={() => {}} />);
    expect(await screen.findAllByRole('row')).toHaveLength(26);
    expect(screen.getByRole('button', { name: 'Next page' })).toBeDisabled();
    expect(screen.getByRole('status')).toHaveTextContent('Showing 1–25 of 25 orders, page 1 of 1');
  });

  it('shows the empty message and no rows (AC9, AC10)', async () => {
    stub(() => json(body([], 0)));
    const onSearch = vi.fn();
    render(<OrdersPage onSearch={onSearch} />);
    expect(
      await screen.findByRole('heading', { name: 'No orders have been placed yet' }),
    ).toBeInTheDocument();
    expect(screen.queryByRole('table')).not.toBeInTheDocument();
    expect(screen.queryAllByRole('row')).toHaveLength(0);
    expect(screen.queryByRole('navigation', { name: 'Order pages' })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Search parts' }));
    expect(onSearch).toHaveBeenCalledTimes(1);
  });

  it('shows a loading region while the request is pending', () => {
    stub(() => new Promise(() => {}));
    render(<OrdersPage onSearch={() => {}} />);
    expect(screen.getByRole('status', { name: 'Loading your orders' })).toBeInTheDocument();
  });

  it('shows an error and retries', async () => {
    let calls = 0;
    stub(() => (calls++ === 0 ? Promise.reject(new Error('down')) : json(body(rows(2), 2))));
    render(<OrdersPage onSearch={() => {}} />);
    expect(await screen.findByRole('alert')).toHaveTextContent('We couldn’t load your orders.');
    fireEvent.click(screen.getByRole('button', { name: 'Try again' }));
    expect(await screen.findAllByRole('row')).toHaveLength(3);
  });
});
