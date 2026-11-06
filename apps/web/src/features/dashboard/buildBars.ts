import type { OverviewMonth } from './types';

export type Bar = { label: string; x: number; labelX: number; y: number; height: number };
export type Tick = { y: number; value: number };

const LABELS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const BAR_WIDTH = 28;
// Plot geometry in the chart's 640 x 220 viewBox: top, middle and bottom axis lines.
const TOP = 50;
const MID = 120;
const BOTTOM = 190;

/**
 * Bars scaled to the largest absolute month. All months at or above zero sit on the bottom axis;
 * as soon as one is negative the zero line moves to the middle so it can hang below it.
 */
export function buildBars(months: OverviewMonth[]): { bars: Bar[]; ticks: Tick[] } {
  const nets = months.map((m) => Number(m.net));
  const max = Math.max(...nets.map(Math.abs), 0);
  const hasNegative = nets.some((n) => n < 0);
  const zeroY = hasNegative ? MID : BOTTOM;
  const span = zeroY - TOP;
  const bars = nets.map((net, i) => {
    const height = max === 0 ? 0 : (Math.abs(net) / max) * span;
    const x = 48 + 48 * i;
    return {
      label: LABELS[i],
      x,
      labelX: x + BAR_WIDTH / 2,
      y: net < 0 ? zeroY : zeroY - height,
      height,
    };
  });
  const ticks = hasNegative
    ? [
        { y: TOP, value: max },
        { y: MID, value: 0 },
        { y: BOTTOM, value: -max },
      ]
    : [
        { y: TOP, value: max },
        { y: MID, value: max / 2 },
        { y: BOTTOM, value: 0 },
      ];
  return { bars, ticks };
}
