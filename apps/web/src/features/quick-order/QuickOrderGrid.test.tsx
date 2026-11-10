import { fireEvent, render, screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { QuickOrderGrid } from './QuickOrderGrid';
import type { PartMatch } from './types';

const PARTS: PartMatch[] = [
  {
    part: 'BRG-6204-2RS',
    description: 'Deep groove ball bearing, sealed',
    stock: [
      { instance: 'SAP A (EU)', available: 340 },
      { instance: 'SAP B (US)', available: 120 },
    ],
  },
  { part: 'SEAL-45x62x8', description: 'Rotary shaft oil seal', stock: [{ instance: 'SAP A (EU)', available: 85 }] },
  { part: 'FLT-HY-2210', description: 'Hydraulic return filter', stock: [{ instance: 'SAP B (US)', available: 22 }] },
  { part: 'GSK-FL-DN50', description: 'Flange gasket, DN50', stock: [{ instance: 'SAP A (EU)', available: 10 }] },
];

function setup() {
  const lookup = vi.fn(async (parts: string[]) =>
    PARTS.filter((p) => parts.some((q) => q.toUpperCase() === p.part.toUpperCase())),
  );
  const addToCart = vi.fn(async () => ({ kind: 'ok' as const }));
  render(<QuickOrderGrid lookup={lookup} addToCart={addToCart} />);
  return { lookup, addToCart };
}

const type = (label: string, value: string) =>
  fireEvent.change(screen.getByLabelText(label), { target: { value } });
const fillRow = (n: number, part: string, qty: string) => {
  type(`Part number, row ${n}`, part);
  type(`Quantity, row ${n}`, qty);
};
const clickAdd = () => fireEvent.click(screen.getByRole('button', { name: 'Add to cart' }));
const cartTable = () => screen.findByRole('table', { name: 'Lines added to the unified cart' });
const noCartTable = () =>
  expect(screen.queryByRole('table', { name: 'Lines added to the unified cart' })).not.toBeInTheDocument();

describe('QuickOrderGrid', () => {
  it('AC1: typed rows appear as their own rows and a blank row is kept', () => {
    setup();
    fillRow(1, 'BRG-6204-2RS', '12');
    fillRow(2, 'SEAL-45x62x8', '6');
    expect(screen.getByLabelText('Part number, row 2')).toHaveValue('SEAL-45x62x8');
    expect(screen.getByLabelText('Quantity, row 2')).toHaveValue('6');
    expect(screen.getByLabelText('Part number, row 3')).toHaveValue('');
  });

  it('AC2: a multi-line paste fills one row per line', async () => {
    setup();
    fireEvent.paste(screen.getByLabelText('Part number, row 1'), {
      clipboardData: { getData: () => 'BRG-6204-2RS\t12\nFLT-HY-2210\t4\nSEAL-45x62x8\t6' },
    });
    expect(screen.getByLabelText('Part number, row 3')).toHaveValue('SEAL-45x62x8');
    expect(screen.getByLabelText('Quantity, row 3')).toHaveValue('6');
    expect(screen.getByText('3 lines pasted into rows 1 to 3.')).toBeInTheDocument();
    expect(await screen.findByText('Deep groove ball bearing, sealed')).toBeInTheDocument();
  });

  it('AC3: two valid rows reach the cart in one call', async () => {
    const { addToCart } = setup();
    fillRow(1, 'SEAL-45x62x8', '6');
    fillRow(2, 'FLT-HY-2210', '4');
    clickAdd();
    const cart = await cartTable();
    expect(addToCart).toHaveBeenCalledTimes(1);
    expect(addToCart).toHaveBeenCalledWith([
      expect.objectContaining({ part: 'SEAL-45x62x8', instance: 'SAP A (EU)', quantity: 6 }),
      expect.objectContaining({ part: 'FLT-HY-2210', instance: 'SAP B (US)', quantity: 4 }),
    ]);
    expect(within(cart).getAllByRole('row')).toHaveLength(3);
  });

  it('AC4 and AC5: a quantity over the stock shown is not added and the stock is shown', async () => {
    const { addToCart } = setup();
    fillRow(1, 'GSK-FL-DN50', '11');
    clickAdd();
    expect(await screen.findByText(/Stock shown is 10\. Enter 10 or fewer\./)).toBeInTheDocument();
    expect(screen.getByLabelText('Quantity, row 1')).toHaveAttribute('aria-invalid', 'true');
    expect(addToCart).not.toHaveBeenCalled();
    noCartTable();
  });

  it('AC6: a quantity equal to the stock shown is added', async () => {
    setup();
    fillRow(1, 'GSK-FL-DN50', '10');
    clickAdd();
    const cart = await cartTable();
    expect(within(cart).getByRole('cell', { name: '10' })).toBeInTheDocument();
  });

  it('AC7: a part on two SAP instances makes two cart lines', async () => {
    setup();
    fillRow(1, 'BRG-6204-2RS', '12');
    clickAdd();
    const cart = await cartTable();
    expect(within(cart).getByText('SAP A (EU)')).toBeInTheDocument();
    expect(within(cart).getByText('SAP B (US)')).toBeInTheDocument();
  });

  it('AC8: a part number matching nothing is flagged and keeps its text', async () => {
    setup();
    fillRow(1, 'BRG-6204-2R', '4');
    clickAdd();
    expect(
      await screen.findByText(/No part matches “BRG-6204-2R”\. Check the part number and correct it\./),
    ).toBeInTheDocument();
    expect(screen.getByLabelText('Part number, row 1')).toHaveAttribute('aria-invalid', 'true');
    expect(screen.getByLabelText('Part number, row 1')).toHaveValue('BRG-6204-2R');
  });

  it('AC9: the matching row is added while the unknown row stays flagged', async () => {
    const { addToCart } = setup();
    fillRow(1, 'XYZ-0000', '3');
    fillRow(2, 'SEAL-45x62x8', '6');
    clickAdd();
    const cart = await cartTable();
    expect(within(cart).getByText('SEAL-45x62x8')).toBeInTheDocument();
    expect(within(cart).queryByText('XYZ-0000')).not.toBeInTheDocument();
    expect(addToCart).toHaveBeenCalledWith([expect.objectContaining({ part: 'SEAL-45x62x8' })]);
    expect(screen.getByRole('alert')).toHaveTextContent('1 of 2 rows added to your cart.');
  });

  it('AC10 and AC11: a zero or non-numeric quantity shows an error and is not added', async () => {
    const { addToCart } = setup();
    fillRow(1, 'BRG-6204-2RS', '0');
    fillRow(2, 'SEAL-45x62x8', 'six');
    clickAdd();
    const msgs = await screen.findAllByText(/Enter a quantity of 1 or more, using digits only\./);
    expect(msgs).toHaveLength(2);
    expect(screen.getByLabelText('Quantity, row 2')).toHaveAttribute('aria-invalid', 'true');
    expect(addToCart).not.toHaveBeenCalled();
    noCartTable();
  });

  it('AC11: only the valid row is sent next to a bad quantity', async () => {
    const { addToCart } = setup();
    fillRow(1, 'BRG-6204-2RS', '0');
    fillRow(2, 'FLT-HY-2210', '4');
    clickAdd();
    await cartTable();
    expect(addToCart).toHaveBeenCalledWith([expect.objectContaining({ part: 'FLT-HY-2210' })]);
  });

  it('shows a disabled pending button while adding', async () => {
    const { addToCart } = setup();
    addToCart.mockImplementation(() => new Promise(() => {}));
    fillRow(1, 'FLT-HY-2210', '4');
    clickAdd();
    expect(await screen.findByRole('button', { name: 'Adding to cart…' })).toBeDisabled();
  });

  it('a failed add shows an alert and marks no row as added', async () => {
    const { addToCart } = setup();
    addToCart.mockResolvedValue({ kind: 'error' } as never);
    fillRow(1, 'FLT-HY-2210', '4');
    clickAdd();
    expect(await screen.findByRole('alert')).toHaveTextContent('We couldn’t add your rows.');
    expect(screen.getByLabelText('Part number, row 1')).toBeEnabled();
    noCartTable();
  });

  it('does not send an already added row again', async () => {
    const { addToCart } = setup();
    fillRow(1, 'FLT-HY-2210', '4');
    clickAdd();
    await cartTable();
    expect(screen.getByLabelText('Part number, row 1')).toBeDisabled();
    fillRow(2, 'SEAL-45x62x8', '6');
    clickAdd();
    await screen.findByText('SEAL-45x62x8', { selector: '.order-id' });
    expect(addToCart).toHaveBeenLastCalledWith([expect.objectContaining({ part: 'SEAL-45x62x8' })]);
  });

  it('says there is nothing to add when the grid is empty', async () => {
    const { addToCart } = setup();
    clickAdd();
    expect(await screen.findByText(/Nothing to add\./)).toBeInTheDocument();
    expect(addToCart).not.toHaveBeenCalled();
  });

  it('clears the grid without touching the cart', () => {
    const { addToCart } = setup();
    fillRow(1, 'FLT-HY-2210', '4');
    fireEvent.click(screen.getByRole('button', { name: 'Clear grid' }));
    expect(screen.getByLabelText('Part number, row 1')).toHaveValue('');
    expect(screen.getByText('Grid cleared. Your cart is unchanged.')).toBeInTheDocument();
    expect(addToCart).not.toHaveBeenCalled();
  });

  it('shows the description and stock per instance after a part number is entered', async () => {
    setup();
    fillRow(1, 'BRG-6204-2RS', '1');
    fireEvent.blur(screen.getByLabelText('Part number, row 1'));
    expect(await screen.findByText('SAP A (EU): 340 in stock')).toBeInTheDocument();
    expect(screen.getByText('SAP B (US): 120 in stock')).toBeInTheDocument();
  });
});
