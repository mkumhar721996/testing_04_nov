import { fireEvent, render, screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { childA, childB, failedA, failedB, order } from './fixtures';
import { OrderConfirmation } from './OrderConfirmation';
import { rollUpStatus } from './rollUpStatus';

const show = (children = [childA, childB]) =>
  render(<OrderConfirmation order={order(children)} onViewOrders={vi.fn()} onBackToCart={vi.fn()} />);
const cards = () => screen.getAllByRole('region', { name: /^Child order / });

describe('OrderConfirmation', () => {
  it('shows a heading and one parent with a child per SAP instance (AC1, AC2)', () => {
    show();
    expect(screen.getByRole('heading', { name: /order confirmation/i })).toBeInTheDocument();
    expect(screen.getByRole('region', { name: 'Parent order ORD-10427' })).toBeInTheDocument();
    expect(cards()).toHaveLength(2);
    const a = screen.getByRole('region', { name: 'Child order ORD-10427-A' });
    const b = screen.getByRole('region', { name: 'Child order ORD-10427-B' });
    expect(within(a).getByText('SAP A (EU)')).toBeInTheDocument();
    expect(within(b).getByText('SAP B (US)')).toBeInTheDocument();
  });

  it('marks every placed child as Placed (AC3)', () => {
    show();
    for (const card of cards()) {
      expect(within(card).getByText('Placed')).toBeInTheDocument();
      expect(within(card).queryByText('Failed')).not.toBeInTheDocument();
    }
    expect(screen.getByText('All placed')).toBeInTheDocument();
  });

  it('shows the failed child with its reason (AC4)', () => {
    show([childA, failedB]);
    const failed = screen.getByRole('region', { name: 'Child order ORD-10427-B' });
    expect(within(failed).getByText('Failed')).toBeInTheDocument();
    expect(within(failed).getByText(/did not respond in time/)).toBeInTheDocument();
    expect(within(failed).getByText(/None of its 3 lines were ordered/)).toBeInTheDocument();
    expect(screen.getByText('Partially placed')).toBeInTheDocument();
  });

  it('keeps the successful child Placed (AC5)', () => {
    show([childA, failedB]);
    const ok = screen.getByRole('region', { name: 'Child order ORD-10427-A' });
    expect(within(ok).getByText('Placed')).toBeInTheDocument();
    expect(within(ok).queryByText('Failed')).not.toBeInTheDocument();
  });

  it('shows every child failed under the parent (AC9)', () => {
    show([failedA, failedB]);
    expect(cards()).toHaveLength(2);
    cards().forEach((c) => expect(within(c).getByText('Failed')).toBeInTheDocument());
    expect(screen.getByRole('region', { name: 'Parent order ORD-10427' })).toBeInTheDocument();
    expect(screen.getByText('Your order was not placed.')).toBeInTheDocument();
  });

  it('offers View orders and Back to cart', () => {
    const onViewOrders = vi.fn();
    const onBackToCart = vi.fn();
    render(<OrderConfirmation order={order([childA])} onViewOrders={onViewOrders} onBackToCart={onBackToCart} />);
    fireEvent.click(screen.getByRole('button', { name: 'View orders' }));
    fireEvent.click(screen.getByRole('button', { name: 'Back to cart' }));
    expect(onViewOrders).toHaveBeenCalledOnce();
    expect(onBackToCart).toHaveBeenCalledOnce();
  });
});

describe('rollUpStatus', () => {
  it.each([
    [[childA, childB], 'All placed'],
    [[childA, failedB], 'Partially placed'],
    [[failedA, failedB], 'Failed'],
  ])('rolls up %#', (children, expected) => {
    expect(rollUpStatus(children)).toBe(expected);
  });
});
