import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import type { Session } from '../../api/auth';
import { setAuthHooks } from '../../api/http';

type Notice = 'expired' | 'signed-out' | null;

interface SessionContextValue {
  session: Session | null;
  notice: Notice;
  signIn(session: Session): void;
  signOut(): void;
  expire(): void;
}

const STORAGE_KEY = 'session';
const SessionContext = createContext<SessionContextValue | null>(null);

function restore(): Session | null {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const s = JSON.parse(raw) as Session;
    if (typeof s?.token !== 'string' || typeof s.role !== 'string') return null;
    if (s.expiresAt != null && s.expiresAt <= Date.now()) return null;
    return s;
  } catch {
    return null;
  }
}

export function SessionProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(restore);
  const [notice, setNotice] = useState<Notice>(null);
  const current = useRef(session);

  const end = useCallback((next: Notice) => {
    current.current = null;
    sessionStorage.removeItem(STORAGE_KEY);
    setSession(null);
    setNotice(next);
  }, []);
  const signIn = useCallback((s: Session) => {
    current.current = s;
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(s));
    setSession(s);
    setNotice(null);
  }, []);
  const signOut = useCallback(() => end('signed-out'), [end]);
  const expire = useCallback(() => end('expired'), [end]);

  // Registered during render so children's first requests already carry the token.
  setAuthHooks({
    getToken: () => current.current?.token ?? null,
    // A stale 401 arriving after sign out must not show the expired message.
    onUnauthorized: () => {
      if (current.current) expire();
    },
  });

  useEffect(() => {
    if (session?.expiresAt == null) return;
    const timer = setTimeout(expire, Math.max(0, session.expiresAt - Date.now()));
    return () => clearTimeout(timer);
  }, [session, expire]);

  const value = useMemo(
    () => ({ session, notice, signIn, signOut, expire }),
    [session, notice, signIn, signOut, expire],
  );
  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useSession(): SessionContextValue {
  const ctx = useContext(SessionContext);
  if (!ctx) throw new Error('useSession must be used inside SessionProvider');
  return ctx;
}
