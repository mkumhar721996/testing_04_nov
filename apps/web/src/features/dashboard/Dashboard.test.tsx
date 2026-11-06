import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { Dashboard } from './Dashboard';

const card = { last4: '9286', expiry: '08/32', balance: { amount: '12680.42', currency: 'USD' } };
const overview = {
  year: 2026,
  currency: 'USD',
  total: '1842.56',
  trend: { direction: 'up', percent: '2.46', previousYear: 2025 },
  months: Array.from({ length: 12 }, (_, i) => ({ month: i + 1, net: String(100 + i) })),
  hasMovement: true,
};
const transactions = [
  {
    id: '1',
    merchant: 'Adobe Creative Cloud',
    occurredAt: '2026-11-06T09:42:00.000Z',
    status: 'in_progress',
    cardLast4: '2841',
    amount: '-59.99',
  },
];
const json = (body: unknown) => Promise.resolve(new Response(JSON.stringify(body)));
const callsTo = (fetchMock: ReturnType<typeof vi.fn>, suffix: string) =>
  fetchMock.mock.calls.filter((c) => String(c[0]).endsWith(suffix));
const routes: Record<string, () => Promise<Response>> = {
  '/me/card-summary': () => json(card),
  '/me/overview': () => json(overview),
  '/me/transactions': () => json(transactions),
  '/me': () => json({ name: 'Ada Lovelace' }),
};
/** Default responses, with the given routes (by URL suffix) replaced. */
const respond =
  (overrides: Record<string, () => Promise<Response>> = {}) =>
  (url: string) => {
    const table = { ...routes, ...overrides };
    const key = Object.keys(table).find((suffix) => String(url).endsWith(suffix));
    return table[key as string]();
  };
const down = () => Promise.reject(new Error('down'));

