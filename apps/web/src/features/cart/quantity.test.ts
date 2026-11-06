import { parseQuantity } from './quantity';

describe('parseQuantity', () => {
  it.each(['0', 'abc', '', ' ', '1.5', '-3', '2x'])('rejects %j', (v) => {
    expect(parseQuantity(v)).toBeNull();
  });

  it('accepts a whole number of at least 1', () => {
    expect(parseQuantity('5')).toBe(5);
    expect(parseQuantity('10')).toBe(10);
  });
});
