import { render, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { ChildOrderCard } from './ChildOrderCard';
import { childA, failedB } from './fixtures';

describe('ChildOrderCard', () => {
  it('marks a failed child with is-failed and lists all its lines', () => {
    render(<ChildOrderCard child={failedB} />);
    const card = screen.getByRole('region', { name: 'Child order ORD-10427-B' });
    expect(card).toHaveClass('is-failed');
    const table = within(card).getByRole('table', { name: 'Lines of child order ORD-10427-B' });
    expect(within(table).getAllByRole('row')).toHaveLength(4);
  });

  it('does not mark a placed child as failed', () => {
    render(<ChildOrderCard child={childA} />);
    expect(screen.getByRole('region', { name: 'Child order ORD-10427-A' })).not.toHaveClass('is-failed');
  });
});