describe('Dashboard', () => {
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    fetchMock = vi.fn(respond());
    vi.stubGlobal('fetch', fetchMock);
  });
  afterEach(() => vi.unstubAllGlobals());

  it('shows the top bar, main nav and a greeting with the user name (AC2, 5, 6)', async () => {
    render(<Dashboard />);
    expect(screen.getByRole('banner')).toBeInTheDocument();
    expect(screen.getByRole('navigation', { name: 'Main' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Dashboard' })).toHaveAttribute(
      'aria-current',
      'page',
    );
    expect(
      await screen.findByRole('heading', { level: 1, name: 'Welcome back, Ada Lovelace!' }),
    ).toBeInTheDocument();
  });

  it('shows the masked card, expiry and balance (AC3, 4, 9)', async () => {
    const { container } = render(<Dashboard />);
    const number = await screen.findByLabelText('Card ending in 9286');
    expect(number).toHaveTextContent('•••• 9286');
    expect(screen.getByText('08/32')).toBeInTheDocument();
    expect(screen.getByText('$12,680.42')).toBeInTheDocument();
    expect(container.textContent).not.toMatch(/\d{13,}/);
  });

  it('reloads only the card section on Try again (AC14, 15, 16)', async () => {
    let cardCalls = 0;
    fetchMock.mockImplementation(
      respond({
        '/me/card-summary': () => {
          cardCalls += 1;
          return cardCalls === 1 ? down() : json(card);
        },
      }),
    );
    render(<Dashboard />);

    expect(await screen.findByRole('alert')).toHaveTextContent(/card and balance unavailable/i);
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Welcome back, Ada');

    fireEvent.click(screen.getByRole('button', { name: 'Try again' }));
    expect(
      screen.getByRole('status', { name: /loading card and balance/i }),
    ).toBeInTheDocument();
    expect(await screen.findByLabelText('Card ending in 9286')).toBeInTheDocument();

    expect(callsTo(fetchMock, '/me/card-summary')).toHaveLength(2);
    expect(callsTo(fetchMock, '/me')).toHaveLength(1);
  });

  it('shows the unavailable panel on a non-2xx response (AC14)', async () => {
    fetchMock.mockImplementation(
      respond({ '/me/card-summary': () => Promise.resolve(new Response('', { status: 404 })) }),
    );
    render(<Dashboard />);
    const alert = await screen.findByRole('alert');
    expect(within(alert).getByRole('button', { name: 'Try again' })).toBeInTheDocument();
    await waitFor(() => expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Ada'));
  });

  describe('Overview and Recent transactions', () => {
    it('shows both cards with their data', async () => {
      render(<Dashboard />);
      expect(await screen.findByLabelText('Total for 2026: $1,842.56')).toBeInTheDocument();
      expect(screen.getByRole('img', { name: /one bar for each month/i })).toBeInTheDocument();
      expect(await screen.findByText('Adobe Creative Cloud')).toBeInTheDocument();
    });

    it.each([
      ['rejected request', down],
      ['non-2xx response', () => Promise.resolve(new Response('', { status: 500 }))],
    ])('shows Overview unavailable on a %s (AC7)', async (_, fail) => {
      fetchMock.mockImplementation(respond({ '/me/overview': fail }));
      render(<Dashboard />);
      const alert = await screen.findByRole('alert', { name: /overview unavailable/i });
      expect(within(alert).getByRole('button', { name: 'Try again' })).toBeInTheDocument();
    });

    it.each([
      ['rejected request', down],
      ['non-2xx response', () => Promise.resolve(new Response('', { status: 500 }))],
    ])('shows Recent transactions unavailable on a %s (AC8)', async (_, fail) => {
      fetchMock.mockImplementation(respond({ '/me/transactions': fail }));
      render(<Dashboard />);
      const alert = await screen.findByRole('alert', {
        name: /recent transactions unavailable/i,
      });
      expect(within(alert).getByRole('button', { name: 'Try again' })).toBeInTheDocument();
    });

    it('reloads only the Overview card on Try again (AC9)', async () => {
      let calls = 0;
      fetchMock.mockImplementation(
        respond({
          '/me/overview': () => {
            calls += 1;
            return calls === 1 ? down() : json(overview);
          },
        }),
      );
      render(<Dashboard />);
      const alert = await screen.findByRole('alert', { name: /overview unavailable/i });
      await screen.findByText('Adobe Creative Cloud');
      fireEvent.click(within(alert).getByRole('button', { name: 'Try again' }));
      expect(within(alert).getByRole('button', { name: /Trying again/ })).toBeDisabled();
      expect(await screen.findByLabelText(/Total for 2026/)).toBeInTheDocument();
      expect(callsTo(fetchMock, '/me/overview')).toHaveLength(2);
      expect(callsTo(fetchMock, '/me/transactions')).toHaveLength(1);
      expect(callsTo(fetchMock, '/me/card-summary')).toHaveLength(1);
    });

    it('reloads only the Recent transactions list on Try again (AC10)', async () => {
      let calls = 0;
      fetchMock.mockImplementation(
        respond({
          '/me/transactions': () => {
            calls += 1;
            return calls === 1 ? down() : json(transactions);
          },
        }),
      );
      render(<Dashboard />);
      const alert = await screen.findByRole('alert', {
        name: /recent transactions unavailable/i,
      });
      await screen.findByLabelText(/Total for 2026/);
      fireEvent.click(within(alert).getByRole('button', { name: 'Try again' }));
      expect(within(alert).getByRole('button', { name: /Trying again/ })).toBeDisabled();
      expect(await screen.findByText('Adobe Creative Cloud')).toBeInTheDocument();
      expect(callsTo(fetchMock, '/me/transactions')).toHaveLength(2);
      expect(callsTo(fetchMock, '/me/overview')).toHaveLength(1);
      expect(callsTo(fetchMock, '/me/card-summary')).toHaveLength(1);
    });

    it('still lists transactions when the overview fails (AC11)', async () => {
      fetchMock.mockImplementation(respond({ '/me/overview': down }));
      render(<Dashboard />);
      await screen.findByRole('alert', { name: /overview unavailable/i });
      expect(await screen.findByText('Adobe Creative Cloud')).toBeInTheDocument();
    });

    it('still shows the overview when the transactions fail (AC12)', async () => {
      fetchMock.mockImplementation(respond({ '/me/transactions': down }));
      render(<Dashboard />);
      await screen.findByRole('alert', { name: /recent transactions unavailable/i });
      expect(await screen.findByLabelText(/Total for 2026/)).toBeInTheDocument();
      expect(screen.getByRole('img', { name: /one bar for each month/i })).toBeInTheDocument();
    });

    it('placeholder controls show a coming soon toast and fetch nothing', async () => {
      render(<Dashboard />);
      await screen.findByText('Adobe Creative Cloud');
      const before = fetchMock.mock.calls.length;
      fireEvent.click(screen.getByRole('button', { name: /Year/ }));
      expect(screen.getByRole('status', { name: '' })).toHaveTextContent(/coming soon/i);
      fireEvent.click(screen.getByText('View all'));
      expect(screen.getByText('Full transaction list is coming soon')).toBeInTheDocument();
      expect(fetchMock.mock.calls.length).toBe(before);
    });
  });
});
