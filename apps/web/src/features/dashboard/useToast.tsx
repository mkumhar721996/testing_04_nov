import { useCallback, useEffect, useState } from 'react';

const HIDE_AFTER_MS = 4000;

/** Placeholder controls start nothing: they only confirm with a short-lived toast. */
export function useToast() {
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    if (message === null) return;
    const timer = setTimeout(() => setMessage(null), HIDE_AFTER_MS);
    return () => clearTimeout(timer);
  }, [message]);

  const show = useCallback((text: string) => setMessage(text), []);
  const toast = message === null ? null : <div className="toast is-open" role="status">{message}</div>;
  return { show, toast };
}
