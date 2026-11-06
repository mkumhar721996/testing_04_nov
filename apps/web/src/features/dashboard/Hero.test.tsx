import { fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { Hero } from './Hero';

const card = {
  status: 'ready' as const,
  data: { last4: '9286', expiry: '08/32', balance: { amount: '12680.42', currency: 'USD' } },
  reload: vi.fn(),
};

describe('Hero', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('greets the user by name (AC2)', () => {
    render(<Hero name="Ada" card={card} />);
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Welcome back, Ada!');
  });

  it('omits the stray comma when the profile name is missing', () => {
    render(<Hero name="" card={card} />);
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(/^Welcome back!$/);
  });

  it.each(['Deposit', 'Withdraw'])(
    '%s is disabled, labelled Coming soon and starts nothing (AC8, 12, 13)',
    (label) => {
      const fetchSpy = vi.fn();
      vi.stubGlobal('fetch', fetchSpy);
      render(<Hero name="Ada" card={card} />);
      const button = screen.getByRole('button', { name: new RegExp(`^${label}`) });
      expect(button).toBeDisabled();
      expect(within(button).getByText('Coming soon')).toBeInTheDocument();

      fireEvent.click(button);
      expect(fetchSpy).not.toHaveBeenCalled();
      expect(screen.queryByRole('dialog')).toBeNull();
    },
  );
});
