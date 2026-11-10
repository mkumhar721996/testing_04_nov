import type { CartLine, PartMatch } from '../features/quick-order/types';
import { apiFetch } from './http';

const base = (import.meta.env?.VITE_API_BASE_URL as string | undefined) ?? '/';
const url = (path: string) => `${base.replace(/\/$/, '')}${path}`;
const json = { 'Content-Type': 'application/json' };

// Returns the matches for the part numbers it knows; an unknown part number is absent.
export async function lookupParts(partNumbers: string[]): Promise<PartMatch[]> {
  const res = await apiFetch(url('/parts/lookup'), {
    method: 'POST',
    headers: json,
    body: JSON.stringify({ partNumbers }),
  });
  if (!res.ok) throw new Error('failed');
  return res.json();
}

export async function addCartLines(lines: CartLine[]): Promise<{ kind: 'ok' } | { kind: 'error' }> {
  try {
    const res = await apiFetch(url('/cart/lines'), {
      method: 'POST',
      headers: json,
      body: JSON.stringify({ lines }),
    });
    return res.ok ? { kind: 'ok' } : { kind: 'error' };
  } catch {
    return { kind: 'error' };
  }
}
