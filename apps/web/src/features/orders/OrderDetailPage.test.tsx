import { fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { failedB, childA } from './fixtures';
import { OrderDetailPage } from './OrderDetailPage';

const detail = {
  id: 'ORD-10424',
  children: [
    { ...childA, id: 'ORD-10424-A' },
    { ...failedB, id: 'ORD-10424-B' },
  ],
};

describe('OrderDetailPage', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('lists every line of the failed child order (AC8)', async () => {
    vi.stubGlobal('fetch', vi.fn(() => Promise.resolve(new Response(JSON.stringify(detail)))));
    render(<OrderDetailPage id="ORD-10424" onBack={vi.fn()} />);
    expect(screen.getByRole('status')).toBeInTheDocument();
    const card = await screen.findByRole('region', { name: 'Child order ORD-10424-B' });
    const table = within(card).getByRole('table', { name: 'Lines of child order ORD-10424-B' });
    expect(within(table).getAllByRole('row')).toHaveLength(1 + 3);
    expect(within(table).getByText('CPL-QD-38')).toBeInTheDocument();
  });

  it('shows an error and retries', async () => {
    const f = vi
      .fn()
      .mockResolvedValueOnce(new Response('{}', { status: 500 }))
      .mockResolvedValue(new Response(JSON.stringify(detail)));
    vi.stubGlobal('fetch', f);
    render(<OrderDetailPage id="ORD-10424" onBack={vi.fn()} />);
    expect(await screen.findByText('We couldn’t load this order.')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Try again' }));
    expect(await screen.findByRole('region', { name: 'Child order ORD-10424-B' })).toBeInTheDocument();
    expect(f).toHaveBeenCalledTimes(2);
  });
});
