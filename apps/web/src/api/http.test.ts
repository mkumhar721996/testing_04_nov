import { apiFetch, setAuthHooks } from './http';

describe('apiFetch', () => {
  const onUnauthorized = vi.fn();
  let token: string | null = null;
  const stub = (status: number) => {
    const f = vi.fn(() => Promise.resolve(new Response('{}', { status })));
    vi.stubGlobal('fetch', f);
    return f;
  };
  beforeEach(() => {
    onUnauthorized.mockClear();
    token = null;
    setAuthHooks({ getToken: () => token, onUnauthorized });
  });
  afterEach(() => vi.unstubAllGlobals());

  it('adds the bearer token only when there is one', async () => {
    const f = stub(200);
    await apiFetch('/x');
    expect(new Headers((f.mock.calls[0] as unknown as [string, RequestInit])[1].headers).has('Authorization')).toBe(false);
    token = 'fake-token';
    await apiFetch('/x');
    expect(new Headers((f.mock.calls[1] as unknown as [string, RequestInit])[1].headers).get('Authorization')).toBe(
      'Bearer fake-token',
    );
  });
  it('reports a 401 once', async () => {
    stub(401);
    await apiFetch('/x');
    expect(onUnauthorized).toHaveBeenCalledTimes(1);
  });
  it.each([200, 403])('does not report a %s', async (status) => {
    stub(status);
    await apiFetch('/x');
    expect(onUnauthorized).not.toHaveBeenCalled();
  });
});
