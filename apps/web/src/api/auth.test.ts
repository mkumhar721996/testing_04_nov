import { login } from './auth';

const session = { token: 'fake-token', name: 'Sam', title: 'Buyer', role: 'buyer' };

describe('login', () => {
  afterEach(() => vi.unstubAllGlobals());
  const stub = (status: number, body: unknown = {}) => {
    const f = vi.fn(() => Promise.resolve(new Response(JSON.stringify(body), { status })));
    vi.stubGlobal('fetch', f);
    return f;
  };

  it('posts credentials and returns the session on 200', async () => {
    const f = stub(200, session);
    const r = await login('a@poc.example', 'test-password');
    expect(r).toEqual({ kind: 'ok', session: { ...session, expiresAt: null } });
    const [url, init] = f.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toMatch(/\/auth\/login$/);
    expect(init.method).toBe('POST');
    expect(JSON.parse(init.body as string)).toEqual({ email: 'a@poc.example', password: 'test-password' });
  });
  it('maps 401 to invalid', async () => {
    stub(401);
    expect(await login('a', 'b')).toEqual({ kind: 'invalid' });
  });
  it('maps other statuses and network failures to error', async () => {
    stub(500);
    expect(await login('a', 'b')).toEqual({ kind: 'error' });
    vi.stubGlobal('fetch', vi.fn(() => Promise.reject(new Error('down'))));
    expect(await login('a', 'b')).toEqual({ kind: 'error' });
  });
});
