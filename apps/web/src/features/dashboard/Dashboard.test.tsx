import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { Dashboard } from './Dashboard';

const card = { last4: '9286', expiry: '08/32', balance: { amount: '12680.42', currency: 'USD' } };
const json = (body: unknown) => Promise.resolve(new Response(JSON.stringify(body)));
const callsTo = (fetchMock: ReturnType<typeof vi.fn>, suffix: string) =>
  fetchMock.mock.calls.filter((c) => String(c[0]).endsWith(suffix));

describe('Dashboard', () => {
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    fetchMock = vi.fn((url: string) =>
      String(url).endsWith('/me/card-summary') ? json(card) : json({ name: 'Ada Lovelace' }),
    );
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
    fetchMock.mockImplementation((url: string) => {
      if (!String(url).endsWith('/me/card-summary')) return json({ name: 'Ada Lovelace' });
      cardCalls += 1;
      return cardCalls === 1 ? Promise.reject(new Error('down')) : json(card);
    });
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
    fetchMock.mockImplementation((url: string) =>
      String(url).endsWith('/me/card-summary')
        ? Promise.resolve(new Response('', { status: 404 }))
        : json({ name: 'Ada' }),
    );
    render(<Dashboard />);
    const alert = await screen.findByRole('alert');
    expect(within(alert).getByRole('button', { name: 'Try again' })).toBeInTheDocument();
    await waitFor(() => expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Ada'));
  });
});
