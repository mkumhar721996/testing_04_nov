import { useState } from 'react';
import { Developer, getDevelopers, Status } from '../../api/defects';

export interface OwnerNotice {
  tone: 'info' | 'warning';
  text: string;
}

interface Props {
  status: Status;
  ownerId: string | null;
  ownerName: string | null;
  canSetOwner: boolean;
  /** Makes "Set owner" the one primary action of the view. */
  primary: boolean;
  disabled: boolean;
  notice: OwnerNotice | null;
  onSetOwner: (owner: Developer | null) => void;
}

type Picker = { state: 'closed' } | { state: 'loading' } | { state: 'error' } | { state: 'open'; developers: Developer[] };

const initials = (name: string) =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0].toUpperCase())
    .join('');

export function OwnerCard({
  status,
  ownerId,
  ownerName,
  canSetOwner,
  primary,
  disabled,
  notice,
  onSetOwner,
}: Props) {
  const [picker, setPicker] = useState<Picker>({ state: 'closed' });

  const openPicker = () => {
    setPicker({ state: 'loading' });
    getDevelopers().then(
      (developers) => setPicker({ state: 'open', developers }),
      () => setPicker({ state: 'error' }),
    );
  };

  if (picker.state !== 'closed') {
    const title = ownerId ? 'Change owner' : 'Choose an owner';
    return (
      <section className="card stack-sm" aria-labelledby="owner-title">
        <h2 id="owner-title">{title}</h2>
        <p className="text-muted">Only users who are Developers are listed. A defect has one owner.</p>
        {picker.state === 'loading' && (
          <div aria-busy="true">
            <span className="skeleton" />
          </div>
        )}
        {picker.state === 'error' && (
          <>
            <p className="alert alert-danger" role="alert">
              The Developers could not be loaded. Check your connection and try again.
            </p>
            <div>
              <button className="btn btn-secondary" type="button" onClick={openPicker}>
                Try again
              </button>
            </div>
          </>
        )}
        {picker.state === 'open' &&
          (picker.developers.length === 0 ? (
            <p className="text-muted">
              No Developers are available. Ask an administrator to add a Developer, then try again.
            </p>
          ) : (
            <div className="menu" role="group" aria-label="Developers">
              {picker.developers.map((dev) => (
                <button
                  key={dev.id}
                  type="button"
                  className="btn btn-ghost"
                  disabled={disabled || dev.id === ownerId}
                  onClick={() => {
                    setPicker({ state: 'closed' });
                    onSetOwner(dev);
                  }}
                >
                  {dev.id === ownerId ? `${dev.name} (current owner)` : dev.name}
                </button>
              ))}
            </div>
          ))}
        <div>
          <button
            className="btn btn-secondary"
            type="button"
            onClick={() => setPicker({ state: 'closed' })}
          >
            Cancel
          </button>
        </div>
      </section>
    );
  }

  return (
    <section className="card stack-sm" aria-labelledby="owner-title">
      <h2 id="owner-title">Owner</h2>
      <div className="owner-row">
        {ownerName ? (
          <span className="owner-name">
            <span className="avatar" aria-hidden="true">
              {initials(ownerName)}
            </span>
            <strong data-testid="owner-name">{ownerName}</strong>
          </span>
        ) : (
          <span className="text-muted">No owner</span>
        )}
        {canSetOwner && (
          <div className="cluster">
            <button
              className={primary ? 'btn btn-primary' : 'btn btn-secondary'}
              type="button"
              disabled={disabled}
              onClick={openPicker}
            >
              {ownerName ? 'Change owner' : 'Set owner'}
            </button>
            {ownerName && status === 'In progress' && (
              <button
                className="btn btn-ghost"
                type="button"
                disabled={disabled}
                onClick={() => onSetOwner(null)}
              >
                Remove owner
              </button>
            )}
          </div>
        )}
      </div>
      {notice && (
        <p className={`alert alert-${notice.tone}`} role="status">
          {notice.text}
        </p>
      )}
    </section>
  );
}
