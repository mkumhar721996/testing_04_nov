export type Role = 'buyer' | 'admin' | 'csr';
export interface Session {
  token: string;
  name: string;
  title: string;
  role: Role;
  expiresAt: number | null;
}
export type LoginResult = { kind: 'ok'; session: Session } | { kind: 'invalid' } | { kind: 'error' };

const base = (import.meta.env?.VITE_API_BASE_URL as string | undefined) ?? '/';

export async function login(email: string, password: string): Promise<LoginResult> {
  try {
    const res = await fetch(`${base.replace(/\/$/, '')}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    if (res.status === 401) return { kind: 'invalid' };
    if (!res.ok) return { kind: 'error' };
    const body = await res.json();
    return { kind: 'ok', session: { ...body, expiresAt: body.expiresAt ?? null } };
  } catch {
    return { kind: 'error' };
  }
}
