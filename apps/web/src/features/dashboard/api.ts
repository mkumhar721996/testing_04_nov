import type { CardSummary, Overview, Profile, Transaction } from './types';

const baseUrl = import.meta.env.VITE_API_URL ?? '/api';

async function getJson<T>(path: string): Promise<T> {
  const res = await fetch(`${baseUrl}${path}`, { credentials: 'include' });
  if (!res.ok) throw new Error(`GET ${path} failed with ${res.status}`);
  return (await res.json()) as T;
}

export const fetchProfile = () => getJson<Profile>('/me');
export const fetchCardSummary = () => getJson<CardSummary>('/me/card-summary');
export const fetchOverview = () => getJson<Overview>('/me/overview');
export const fetchTransactions = () => getJson<Transaction[]>('/me/transactions');
