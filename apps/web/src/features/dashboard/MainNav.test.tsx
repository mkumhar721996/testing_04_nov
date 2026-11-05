import { fireEvent, render, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { MainNav } from './MainNav';

const placeholders = ['Loans', 'Deposits', 'Documents', 'Reports'];

describe('MainNav', () => {
  it.each(placeholders)('%s is disabled, labelled Coming soon and opens nothing', (label) => {
    render(<MainNav />);
    const item = screen.getByRole('button', { name: new RegExp(label) });
    expect(item).toHaveAttribute('aria-disabled', 'true');
    expect(within(item).getByText('Coming soon')).toBeInTheDocument();

    fireEvent.click(item);
    expect(window.location.pathname).toBe('/');
    expect(screen.getByRole('navigation', { name: 'Main' })).toBeInTheDocument();
  });
});
