import type { Status, StatusMove } from '../../api/defects';

// Forward moves get the one primary button; the rest are alternatives.
const FORWARD: Status[] = ['Resolved', 'Verified', 'Closed'];

interface Props {
  status: Status;
  moves: StatusMove[];
  disabled: boolean;
  onChoose: (move: StatusMove) => void;
}

export function StatusMovesCard({ status, moves, disabled, onChoose }: Props) {
  const primaryTo = moves.find((m) => FORWARD.includes(m.to))?.to;
  return (
    <section className="card stack-sm" aria-labelledby="status-moves-title">
      <h2 id="status-moves-title">Status moves</h2>
      {moves.length > 0 ? (
        <div className="cluster">
          {moves.map((move) => (
            <button
              key={move.to}
              type="button"
              className={move.to === primaryTo ? 'btn btn-primary' : 'btn btn-secondary'}
              disabled={disabled}
              onClick={() => onChoose(move)}
            >
              {move.label}
            </button>
          ))}
        </div>
      ) : status === 'Rejected' ? (
        <p className="text-muted">No status move is available for a Rejected defect.</p>
      ) : (
        <p className="alert alert-info" role="status">
          No status move is available to you.
        </p>
      )}
    </section>
  );
}
