import { act, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import App from './App';

const sessions = {
  buyer: { token: 'fake-token', name: 'Sam Buyer', title: 'Buyer', role: 'buyer', expiresAt: null },
  admin: { token: 'fake-token', name: 'Ada Admin', title: 'Admin', role: 'admin', expiresAt: null },
  csr: { token: 'fake-token', name: 'Cy CSR', title: 'CSR', role: 'csr', expiresAt: null },
};

const stubLogin = (role: keyof typeof sessions) =>
  vi.stubGlobal(
    'fetch',
    vi.fn(() => Promise.resolve(new Response(JSON.stringify(sessions[role]), { status: 200 }))),
  );

async function signInAs(role: keyof typeof sessions) {
  stubLogin(role);
  render(<App />);
  fireEvent.change(screen.getByLabelText('Email'), { target: { value: `${role}@poc.example` } });
  fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'test-password' } });
  fireEvent.click(screen.getByRole('button', { name: 'Sign in' }));
  return screen.findByRole('navigation', { name: 'Main' });
}

const navLabels = () =>
  within(screen.getByRole('navigation', { name: 'Main' }))
    .getAllByRole('link')
    .map((l) => l.textContent);

describe('App', () => {
  beforeEach(() => {
    vi.stubGlobal(
      'fetch',
      vi.fn((url: string) =>
        Promise.resolve(
          new Response(
            JSON.stringify(
              String(url).endsWith('/me/card-summary')
                ? { last4: '9286', expiry: '08/32', balance: { amount: '1.00', currency: 'USD' } }
                : { name: 'Ada' },
            ),
          ),
        ),
      ),
    );
  });

  it('renders the Dashboard landing screen (AC1)', async () => {
    window.history.pushState({}, '', '/dashboard');
    sessionStorage.setItem('session', JSON.stringify(sessions.buyer));
    render(<App />);
    expect(
      await screen.findByRole('heading', { level: 1, name: /welcome back/i }),
    ).toBeInTheDocument();
  });


  afterEach(() => {
    vi.unstubAllGlobals();
    vi.useRealTimers();
    sessionStorage.clear();
    window.history.pushState({}, '', '/');
  });

  it('shows the sign-in screen when signed out', () => {
    render(<App />);
    expect(screen.getByRole('heading', { name: 'Sign in' })).toBeInTheDocument();
    expect(screen.queryByRole('navigation', { name: 'Main' })).not.toBeInTheDocument();
  });

  it('shows the app shell after a valid sign in', async () => {
    expect(await signInAs('buyer')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Sign in' })).not.toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Search' })).toHaveAttribute('aria-current', 'page');
    expect(screen.getByRole('button', { name: 'Menu' })).toHaveAttribute('aria-controls', 'shell-nav');
    expect(screen.getByText('Signed in as Sam Buyer, Buyer.')).toBeInTheDocument();
  });

  it.each(['buyer', 'admin'] as const)('offers %s search, cart and orders', async (role) => {
    await signInAs(role);
    expect(navLabels()).toEqual(['Search', 'Cart', 'Orders']);
  });

  it('offers a CSR search and orders, with no cart', async () => {
    await signInAs('csr');
    expect(navLabels()).toEqual(['Search', 'Orders']);
    expect(screen.queryByRole('link', { name: 'Cart' })).not.toBeInTheDocument();
  });

  it('lists what each role can do on the landing page', async () => {
    await signInAs('admin');
    expect(screen.getByText('What you can do as an Admin')).toBeInTheDocument();
    expect(screen.getByText('Abandon a failed child order')).toBeInTheDocument();
  });

  it('does not offer a CSR cart or order placing', async () => {
    await signInAs('csr');
    expect(screen.getByText('What you can do as a CSR')).toBeInTheDocument();
    expect(screen.queryByText('Keep one cart and place an order')).not.toBeInTheDocument();
  });

  it('keeps the session after a reload', () => {
    sessionStorage.setItem('session', JSON.stringify(sessions.csr));
    render(<App />);
    expect(navLabels()).toEqual(['Search', 'Orders']);
  });

  it('switches to a placeholder for sections other stories build', async () => {
    await signInAs('buyer');
    fireEvent.click(screen.getByRole('link', { name: 'Cart' }));
    expect(screen.getByText('Cart is not available yet')).toBeInTheDocument();
  });

  it('signs out to the sign-in screen without the expired message', () => {
    sessionStorage.setItem('session', JSON.stringify(sessions.buyer));
    render(<App />);
    fireEvent.click(screen.getByRole('button', { name: 'Sign out' }));
    expect(screen.getByRole('heading', { name: 'Sign in' })).toBeInTheDocument();
    expect(screen.getByText('You signed out.')).toBeInTheDocument();
    expect(screen.queryByText(/session expired/)).not.toBeInTheDocument();
    expect(screen.queryByRole('navigation', { name: 'Main' })).not.toBeInTheDocument();
    expect(sessionStorage.getItem('session')).toBeNull();
  });

  it('shows the sign-in screen with a message when the session timer runs out', () => {
    vi.useFakeTimers();
    sessionStorage.setItem('session', JSON.stringify({ ...sessions.buyer, expiresAt: Date.now() + 1000 }));
    render(<App />);
    act(() => {
      vi.advanceTimersByTime(1000);
    });
    expect(screen.getByRole('heading', { name: 'Sign in' })).toBeInTheDocument();
    expect(screen.queryByRole('navigation', { name: 'Main' })).not.toBeInTheDocument();
    expect(screen.getByRole('alert')).toHaveTextContent('Your session expired. Sign in again to continue.');
  });

  it('shows the sign-in screen with a message when the API answers 401', async () => {
    window.history.pushState({}, '', '/items/d-1');
    sessionStorage.setItem('session', JSON.stringify(sessions.buyer));
    vi.stubGlobal('fetch', vi.fn(() => Promise.resolve(new Response('{}', { status: 401 }))));
    render(<App />);
    expect(await screen.findByRole('heading', { name: 'Sign in' })).toBeInTheDocument();
    expect(screen.getByRole('alert')).toHaveTextContent('Your session expired. Sign in again to continue.');
  });

  it('opens a defect at /items/:id', async () => {
    window.history.pushState({}, '', '/items/d-1');
    sessionStorage.setItem('session', JSON.stringify(sessions.buyer));
    vi.stubGlobal(
      'fetch',
      vi.fn(() =>
        Promise.resolve(
          new Response(
            JSON.stringify({
              id: 'd-1',
              key: 'DEF-14',
              title: 'Login button unresponsive',
              status: 'Triaged',
              rowVersion: 1,
              ownerId: null,
              ownerName: null,
              comments: [],
              availableMoves: [],
            }),
          ),
        ),
      ),
    );
    render(<App />);
    expect(await screen.findByRole('heading', { name: 'Login button unresponsive' })).toBeInTheDocument();
  });
});
