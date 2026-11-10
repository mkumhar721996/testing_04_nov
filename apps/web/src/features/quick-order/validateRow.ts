import type { GridRow, PartMatch, RowResult } from './types';

// null = an empty row, ignored. A row is added only if its quantity fits the stock shown for
// every SAP instance that holds the part; it then makes one cart line per instance.
export function validateRow(row: GridRow, match: PartMatch | undefined): RowResult | null {
  const part = row.part.trim();
  const qtyText = row.qty.trim();
  if (!part && !qtyText) return null;
  if (!part) return { ok: false, field: 'part', message: 'Enter a part number for this row.' };
  if (!match) {
    return {
      ok: false,
      field: 'part',
      message: `No part matches “${part}”. Check the part number and correct it.`,
    };
  }
  if (!/^\d+$/.test(qtyText) || Number(qtyText) < 1) {
    return {
      ok: false,
      field: 'qty',
      message: 'Enter a quantity of 1 or more, using digits only. This row was not added.',
    };
  }
  const quantity = Number(qtyText);
  const short = match.stock.filter((s) => quantity > s.available);
  if (short.length) {
    const named = short.length > 1 || match.stock.length > 1;
    const shown = short.map((s) => (named ? `${s.instance}: ${s.available}` : `${s.available}`));
    const most = Math.min(...short.map((s) => s.available));
    return {
      ok: false,
      field: 'qty',
      message: `Stock shown is ${shown.join(', ')}. Enter ${most} or fewer. This row was not added.`,
    };
  }
  return {
    ok: true,
    lines: match.stock.map((s) => ({
      part: match.part,
      description: match.description,
      instance: s.instance,
      quantity,
    })),
  };
}
