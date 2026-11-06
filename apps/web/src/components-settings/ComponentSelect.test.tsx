import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ComponentItem, listComponents } from '../api/client';
import { ComponentSelect } from './ComponentSelect';

vi.mock('../api/client', () => ({ listComponents: vi.fn() }));

const billing: ComponentItem = { id: 'c1', name: 'Billing', status: 'active' };
const payments: ComponentItem = { id: 'c2', name: 'Payments', status: 'active' };

beforeEach(() => {
  vi.mocked(listComponents).mockReset();
});

describe('ComponentSelect', () => {
  it('is a dropdown with no free-text input (AC2)', async () => {
    vi.mocked(listComponents).mockResolvedValue([billing]);
    const onChange = vi.fn();
    render(<ComponentSelect value="" onChange={onChange} />);
    const select = await screen.findByRole('combobox', { name: 'Component' });
    expect(select.tagName).toBe('SELECT');
    expect(screen.queryByRole('textbox')).toBeNull();
    fireEvent.change(select, { target: { value: billing.id } });
    expect(onChange).toHaveBeenCalledWith(billing.id);
  });

  it('lists an added component as a choice (AC3)', async () => {
    vi.mocked(listComponents).mockResolvedValue([billing]);
    render(<ComponentSelect value="" onChange={() => {}} />);
    expect(await screen.findByRole('option', { name: 'Billing' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'Choose a component' })).toBeInTheDocument();
  });

  it('lists the new name and not the old one after a rename (AC4)', async () => {
    vi.mocked(listComponents).mockResolvedValue([{ ...billing, name: 'Payments' }]);
    render(<ComponentSelect value="" onChange={() => {}} />);
    expect(await screen.findByRole('option', { name: 'Payments' })).toBeInTheDocument();
    expect(screen.queryByRole('option', { name: 'Billing' })).toBeNull();
  });

  it('asks only for active components, so a retired one is not listed (AC6)', async () => {
    vi.mocked(listComponents).mockResolvedValue([billing, payments]);
    render(<ComponentSelect value="" onChange={() => {}} />);
    await screen.findByRole('option', { name: 'Billing' });
    expect(screen.queryByRole('option', { name: 'Legacy' })).toBeNull();
    expect(listComponents).toHaveBeenCalledWith('active');
    expect(screen.getByText('Retired components such as Legacy are not listed.')).toBeInTheDocument();
  });

  it('shows a skeleton while loading, a hint when empty, and an alert on failure', async () => {
    vi.mocked(listComponents).mockResolvedValueOnce([]);
    const { unmount } = render(<ComponentSelect value="" onChange={() => {}} />);
    expect(screen.getByRole('status', { name: 'Loading components' })).toBeInTheDocument();
    expect(await screen.findByText('No components yet. Ask a Lead to add one.')).toBeInTheDocument();
    unmount();

    vi.mocked(listComponents).mockRejectedValueOnce(new Error('down'));
    render(<ComponentSelect value="" onChange={() => {}} />);
    expect(await screen.findByRole('alert')).toHaveTextContent('could not be loaded');
  });
});
