import { apiFetch } from './http';

export interface PartHit {
  partNumber: string;
  description: string;
  sapInstance: string;
  stock: number;
}

export interface PartSearchResponse {
  results: PartHit[];
  unavailableSources: string[];
}

const base = (import.meta.env?.VITE_API_BASE_URL as string | undefined) ?? '/';
const url = (path: string) => `${base.replace(/\/$/, '')}${path}`;

const isHit = (h: unknown): h is PartHit => {
  const x = h as PartHit;
  return (
    !!x &&
    typeof x.partNumber === 'string' &&
    typeof x.description === 'string' &&
    typeof x.sapInstance === 'string' &&
    typeof x.stock === 'number'
  );
};

// The server returns only hits from instances the caller is entitled to and lists unreachable ones.
export async function searchParts(term: string): Promise<PartSearchResponse> {
  const res = await apiFetch(url(`/parts/search?q=${encodeURIComponent(term)}`));
  if (!res.ok) throw new Error('failed');
  const body = await res.json();
  if (
    !Array.isArray(body?.results) ||
    !body.results.every(isHit) ||
    !Array.isArray(body.unavailableSources) ||
    !body.unavailableSources.every((s: unknown) => typeof s === 'string')
  ) {
    throw new Error('malformed');
  }
  return body;
}
