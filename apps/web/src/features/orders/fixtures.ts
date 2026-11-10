import type { ChildOrder, Order } from '../../api/orders';

export const childA: ChildOrder = {
  id: 'ORD-10427-A',
  sapInstance: 'SAP A (EU)',
  status: 'placed',
  lines: [{ partNumber: 'BRK-PD-12', description: 'Brake pad set', quantity: 2 }],
};

export const childB: ChildOrder = {
  id: 'ORD-10427-B',
  sapInstance: 'SAP B (US)',
  status: 'placed',
  lines: [
    { partNumber: 'CPL-QD-38', description: 'Quick coupling', quantity: 4 },
    { partNumber: 'HSE-RB-07', description: 'Rubber hose', quantity: 1 },
    { partNumber: 'FLT-OL-22', description: 'Oil filter', quantity: 3 },
  ],
};

export const failedB: ChildOrder = {
  ...childB,
  status: 'failed',
  failureReason: 'SAP B (US) did not respond in time.',
};
export const failedA: ChildOrder = {
  ...childA,
  status: 'failed',
  failureReason: 'SAP A (EU) rejected the order.',
};

export const order = (children: ChildOrder[]): Order => ({ id: 'ORD-10427', children });
