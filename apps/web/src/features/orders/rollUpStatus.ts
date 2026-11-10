import type { ChildOrder } from '../../api/orders';

export type RolledUp = 'All placed' | 'Partially placed' | 'Failed';

export function rollUpStatus(children: ChildOrder[]): RolledUp {
  const failed = children.filter((c) => c.status === 'failed').length;
  if (failed === 0) return 'All placed';
  return failed === children.length ? 'Failed' : 'Partially placed';
}

export const ROLL_UP_BADGE: Record<RolledUp, string> = {
  'All placed': 'badge-success',
  'Partially placed': 'badge-warning',
  Failed: 'badge-danger',
};
