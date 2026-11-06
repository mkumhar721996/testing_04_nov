import { useCallback, useEffect, useState } from 'react';
import type { Loadable } from './types';

export function useResource<T>(load: () => Promise<T>): Loadable<T> {
  const [attempt, setAttempt] = useState(0);
  const [state, setState] = useState<{ status: Loadable<T>['status']; data: T | null }>({
    status: 'loading',
    data: null,
  });

  useEffect(() => {
    let current = true;
    setState({ status: 'loading', data: null });
    load().then(
      (data) => current && setState({ status: 'ready', data }),
      () => current && setState({ status: 'error', data: null }),
    );
    return () => {
      current = false;
    };
    // `load` is a stable module-level function; only a retry re-runs the request.
  }, [attempt]);

  const reload = useCallback(() => setAttempt((n) => n + 1), []);
  return { ...state, reload };
}
