import { fireEvent, render, screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { OverviewCard } from './OverviewCard';
import type { Loadable, Overview } from './types';

const names = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const overview: Overview = {
  year: 2026,
  currency: 'USD',
  total: '1842.56',
  trend: { direction: 'up', percent: '2.46', previousYear: 2025 },
  months: names.map((_, i) => ({ month: i + 1, net: String(100 + i * 10) })),
  hasMovement: true,
};
const ready = (data: Overview): Loadable<Overview> => ({ status: 'ready', data, reload: vi.fn() });

describe('OverviewCard', () => {
  it('shows the total for the year (AC1)', () => {
    render(<OverviewCard overview={ready(overview)} onSoon={vi.fn()} />);
    expect(screen.getByLabelText('Total for 2026: $1,842.56')).toBeInTheDocument();
  });

  it('shows the trend (AC2)', () => {
    render(<OverviewCard overview={ready(overview)} onSoon={vi.fn()} />);
    expect(screen.getByText(/Increasing 2.46% on 2025/)).toBeInTheDocument();
  });

  it('leaves the trend out when there is nothing to compare (AC2)', () => {
    render(<OverviewCard overview={ready({ ...overview, trend: null })} onSoon={vi.fn()} />);
    expect(screen.queryByText(/Increasing|Decreasing/)).toBeNull();
  });

  it('draws one bar per month labelled Jan to Dec (AC3)', () => {
    render(<OverviewCard overview={ready(overview)} onSoon={vi.fn()} />);
    const chart = screen.getByRole('img', { name: /one bar for each month/i });
    names.forEach((m) => expect(within(chart).getByText(m)).toBeInTheDocument());
    expect(chart.querySelectorAll('rect.bar')).toHaveLength(12);
  });

  it('shows an empty message instead of the chart without movement (AC6)', () => {
    render(
      <OverviewCard
        overview={ready({ ...overview, total: '0.00', trend: null, hasMovement: false })}
        onSoon={vi.fn()}
      />,
    );
    expect(screen.getByText('No money movement in 2026')).toBeInTheDocument();
    expect(screen.queryByRole('img', { name: /bar chart/i })).toBeNull();
  });

  it('shows a loading skeleton', () => {
    render(
      <OverviewCard overview={{ status: 'loading', data: null, reload: vi.fn() }} onSoon={vi.fn()} />,
    );
    expect(screen.getByRole('status', { name: 'Loading overview' })).toBeInTheDocument();
  });

  it('shows unavailable with Try again that reloads (AC7, AC9)', () => {
    const reload = vi.fn();
    render(<OverviewCard overview={{ status: 'error', data: null, reload }} onSoon={vi.fn()} />);
    const alert = screen.getByRole('alert', { name: /overview unavailable/i });
    fireEvent.click(within(alert).getByRole('button', { name: 'Try again' }));
    expect(reload).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole('button', { name: 'Share overview' })).toBeNull();
  });

  it('placeholder controls only announce they are coming soon', () => {
    const onSoon = vi.fn();
    render(<OverviewCard overview={ready(overview)} onSoon={onSoon} />);
    fireEvent.click(screen.getByRole('button', { name: /Year/ }));
    expect(onSoon).toHaveBeenLastCalledWith('Period selection is coming soon');
    fireEvent.click(screen.getByRole('button', { name: 'Share overview' }));
    expect(onSoon).toHaveBeenLastCalledWith('Sharing is coming soon');
  });
});
