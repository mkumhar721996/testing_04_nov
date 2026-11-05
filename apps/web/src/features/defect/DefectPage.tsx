import { useCallback, useEffect, useRef, useState } from 'react';
import {
  DefectDetail,
  Developer,
  getDefect,
  postMove,
  putOwner,
  Status,
  StatusMove,
} from '../../api/defects';
import { CommentsCard } from './CommentsCard';
import { OwnerCard, OwnerNotice } from './OwnerCard';
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

const OWNER_REQUIRED_MESSAGE = 'Set an owner before moving this defect to In progress.';

function ownerNotice(before: DefectDetail, after: DefectDetail): OwnerNotice {
  const stays = `The status stays ${after.status}.`;
  if (!after.ownerName)
    return {
      tone: 'warning',
      text: `Owner removed. ${stays} Set a new owner so someone is accountable.`,
    };
  if (!before.ownerName)
    return {
      tone: 'info',
      text: `Owner set to ${after.ownerName}.${after.status === 'New' ? ' The status stays New until a Lead triages it.' : ''}`,
    };
  return { tone: 'info', text: `Owner changed from ${before.ownerName} to ${after.ownerName}. ${stays}` };
}

type Load ={ state: 'loading' } | { state: 'error' } | { state: 'ready'; defect: DefectDetail };

export function DefectPage({ id }: { id: string }) {
  const [load, setLoad] = useState<Load>({ state: 'loading' });
  const [reasonMove, setReasonMove] = useState<StatusMove | null>(null);
  const [pending, setPending] = useState(false);
  const [banner, setBanner] = useState<string | null>(null);
  const [notice, setNotice] = useState<OwnerNotice | null>(null);
  const [ownerRequired, setOwnerRequired] = useState(false);
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

  const setOwner = async (owner: Developer | null) => {
    setPending(true);
    setBanner(null);
    const result = await putOwner(defect.id, {
      ownerId: owner?.id ?? null,
      expectedVersion: defect.rowVersion,
    });
    setPending(false);
    if (result.kind === 'ok') {
      setLoad({ state: 'ready', defect: result.defect });
      setNotice(ownerNotice(defect, result.defect));
      setOwnerRequired(false);
    } else if (result.kind === 'conflict') {
      setLoad({ state: 'ready', defect: result.defect });
      setBanner(CONFLICT_TEXT);
    } else if (result.kind === 'forbidden') {
      setBanner(FORBIDDEN_TEXT);
    } else if (result.kind === 'invalid') {
      setBanner(result.message);
    } else {
      setBanner('The owner could not be saved. Try again.');
    }
  };

  const run = async (move: StatusMove, reason?: string) => {
    setPending(true);
    setBanner(null);
    setNotice(null);
    setOwnerRequired(false);
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
    } else if (result.kind === 'invalid' && result.message === OWNER_REQUIRED_MESSAGE) {
      setOwnerRequired(true);
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

      <OwnerCard
        status={defect.status}
        ownerId={defect.ownerId}
        ownerName={defect.ownerName}
        canSetOwner={defect.canSetOwner}
        primary={ownerRequired}
        disabled={pending}
        notice={notice}
        onSetOwner={(owner) => void setOwner(owner)}
      />

      {ownerRequired && (
        <p className="alert alert-warning" role="alert">
          {OWNER_REQUIRED_MESSAGE} The defect stays {defect.status}.
        </p>
      )}

      {ownerRequired ? null : reasonMove ? (
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
            setNotice(null);
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
