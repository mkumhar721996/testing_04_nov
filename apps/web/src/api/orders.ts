import { apiFetch } from './http';

export type ChildStatus = 'placed' | 'failed';
export interface OrderLine {
  partNumber: string;
  description: string;
  quantity: number;
}
export interface ChildOrder {
  id: string;
  sapInstance: string;
  status: ChildStatus;
  failureReason?: string;
  lines: OrderLine[];
}
export interface Order {
  id: string;
  placedAt?: string;
  children: ChildOrder[];
}
export interface OrderSummary {
  id: string;
  placedAt: string;
  source: string;
  status: string;
  failedChildCount: number;
}
export interface CartLine extends OrderLine {
  sapInstance: string;
  stock: number;
}

// Contract assumed from the order-placement stories; only this file knows the paths.
const base = (import.meta.env?.VITE_API_URL as string | undefined) ?? '/api';
const url = (path: string) => `${base.replace(/\/$/, '')}${path}`;

async function getJson<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await apiFetch(url(path), init);
  if (!res.ok) throw new Error(`request failed: ${res.status}`);
  return res.json();
}

export const fetchCart = () => getJson<CartLine[]>('/cart');
// The server splits the whole cart per SAP instance; the client sends nothing.
export const placeOrder = () => getJson<Order>('/orders', { method: 'POST' });
export const fetchOrders = () => getJson<OrderSummary[]>('/orders');
export const fetchOrder = (id: string) => getJson<Order>(`/orders/${encodeURIComponent(id)}`);
