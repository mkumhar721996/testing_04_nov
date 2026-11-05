import { useCallback, useEffect, useRef, useState } from 'react';
import { DefectDetail, getDefect, postMove, Status, StatusMove } from '../../api/defects';
import { CommentsCard } from './CommentsCard';
import { ReasonForm, ReasonKind } from './ReasonForm';
import { StatusMovesCard } from './StatusMovesCard';

const BADGE: Partial<Record<Status, string>> = {
  Rejected: 'badge badge-danger',
  'In progress': 'badge badge-warning',
  Resolved: 'badge badge-warning',
  Verified: 'badge badge-success',
};

const reasonKind = (move: StatusMove): ReasonKind => (move.to === 'Rejected' ? 'reject' : 'reopen');

const successMessage = (move: StatusMove, to: Status) =>
  move.requiresReason
    ? reasonKind(move) === 'reject'
      ? 'Defect rejected. Reason saved as a comment.'
      : 'Defect reopened as Triaged. Reason saved as a comment.'
    : `Status changed to ${to}.`;

const CONFLICT_TEXT =
  'Another user changed this defect. The current status is shown above; your move was refused. Refresh and try again if the move still applies.';
const FORBIDDEN_TEXT = "You can't make that move. Refresh to see the moves available to you.";

type Load = { state: 'loading' } | { state: 'error' } | { state: 'ready'; defect: DefectDetail };

export function DefectPage({ id }: { id: string }) {
  const [load, setLoad] = useState<Load>({ state: 'loading' });
  const [reasonMove, setReasonMove] = useState<StatusMove | null>(null);
  const [pending, setPending] = useState(false);
  const [banner, setBanner] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout>>(undefined);

  const fetchDefect = useCallback(() => {
    setLoad({ state: 'loading' });
    getDefect(id).then(
      (defect) => setLoad({ state: 'ready', defect }),
      () => setLoad({ state: 'error' }),
    );
  }, [id]);

  useEffect(() => {
    fetchDefect();
    return () => clearTimeout(toastTimer.current);
  }, [fetchDefect]);

  if (load.state === 'loading') {
    return (
      <div className="stack" aria-busy="true">
        <span className="skeleton" />
        <span className="skeleton" />
        <div className="card stack-sm">
          <span className="skeleton" />
          <span className="skeleton" />
        </div>
      </div>
    );
  }

  if (load.state === 'error') {
    return (
      <div className="stack">
        <p className="alert alert-danger" role="alert">
          This defect could not be loaded. Check your connection and try again.
        </p>
        <div>
          <button className="btn btn-secondary" type="button" onClick={fetchDefect}>
            Try again
          </button>
        </div>
      </div>
    );
  }

  const { defect } = load;

  const run = async (move: StatusMove, reason?: string) => {
    setPending(true);
    setBanner(null);
    const result = await postMove(defect.id, {
      to: move.to,
      expectedVersion: defect.rowVersion,
      ...(reason !== undefined && { reason }),
    });
    setPending(false);
    if (result.kind === 'ok') {
      setLoad({ state: 'ready', defect: result.defect });
      setReasonMove(null);
      setToast(successMessage(move, result.defect.status));
      clearTimeout(toastTimer.current);
      toastTimer.current = setTimeout(() => setToast(null), 4000);
    } else if (result.kind === 'conflict') {
      setLoad({ state: 'ready', defect: result.defect });
      setReasonMove(null);
      setBanner(CONFLICT_TEXT);
    } else if (result.kind === 'forbidden') {
      setBanner(FORBIDDEN_TEXT);
    } else if (result.kind === 'invalid') {
      setBanner(result.message);
    } else {
      setBanner('The move could not be saved. Try again.');
    }
  };

  return (
    <div className="stack">
      <div className="page-head">
        <div>
          <p className="text-muted mono">{defect.key}</p>
          <h1>{defect.title}</h1>
        </div>
        <span className={BADGE[defect.status] ?? 'badge'}>Status: {defect.status}</span>
      </div>

      {reasonMove ? (
        <ReasonForm
          kind={reasonKind(reasonMove)}
          pending={pending}
          onSubmit={(reason) => void run(reasonMove, reason)}
          onCancel={() => setReasonMove(null)}
        />
      ) : (
        <StatusMovesCard
          status={defect.status}
          moves={defect.availableMoves}
          disabled={pending}
          onChoose={(move) => {
            setBanner(null);
            if (move.requiresReason) setReasonMove(move);
            else void run(move);
          }}
        />
      )}

      {banner && (
        <p className="alert alert-danger" role="alert">
          {banner}
        </p>
      )}

      <CommentsCard comments={defect.comments} />

      {toast && (
        <div className="toast is-open" role="status">
          {toast}
        </div>
      )}
    </div>
  );
}
