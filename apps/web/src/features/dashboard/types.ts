export type Profile = { name: string };

export type CardSummary = {
  last4: string;
  expiry: string;
  balance: { amount: string; currency: string };
};

export type Loadable<T> = {
  status: 'loading' | 'ready' | 'error';
  data: T | null;
  reload: () => void;
};
