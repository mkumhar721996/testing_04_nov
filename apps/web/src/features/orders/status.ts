import type { ChildOrder } from '../../api/orders';

export type Tone = 'success' | 'warning' | 'danger' | 'neutral';

export interface StatusBadge {
  label: string;
  tone: Tone;
}

const TONES: Record<string, Tone> = {
  Placed: 'success',
  Delivered: 'success',
  Shipped: 'success',
  Closed: 'neutral',
  Processing: 'warning',
  Retrying: 'warning',
  Failed: 'danger',
};

export const statusTone = (status: string): Tone => TONES[status] ?? 'neutral';

export const toneClass = (tone: Tone) => (tone === 'neutral' ? 'badge' : `badge badge-${tone}`);

export function rollupStatus(children: ChildOrder[]): StatusBadge {
  if (children.some((c) => c.status === 'Retrying')) return { label: 'Retrying', tone: 'warning' };
  const placed = children.filter((c) => c.status === 'Placed').length;
  if (placed === children.length && placed > 0) return { label: 'All placed', tone: 'success' };
  if (placed === 0) return { label: 'Failed', tone: 'danger' };
  return { label: 'Partially placed', tone: 'warning' };
}
