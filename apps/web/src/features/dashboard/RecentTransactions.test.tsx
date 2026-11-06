import { fireEvent, render, screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { RecentTransactions } from './RecentTransactions';
import type { Loadable, Transaction } from './types';

const tx = (
  id: string,
  merchant: string,
  amount: string,
  status: Transaction['status'] = 'completed',
): Transaction => ({
  id,
  merchant,
  amount,
  status,
  occurredAt: '2026-11-06T09:42:00.000Z',
  cardLast4: '2841',
});
const list = [
  tx('1', 'Adobe Creative Cloud', '-59.99', 'in_progress'),
  tx('2', 'Northwind Logistics salary', '2450.00'),
  tx('3', 'Fresh Market', '-84.32'),
  tx('4', 'Transfer from savings', '300.00'),
  tx('5', 'Blue Door Café', '-12.40'),
];
const ready = (data: Transaction[]): Loadable<Transaction[]> => ({
  status: 'ready',
  data,
  reload: vi.fn(),
});

describe('RecentTransactions', () => {
  it('lists the latest transactions with status, card and signed amount (AC4)', () => {
    render(<RecentTransactions transactions={ready(list)} currency="USD" onSoon={vi.fn()} />);
    const ul = screen.getByRole('list', { name: 'Latest transactions' });
    expect(within(ul).getAllByRole('listitem')).toHaveLength(5);
    expect(screen.getByText('-$59.99')).toBeInTheDocument();
    expect(screen.getByText('+$2,450.00')).toBeInTheDocument();
    expect(screen.getByText('In progress')).toBeInTheDocument();
    expect(screen.getAllByText('•••• 2841').length).toBeGreaterThan(0);
  });

  it('shows an empty message in place of the list (AC5)', () => {
    render(<RecentTransactions transactions={ready([])} currency="USD" onSoon={vi.fn()} />);
    expect(screen.getByText('No transactions yet')).toBeInTheDocument();
    expect(screen.queryByRole('list', { name: 'Latest transactions' })).toBeNull();
  });

  it('shows a loading skeleton', () => {
    render(
      <RecentTransactions
        transactions={{ status: 'loading', data: null, reload: vi.fn() }}
        currency="USD"
        onSoon={vi.fn()}
      />,
    );
    expect(screen.getByRole('status', { name: 'Loading recent transactions' })).toBeInTheDocument();
  });

  it('shows unavailable with Try again that reloads (AC8, AC10)', () => {
    const reload = vi.fn();
    render(
      <RecentTransactions
        transactions={{ status: 'error', data: null, reload }}
        currency="USD"
        onSoon={vi.fn()}
      />,
    );
    const alert = screen.getByRole('alert', { name: /recent transactions unavailable/i });
    fireEvent.click(within(alert).getByRole('button', { name: 'Try again' }));
    expect(reload).toHaveBeenCalledTimes(1);
    expect(screen.queryByText('View all')).toBeNull();
  });

  it('View all and Deposit are placeholders', () => {
    const onSoon = vi.fn();
    const { rerender } = render(
      <RecentTransactions transactions={ready(list)} currency="USD" onSoon={onSoon} />,
    );
    fireEvent.click(screen.getByText('View all'));
    expect(onSoon).toHaveBeenLastCalledWith('Full transaction list is coming soon');
    rerender(<RecentTransactions transactions={ready([])} currency="USD" onSoon={onSoon} />);
    fireEvent.click(screen.getByRole('button', { name: /Deposit/ }));
    expect(onSoon).toHaveBeenLastCalledWith('Deposit is coming soon');
  });
});
