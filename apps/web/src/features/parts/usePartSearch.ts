import { useCallback, useEffect, useRef, useState } from 'react';
import { searchParts, type PartHit } from '../../api/parts';

export type PartSearchState =
  | { phase: 'idle' }
  | { phase: 'loading' }
  | { phase: 'error' }
  | { phase: 'ready'; hits: PartHit[]; unavailable: string[] };

// A stale response is ignored when a newer search has started.
export function usePartSearch() {
  const [state, setState] = useState<PartSearchState>({ phase: 'idle' });
  const [term, setTerm] = useState('');
  const latest = useRef(0);

  useEffect(
    () => () => {
      latest.current = -1;
    },
    [],
  );

  const search = useCallback((next: string) => {
    const id = ++latest.current;
    setTerm(next);
    setState({ phase: 'loading' });
    searchParts(next).then(
      (res) => {
        if (latest.current === id) setState({ phase: 'ready', hits: res.results, unavailable: res.unavailableSources });
      },
      () => {
        if (latest.current === id) setState({ phase: 'error' });
      },
    );
  }, []);

  const retry = useCallback(() => search(term), [search, term]);

  return { state, term, search, retry };
}
