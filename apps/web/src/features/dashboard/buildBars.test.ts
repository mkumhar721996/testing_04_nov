import { describe, expect, it } from 'vitest';
import { buildBars } from './buildBars';

const months = (nets: number[]) =>
  nets.map((net, i) => ({ month: i + 1, net: net.toFixed(2) }));

describe('buildBars', () => {
  it('returns one bar per month labelled Jan to Dec at the design x positions (AC3)', () => {
    const { bars } = buildBars(months(Array(12).fill(10)));
    expect(bars).toHaveLength(12);
    expect(bars.map((b) => b.label)).toEqual([
      'Jan',
      'Feb',
      'Mar',
      'Apr',
      'May',
      'Jun',
      'Jul',
      'Aug',
      'Sep',
      'Oct',
      'Nov',
      'Dec',
    ]);
    expect(bars[0].x).toBe(48);
    expect(bars[11].x).toBe(576);
  });

  it('scales to the largest month and draws empty months with no height', () => {
    const { bars } = buildBars(months([0, 50, 100, 0, 0, 0, 0, 0, 0, 0, 0, 0]));
    expect(bars[2].height).toBe(140);
    expect(bars[2].y).toBe(50);
    expect(bars[1].height).toBe(70);
    expect(bars[0].height).toBe(0);
  });

  it('draws a negative month below the zero line', () => {
    const { bars, ticks } = buildBars(months([100, -50, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]));
    expect(bars[0].y + bars[0].height).toBe(120);
    expect(bars[1].y).toBe(120);
    expect(bars[1].height).toBe(35);
    expect(ticks.map((t) => t.value)).toEqual([100, 0, -100]);
  });
});
