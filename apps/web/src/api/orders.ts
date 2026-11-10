import { apiFetch } from './http';

export type OrderChannel = 'poc' | 'historical' | 'other';

export interface ChildOrder {
  id: string;
  sapInstance: string;
  status: string;
}

export interface OrderRow {
  id: string;
  orderDate: string;
  channel: OrderChannel;
  /** Standalone rows only. */
  status: string | null;
  /** POC rows only, [] otherwise. */
  children: ChildOrder[];
}

export interface OrderPage {
  items: OrderRow[];
  total: number;
  page: number;
  pageSize: number;
  distributorName?: string;
}

export const ORDERS_PAGE_SIZE = 25;

const base = (import.meta.env?.VITE_API_BASE_URL as string | undefined) ?? '/';
const url = (path: string) => `${base.replace(/\/$/, '')}${path}`;

// The server derives the Distributor from the bearer token; the client never sends one.
export async function getOrders(page: number, signal?: AbortSignal): Promise<OrderPage> {
  const res = await apiFetch(url(`/orders?page=${page}&pageSize=${ORDERS_PAGE_SIZE}`), { signal });
  if (!res.ok) throw new Error('failed');
  return res.json();
}
