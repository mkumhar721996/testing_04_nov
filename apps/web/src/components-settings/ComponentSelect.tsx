import { useEffect, useId, useState } from 'react';
import { ComponentItem, listComponents } from '../api/client';

type Loaded = { phase: 'loading' } | { phase: 'error' } | { phase: 'ready'; items: ComponentItem[] };

// The reporter's component choice: a select over the active components only,
// so a component can never be typed as free text.
export function ComponentSelect(props: {
  value: string;
  onChange: (id: string) => void;
  id?: string;
}) {
  const generatedId = useId();
  const id = props.id ?? generatedId;
  const hintId = `${id}-hint`;
  const [loaded, setLoaded] = useState<Loaded>({ phase: 'loading' });

  useEffect(() => {
    let cancelled = false;
    listComponents('active').then(
      (items) => {
        if (!cancelled) setLoaded({ phase: 'ready', items });
      },
      () => {
        if (!cancelled) setLoaded({ phase: 'error' });
      },
    );
    return () => {
      cancelled = true;
    };
  }, []);

  if (loaded.phase === 'loading') {
    return <div className="skeleton" role="status" aria-label="Loading components" />;
  }

  if (loaded.phase === 'error') {
    return (
      <div className="alert alert-danger" role="alert">
        Components could not be loaded. Reload the page to try again.
      </div>
    );
  }

  return (
    <div className="field">
      <label htmlFor={id}>Component</label>
      <select
        id={id}
        className="select"
        value={props.value}
        onChange={(event) => props.onChange(event.target.value)}
        aria-describedby={hintId}
      >
        <option value="">Choose a component</option>
        {loaded.items.map((item) => (
          <option key={item.id} value={item.id}>
            {item.name}
          </option>
        ))}
      </select>
      <span className="field-hint" id={hintId}>
        {loaded.items.length === 0
          ? 'No components yet. Ask a Lead to add one.'
          : 'Retired components such as Legacy are not listed.'}
      </span>
    </div>
  );
}
