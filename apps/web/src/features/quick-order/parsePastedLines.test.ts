import { parsePastedLines } from './parsePastedLines';

describe('parsePastedLines', () => {
  it('splits lines on tab, comma, semicolon or whitespace and drops blank lines', () => {
    expect(parsePastedLines('BRG-6204-2RS\t12\nFLT-HY-2210,4\r\n\nSEAL-45x62x8 6')).toEqual([
      { part: 'BRG-6204-2RS', qty: '12' },
      { part: 'FLT-HY-2210', qty: '4' },
      { part: 'SEAL-45x62x8', qty: '6' },
    ]);
  });
  it('leaves the quantity blank when a line has only a part number', () => {
    expect(parsePastedLines('CPL-QD-38;')).toEqual([{ part: 'CPL-QD-38', qty: '' }]);
  });
});
