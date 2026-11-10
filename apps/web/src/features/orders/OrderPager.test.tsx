import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { OrderPager } from './OrderPager';

describe('OrderPager', () => {
  it('offers Next on page 1 of 26 orders (AC1)', () => {
    const onPage = vi.fn();
    render(<OrderPager page={1} pageSize={25} total={26} onPage={onPage} />);
    expect(screen.getByRole('status')).toHaveTextContent('Showing 1–25 of 26 orders, page 1 of 2');
    expect(screen.getByRole('button', { name: 'Previous page' })).toBeDisabled();
    fireEvent.click(screen.getByRole('button', { name: 'Next page' }));
    expect(onPage).toHaveBeenCalledWith(2);
  });

  it('has one page and no Next for exactly 25 orders (AC8)', () => {
    render(<OrderPager page={1} pageSize={25} total={25} onPage={() => {}} />);
    expect(screen.getByRole('status')).toHaveTextContent('Showing 1–25 of 25 orders, page 1 of 1');
    expect(screen.getByRole('button', { name: 'Next page' })).toBeDisabled();
  });

  it('enables Previous on the last page', () => {
    render(<OrderPager page={2} pageSize={25} total={26} onPage={() => {}} />);
    expect(screen.getByRole('status')).toHaveTextContent('Showing 26–26 of 26 orders, page 2 of 2');
    expect(screen.getByRole('button', { name: 'Previous page' })).toBeEnabled();
  });
});
