import { buildBars } from './buildBars';
import type { Overview } from './types';

const formatAxis = (value: number) =>
  new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 }).format(value);

export function OverviewChart({ overview }: { overview: Overview }) {
  const { bars, ticks } = buildBars(overview.months);
  return (
    <div className="chart-scroll">
      <svg
        className="chart"
        viewBox="0 0 640 220"
        role="img"
        aria-label={`Bar chart of net money movement per month for ${overview.year}, one bar for each month from January to December`}
      >
        {ticks.map((tick) => (
          <g key={tick.y}>
            <line className="axis" x1="40" y1={tick.y} x2="640" y2={tick.y} />
            <text className="lbl" x="34" y={tick.y + 4} textAnchor="end">
              {formatAxis(tick.value)}
            </text>
          </g>
        ))}
        {bars.map((bar) => (
          <g key={bar.label}>
            <rect className="bar" x={bar.x} y={bar.y} width="28" height={bar.height} />
            <text className="lbl" x={bar.labelX} y="210" textAnchor="middle">
              {bar.label}
            </text>
          </g>
        ))}
      </svg>
    </div>
  );
}
