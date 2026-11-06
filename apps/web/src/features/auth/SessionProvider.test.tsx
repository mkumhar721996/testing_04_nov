import { act, render, screen } from '@testing-library/react';
import { apiFetch } from '../../api/http';
import type { Session } from '../../api/auth';
import { SessionProvider, useSession } from './SessionProvider';

const base: Session = { token: 'fake-token', name: 'Sam', title: 'Buyer', role: 'buyer', expiresAt: null };

function Probe() {
  const { session, notice, signOut } = useSession();
  return (
    <div>
      <span data-testid="who">{session?.name ?? 'none'}</span>
      <span data-testid="notice">{notice ?? 'none'}</span>
      <button onClick={signOut}>out</button>
    </div>
  );
}

const mount = () =>
  render(
    <SessionProvider>
      <Probe />
    </SessionProvider>,
  );

describe('SessionProvider', () => {
  afterEach(() => {
    sessionStorage.clear();
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it('restores a stored session', () => {
    sessionStorage.setItem('session', JSON.stringify(base));
    mount();
    expect(screen.getByTestId('who')).toHaveTextContent('Sam');
  });

  it('ignores a malformed stored session', () => {
    sessionStorage.setItem('session', '{nope');
    mount();
    expect(screen.getByTestId('who')).toHaveTextContent('none');
  });

  it('ignores a stored session with an unknown role', () => {
    sessionStorage.setItem('session', JSON.stringify({ ...base, role: 'foo' }));
    mount();
    expect(screen.getByTestId('who')).toHaveTextContent('none');
  });

  it('does not expire early when expiresAt is far in the future', () => {
    vi.useFakeTimers();
    sessionStorage.setItem('session', JSON.stringify({ ...base, expiresAt: Date.now() + 2 ** 31 * 2 }));
    mount();
    act(() => {
      vi.advanceTimersByTime(1000);
    });
    expect(screen.getByTestId('who')).toHaveTextContent('Sam');
  });

  it('ignores a stored session already past expiresAt', () => {
    sessionStorage.setItem('session', JSON.stringify({ ...base, expiresAt: Date.now() - 1 }));
    mount();
    expect(screen.getByTestId('who')).toHaveTextContent('none');
  });

  it('expires when expiresAt passes', () => {
    vi.useFakeTimers();
    sessionStorage.setItem('session', JSON.stringify({ ...base, expiresAt: Date.now() + 1000 }));
    mount();
    act(() => {
      vi.advanceTimersByTime(1000);
    });
    expect(screen.getByTestId('who')).toHaveTextContent('none');
    expect(screen.getByTestId('notice')).toHaveTextContent('expired');
    expect(sessionStorage.getItem('session')).toBeNull();
  });

  it('expires on a 401 while signed in', async () => {
    vi.stubGlobal('fetch', vi.fn(() => Promise.resolve(new Response('{}', { status: 401 }))));
    sessionStorage.setItem('session', JSON.stringify(base));
    mount();
    await act(async () => {
      await apiFetch('/x');
    });
    expect(screen.getByTestId('notice')).toHaveTextContent('expired');
  });

  it('ignores a 401 after sign out', async () => {
    vi.stubGlobal('fetch', vi.fn(() => Promise.resolve(new Response('{}', { status: 401 }))));
    sessionStorage.setItem('session', JSON.stringify(base));
    mount();
    act(() => screen.getByText('out').click());
    await act(async () => {
      await apiFetch('/x');
    });
    expect(screen.getByTestId('notice')).toHaveTextContent('signed-out');
  });
});
