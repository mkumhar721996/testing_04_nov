interface AuthHooks {
  getToken(): string | null;
  onUnauthorized(): void;
}

let hooks: AuthHooks = { getToken: () => null, onUnauthorized: () => {} };

export function setAuthHooks(next: AuthHooks): void {
  hooks = next;
}

// Single choke point: attaches the bearer token and reports 401s so the session can expire.
export async function apiFetch(input: string, init: RequestInit = {}): Promise<Response> {
  const token = hooks.getToken();
  const headers = new Headers(init.headers);
  if (token) headers.set('Authorization', `Bearer ${token}`);
  const res = await fetch(input, { ...init, headers });
  if (res.status === 401) hooks.onUnauthorized();
  return res;
}
