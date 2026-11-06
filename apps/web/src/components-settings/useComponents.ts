import { useCallback, useEffect, useState } from 'react';
import { ComponentItem, getMe, listComponents } from '../api/client';

export type ComponentsState =
  | { phase: 'loading' }
  | { phase: 'error' }
  | { phase: 'ready'; isLead: boolean; components: ComponentItem[] };

// Loads who the user is and the full component list. `reload` refetches the list
// without the loading state, so the screen only ever shows what the server holds.
export function useComponents() {
  const [state, setState] = useState<ComponentsState>({ phase: 'loading' });

  useEffect(() => {
    let cancelled = false;
    Promise.all([getMe(), listComponents()]).then(
      ([me, components]) => {
        if (!cancelled) setState({ phase: 'ready', isLead: me.isLead, components });
      },
      () => {
        if (!cancelled) setState({ phase: 'error' });
      },
    );
    return () => {
      cancelled = true;
    };
  }, []);

  const reload = useCallback(async () => {
    try {
      const components = await listComponents();
      setState((current) =>
        current.phase === 'ready' ? { ...current, components } : current,
      );
    } catch {
      setState({ phase: 'error' });
    }
  }, []);

  return { state, reload };
}
