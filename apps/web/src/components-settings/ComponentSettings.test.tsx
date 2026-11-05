import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  ApiError,
  ComponentItem,
  addComponent,
  getMe,
  listComponents,
  renameComponent,
  retireComponent,
} from '../api/client';
import { ComponentSettings } from './ComponentSettings';

vi.mock('../api/client', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../api/client')>()),
  getMe: vi.fn(),
  listComponents: vi.fn(),
  addComponent: vi.fn(),
  renameComponent: vi.fn(),
  retireComponent: vi.fn(),
}));

const billing: ComponentItem = { id: 'c1', name: 'Billing', status: 'active' };
const payments: ComponentItem = { id: 'c2', name: 'Payments', status: 'active' };
const legacy: ComponentItem = { id: 'c3', name: 'Legacy', status: 'retired' };

function mockMe(isLead: boolean) {
  vi.mocked(getMe).mockResolvedValue({ isLead });
}
function mockList(...lists: ComponentItem[][]) {
  const fn = vi.mocked(listComponents);
  lists.forEach((list) => fn.mockResolvedValueOnce(list));
  fn.mockResolvedValue(lists[lists.length - 1]);
}

beforeEach(() => {
  vi.resetAllMocks();
});

describe('ComponentSettings: view', () => {
  it('offers no change actions to a non-Lead (AC1)', async () => {
    mockMe(false);
    mockList([billing, payments]);
    render(<ComponentSettings />);
    await screen.findByText('Billing');
    expect(screen.queryByRole('button', { name: /^Add component$/ })).toBeNull();
    expect(screen.queryByRole('button', { name: /^Add$/ })).toBeNull();
    expect(screen.queryByRole('textbox')).toBeNull();
    expect(screen.queryByRole('button', { name: /^Rename / })).toBeNull();
    expect(screen.queryByRole('button', { name: /^Retire / })).toBeNull();
    expect(screen.getByText(/Only Leads can change the component list/)).toBeInTheDocument();
  });

  it.each([true, false])('shows a retired component with a Retired label and no actions (AC10, Lead=%s)', async (isLead) => {
    mockMe(isLead);
    mockList([billing, legacy]);
    render(<ComponentSettings />);
    const legacyRow = (await screen.findByText('Legacy')).closest('li')!;
    expect(within(legacyRow).getByText('Retired')).toBeInTheDocument();
    expect(within(legacyRow).queryByRole('button')).toBeNull();
  });

  it('shows a loading state, then an empty state', async () => {
    mockMe(true);
    mockList([]);
    render(<ComponentSettings />);
    expect(screen.getByRole('status', { name: 'Loading components' })).toBeInTheDocument();
    expect(await screen.findByText('No components yet')).toBeInTheDocument();
    expect(screen.getAllByRole('button', { name: 'Add component' })).toHaveLength(1);
  });

  it('shows an alert when the list cannot be loaded', async () => {
    mockMe(true);
    vi.mocked(listComponents).mockRejectedValue(new Error('down'));
    render(<ComponentSettings />);
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Components could not be loaded. Reload the page to try again.',
    );
  });
});

describe('ComponentSettings: add', () => {
  it('adds a component, refetches and confirms (AC3)', async () => {
    mockMe(true);
    mockList([payments], [payments, billing]);
    vi.mocked(addComponent).mockResolvedValue(billing);
    render(<ComponentSettings />);
    await screen.findByText('Payments');
    fireEvent.change(screen.getByLabelText('New component name'), { target: { value: 'Billing' } });
    fireEvent.click(screen.getByRole('button', { name: 'Add' }));
    expect(await screen.findByText('Billing')).toBeInTheDocument();
    expect(addComponent).toHaveBeenCalledWith('Billing');
    expect(screen.getByText('Added "Billing". Reporters can now choose it.')).toBeInTheDocument();
  });

  it('does not call the API for an empty name', async () => {
    mockMe(true);
    mockList([payments]);
    render(<ComponentSettings />);
    await screen.findByText('Payments');
    fireEvent.click(screen.getByRole('button', { name: 'Add' }));
    expect(await screen.findByText('Enter a component name.')).toBeInTheDocument();
    expect(addComponent).not.toHaveBeenCalled();
  });
});

