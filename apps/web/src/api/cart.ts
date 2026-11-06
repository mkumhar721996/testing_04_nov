import { apiFetch } from './http';

export interface CartLine {
  id: string;
  partNumber: string;
  description: string;
  sapInstance: string;
  stockShown: number;
  quantity: number;
}

export type ChangeResult =
  | { kind: 'ok'; line: CartLine }
  | { kind: 'over-stock'; stock: number }
  | { kind: 'invalid'; message: string }
  | { kind: 'error' };

const base = (import.meta.env?.VITE_API_BASE_URL as string | undefined) ?? '/';
const url = (path: string) => `${base.replace(/\/$/, '')}${path}`;
const lineUrl = (id: string) => url(`/cart/lines/${encodeURIComponent(id)}`);

export async function getCart(): Promise<CartLine[]> {
  const res = await apiFetch(url('/cart'));
  if (!res.ok) throw new Error('failed');
  return (await res.json()).lines;
}

export async function changeQuantity(id: string, quantity: number): Promise<ChangeResult> {
  try {
    const res = await apiFetch(lineUrl(id), {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ quantity }),
    });
    if (res.ok) return { kind: 'ok', line: await res.json() };
    if (res.status === 409) return { kind: 'over-stock', stock: (await res.json()).stock };
    if (res.status === 400) return { kind: 'invalid', message: (await res.json()).message };
    return { kind: 'error' };
  } catch {
    return { kind: 'error' };
  }
}

export async function removeLine(id: string): Promise<boolean> {
  try {
    const res = await apiFetch(lineUrl(id), { method: 'DELETE' });
    return res.ok;
  } catch {
    return false;
  }
}
