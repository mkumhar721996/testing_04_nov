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
  afterEach(() => vi.unstubAllGlobals());

  it('renders the Dashboard landing screen (AC1)', async () => {
    render(<App />);
    expect(
      await screen.findByRole('heading', { level: 1, name: /welcome back/i }),
    ).toBeInTheDocument();
  });
});
