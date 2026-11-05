import { ComponentItem } from '../api/client';

export interface RenameDraft {
  value: string;
  error: string | null;
  saving: boolean;
}

interface ComponentRowProps {
  component: ComponentItem;
  canEdit: boolean;
  rename: RenameDraft | null;
  onStartRename: (component: ComponentItem) => void;
  onRenameChange: (value: string) => void;
  onRenameSave: () => void;
  onRenameCancel: () => void;
  onRetire: (component: ComponentItem, trigger: HTMLElement) => void;
}

export function ComponentRow({
  component,
  canEdit,
  rename,
  onStartRename,
  onRenameChange,
  onRenameSave,
  onRenameCancel,
  onRetire,
}: ComponentRowProps) {
  if (rename) {
    const inputId = `rename-${component.id}`;
    const errorId = `${inputId}-error`;
    return (
      <li>
        <form
          className="rename-form"
          onSubmit={(event) => {
            event.preventDefault();
            onRenameSave();
          }}
        >
          <div className="field">
            <label htmlFor={inputId}>{`Rename ${component.name} to`}</label>
            <input
              id={inputId}
              className={rename.error ? 'input is-invalid' : 'input'}
              value={rename.value}
              onChange={(event) => onRenameChange(event.target.value)}
              aria-invalid={rename.error ? true : undefined}
              aria-describedby={rename.error ? errorId : undefined}
              autoComplete="off"
              autoFocus
            />
            {rename.error && (
              <span className="field-error" id={errorId}>
                {rename.error}
              </span>
            )}
          </div>
          <div className="comp-actions">
            <button
              type="button"
              className="btn btn-secondary"
              onClick={onRenameCancel}
              disabled={rename.saving}
            >
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={rename.saving}>
              {rename.saving && <span className="spinner" aria-hidden="true" />}
              Save
            </button>
          </div>
        </form>
      </li>
    );
  }

  if (component.status === 'retired') {
    return (
      <li>
        <div>
          <strong className="comp-name">{component.name}</strong>{' '}
          <span className="badge badge-retired">Retired</span>
        </div>
        {canEdit && <span className="text-muted">Not offered to reporters</span>}
      </li>
    );
  }

  return (
    <li>
      <div>
        <strong className="comp-name">{component.name}</strong>
      </div>
      {canEdit && (
        <div className="comp-actions">
          <button
            type="button"
            className="btn btn-secondary"
            aria-label={`Rename ${component.name}`}
            onClick={() => onStartRename(component)}
          >
            Rename
          </button>
          <button
            type="button"
            className="btn btn-secondary"
            aria-label={`Retire ${component.name}`}
            onClick={(event) => onRetire(component, event.currentTarget)}
          >
            Retire
          </button>
        </div>
      )}
    </li>
  );
}