describe('ComponentSettings: rename', () => {
  async function openRename() {
    mockMe(true);
    render(<ComponentSettings />);
    await screen.findByText('Billing');
    fireEvent.click(screen.getByRole('button', { name: 'Rename Billing' }));
    fireEvent.change(screen.getByLabelText('Rename Billing to'), { target: { value: 'Payments' } });
  }

  it('shows the new name and not the old one (AC4, AC9)', async () => {
    mockList([billing], [{ ...billing, name: 'Payments' }]);
    vi.mocked(renameComponent).mockResolvedValue({ ...billing, name: 'Payments' });
    await openRename();
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));
    expect(await screen.findByText('Payments')).toBeInTheDocument();
    expect(screen.queryByText('Billing')).toBeNull();
    expect(renameComponent).toHaveBeenCalledWith('c1', 'Payments');
  });

  it('shows a visible error and keeps the old name when the name is taken (AC7)', async () => {
    mockList([billing, payments]);
    const message =
      'A component named "Payments" already exists. The name was not changed. Choose a different name.';
    vi.mocked(renameComponent).mockRejectedValue(new ApiError(409, message));
    await openRename();
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('already exists');
    const input = screen.getByLabelText('Rename Billing to');
    expect(input).toHaveAttribute('aria-invalid', 'true');
    expect(screen.getByText('"Payments" is already in use.')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(screen.getByText('Billing')).toBeInTheDocument();
  });
});

describe('ComponentSettings: retire', () => {
  it('retires only after the Lead confirms, and returns focus on cancel', async () => {
    mockMe(true);
    mockList([billing, legacy], [billing, { ...legacy, status: 'retired' }]);
    vi.mocked(retireComponent).mockResolvedValue({ ...billing, status: 'retired' });
    render(<ComponentSettings />);
    await screen.findByText('Billing');

    const trigger = screen.getByRole('button', { name: 'Retire Billing' });
    fireEvent.click(trigger);
    const dialog = screen.getByRole('dialog', { name: 'Retire Billing?' });
    expect(dialog).toHaveAttribute('aria-modal', 'true');
    expect(within(dialog).getByRole('button', { name: 'Cancel' })).toHaveFocus();
    expect(retireComponent).not.toHaveBeenCalled();

    fireEvent.click(within(dialog).getByRole('button', { name: 'Cancel' }));
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(retireComponent).not.toHaveBeenCalled();
    expect(trigger).toHaveFocus();

    fireEvent.click(trigger);
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(retireComponent).not.toHaveBeenCalled();

    fireEvent.click(trigger);
    fireEvent.click(screen.getByRole('button', { name: 'Retire component' }));
    await waitFor(() => expect(retireComponent).toHaveBeenCalledWith('c1'));
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
  });

  it('cancels on a backdrop click and traps focus in the dialog', async () => {
    mockMe(true);
    mockList([billing, payments]);
    const { container } = render(<ComponentSettings />);
    await screen.findByText('Billing');
    fireEvent.click(screen.getByRole('button', { name: 'Retire Billing' }));
    const dialog = screen.getByRole('dialog');
    const confirm = within(dialog).getByRole('button', { name: 'Retire component' });
    confirm.focus();
    fireEvent.keyDown(dialog, { key: 'Tab' });
    expect(within(dialog).getByRole('button', { name: 'Cancel' })).toHaveFocus();
    expect(container.querySelectorAll('.btn-danger')).toHaveLength(1);
    fireEvent.click(container.querySelector('.backdrop')!);
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('shows the server message and keeps the component active when it is the last one (AC8)', async () => {
    mockMe(true);
    mockList([billing]);
    const message =
      "Billing can't be retired because it is the only active component. Add another component first.";
    vi.mocked(retireComponent).mockRejectedValue(new ApiError(409, message));
    render(<ComponentSettings />);
    await screen.findByText('Billing');
    fireEvent.click(screen.getByRole('button', { name: 'Retire Billing' }));
    fireEvent.click(screen.getByRole('button', { name: 'Retire component' }));
    expect(await screen.findByRole('alert')).toHaveTextContent(message);
    expect(screen.queryByRole('dialog')).toBeNull();
    const row = screen.getByText('Billing').closest('li')!;
    expect(within(row).queryByText('Retired')).toBeNull();
    expect(within(row).getByRole('button', { name: 'Retire Billing' })).toBeInTheDocument();
  });

  it('keeps a retired component listed with its name (AC5)', async () => {
    mockMe(true);
    mockList([payments, legacy]);
    render(<ComponentSettings />);
    expect(await screen.findByText('Legacy')).toBeInTheDocument();
  });
});
