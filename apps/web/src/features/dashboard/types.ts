export type Profile = { name: string };

export type CardSummary = {
  last4: string;
  expiry: string;
  balance: { amount: string; currency: string };
};

export type OverviewMonth = { month: number; net: string };

export type Overview = {
  year: number;
  currency: string;
  total: string;
  trend: { direction: 'up' | 'down' | 'flat'; percent: string; previousYear: number } | null;
  months: OverviewMonth[];
  hasMovement: boolean;
};

export type Transaction = {
  id: string;
  merchant: string;
  occurredAt: string;
  status: 'in_progress' | 'completed';
  cardLast4: string | null;
  /** Signed decimal: positive is money in, negative is money out. */
  amount: string;
};

export type Loadable<T> = {
  status: 'loading' | 'ready' | 'error';
  data: T | null;
  reload: () => void;
};
