import type { PartMatch } from './types';
import { validateRow } from './validateRow';

const gasket: PartMatch = {
  part: 'GSK-FL-DN50',
  description: 'Flange gasket, DN50',
  stock: [{ instance: 'SAP A (EU)', available: 10 }],
};
const bearing: PartMatch = {
  part: 'BRG-6204-2RS',
  description: 'Deep groove ball bearing, sealed',
  stock: [
    { instance: 'SAP A (EU)', available: 340 },
    { instance: 'SAP B (US)', available: 5 },
  ],
};
const row = (part: string, qty: string) => ({ part, qty, added: false });

describe('validateRow', () => {
  it('ignores an empty row', () => {
    expect(validateRow(row('', ''), undefined)).toBeNull();
  });
  it('flags a row with no part number', () => {
    expect(validateRow(row('', '3'), undefined)).toMatchObject({ ok: false, field: 'part' });
  });
  it('flags a part number that matches no part', () => {
    const r = validateRow(row('XYZ-0000', '3'), undefined);
    expect(r).toMatchObject({ ok: false, field: 'part' });
    expect(r && !r.ok && r.message).toContain('No part matches “XYZ-0000”. Check the part number and correct it.');
  });
  it('rejects a quantity above the stock shown and states the stock', () => {
    const r = validateRow(row('GSK-FL-DN50', '11'), gasket);
    expect(r).toMatchObject({ ok: false, field: 'qty' });
    expect(r && !r.ok && r.message).toContain('Stock shown is 10. Enter 10 or fewer.');
  });
  it('accepts a quantity equal to the stock shown', () => {
    expect(validateRow(row('GSK-FL-DN50', '10'), gasket)).toEqual({
      ok: true,
      lines: [{ part: 'GSK-FL-DN50', description: 'Flange gasket, DN50', instance: 'SAP A (EU)', quantity: 10 }],
    });
  });
  it('makes one line per SAP instance', () => {
    const r = validateRow(row('BRG-6204-2RS', '4'), bearing);
    expect(r && r.ok && r.lines.map((l) => l.instance)).toEqual(['SAP A (EU)', 'SAP B (US)']);
  });
  it('rejects the row when the quantity does not fit every instance', () => {
    expect(validateRow(row('BRG-6204-2RS', '12'), bearing)).toMatchObject({ ok: false, field: 'qty' });
  });
  it.each(['0', 'six', '', '1.5', '-2'])('rejects quantity %j', (qty) => {
    const r = validateRow(row('GSK-FL-DN50', qty), gasket);
    expect(r).toMatchObject({ ok: false, field: 'qty' });
    expect(r && !r.ok && r.message).toContain('Enter a quantity of 1 or more, using digits only.');
  });
});
