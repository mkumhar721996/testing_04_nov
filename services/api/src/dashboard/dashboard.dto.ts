export type ProfileDto = { name: string };

export type OverviewDto = {
  year: number;
  currency: string;
  /** Net movement for the year, decimal string. */
  total: string;
  /** Against the previous calendar year; null when that year has no movement. */
  trend: { direction: 'up' | 'down' | 'flat'; percent: string; previousYear: number } | null;
  /** Always 12 entries, month 1..12, "0.00" when empty. */
  months: { month: number; net: string }[];
  hasMovement: boolean;
};

export type TransactionDto = {
  id: string;
  merchant: string;
  occurredAt: string;
  status: 'in_progress' | 'completed';
  cardLast4: string | null;
  /** Signed decimal string: positive is money in, negative is money out. */
  amount: string;
};

export type CardSummaryDto = {
  last4: string;
  /** MM/YY */
  expiry: string;
  balance: { amount: string; currency: string };
};
