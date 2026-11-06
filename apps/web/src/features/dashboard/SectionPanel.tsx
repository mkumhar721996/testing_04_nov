import { useEffect, useId, useState } from 'react';
import type { Loadable } from './types';

type SectionPanelProps = {
  title: string;
  text: string;
  pending: boolean;
  onRetry: () => void;
};

/** Unavailable state of one dashboard section, with a Try again that reloads only that section. */
export function SectionPanel({ title, text, pending, onRetry }: SectionPanelProps) {
  const titleId = useId();
  return (
    <div className="section-panel" role="alert" aria-labelledby={titleId}>
      <h4 id={titleId}>{title}</h4>
      <p>{text}</p>
      <button type="button" className="btn btn-primary" disabled={pending} onClick={onRetry}>
        {pending ? (
          <>
            <span className="spinner" aria-hidden="true" /> Trying again
          </>
        ) : (
          'Try again'
        )}
      </button>
    </div>
  );
}

/**
 * Tracks a retry of one section so its panel can stay on screen as "Trying again" while the
 * reload is in flight, instead of flashing to the loading skeleton.
 */
export function useRetry(resource: Loadable<unknown>) {
  const [retrying, setRetrying] = useState(false);
  useEffect(() => {
    if (resource.status !== 'loading') setRetrying(false);
  }, [resource.status]);
  const retry = () => {
    setRetrying(true);
    resource.reload();
  };
  return { retrying: retrying && resource.status === 'loading', retry };
}
