export type ProfileDto = { name: string };

export type CardSummaryDto = {
  last4: string;
  /** MM/YY */
  expiry: string;
  balance: { amount: string; currency: string };
};
