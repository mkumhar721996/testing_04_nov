interface Props {
  unavailable: string[];
  onSearchAgain(): void;
}

export function SourceNotice({ unavailable, onSearchAgain }: Props) {
  if (unavailable.length === 0) return null;
  const names = unavailable.join(' and ');
  return (
    <div className="alert alert-warning" role="status">
      <strong>One source is unavailable.</strong> {names} did not respond, so these results come from the other
      instance only. Parts held there may be missing.
      <button type="button" className="btn btn-secondary" onClick={onSearchAgain}>
        Search again
      </button>
    </div>
  );
}
