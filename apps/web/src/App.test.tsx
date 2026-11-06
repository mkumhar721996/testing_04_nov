import { render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import App from './App';

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
    render(<App />);
    expect(
      await screen.findByRole('heading', { level: 1, name: /welcome back/i }),
    ).toBeInTheDocument();
  });


  afterEach(() => {
    vi.unstubAllGlobals();
    window.history.pushState({}, '', '/');
  });

  it('renders the app shell with Items as the current section', () => {
    window.history.pushState({}, '', '/items');
    render(<App />);
    expect(screen.getByRole('link', { name: 'Items' })).toHaveAttribute('aria-current', 'page');
    for (const name of ['Dashboard', 'Activity', 'Settings'])
      expect(screen.getByRole('link', { name })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Menu' })).toHaveAttribute('aria-controls', 'shell-nav');
  });

  it('opens a defect at /items/:id', async () => {
    window.history.pushState({}, '', '/items/d-1');
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
