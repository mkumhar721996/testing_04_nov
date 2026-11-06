import { FormEvent, useEffect, useRef, useState } from 'react';
import {
  ApiError,
  ComponentItem,
  addComponent,
  renameComponent,
  retireComponent,
} from '../api/client';
import { ComponentRow, RenameDraft } from './ComponentRow';
import { RetireConfirmModal } from './RetireConfirmModal';
import { useComponents } from './useComponents';

const TOAST_MS = 4000;

function messageOf(error: unknown): string {
  return error instanceof ApiError ? error.message : 'Something went wrong. Try again.';
}

export function ComponentSettings() {
  const { state, reload } = useComponents();
  const [alert, setAlert] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [newName, setNewName] = useState('');
  const [newNameError, setNewNameError] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [renaming, setRenaming] = useState<(RenameDraft & { id: string }) | null>(null);
  const [retiring, setRetiring] = useState<{
    component: ComponentItem;
    trigger: HTMLElement;
    pending: boolean;
  } | null>(null);
  const nameInput = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(null), TOAST_MS);
    return () => clearTimeout(timer);
  }, [toast]);

  if (state.phase === 'loading') {
    return (
      <div className="stack-lg" aria-busy="true">
        <h1>Components</h1>
        <div className="stack" role="status" aria-label="Loading components">
          <div className="skeleton skel-row" />
          <div className="skeleton skel-row" />
          <div className="skeleton skel-row" />
        </div>
      </div>
    );
  }

  if (state.phase === 'error') {
    return (
      <div className="stack-lg">
        <h1>Components</h1>
        <div className="alert alert-danger" role="alert">
          Components could not be loaded. Reload the page to try again.
        </div>
      </div>
    );
  }

  const { isLead, components } = state;

  async function submitNew(event: FormEvent) {
    event.preventDefault();
    const name = newName.trim();
    if (!name) {
      setNewNameError('Enter a component name.');
      nameInput.current?.focus();
      return;
    }
    setAdding(true);
    try {
      await addComponent(name);
      setNewName('');
      setNewNameError(null);
      setAlert(null);
      setToast(`Added "${name}". Reporters can now choose it.`);
      await reload();
    } catch (error) {
      setNewNameError(messageOf(error));
    } finally {
      setAdding(false);
    }
  }

  async function saveRename() {
    if (!renaming) return;
    const { id, value } = renaming;
    const original = components.find((c) => c.id === id)?.name ?? '';
    const name = value.trim();
    if (!name) {
      setRenaming({ ...renaming, error: 'Enter a component name.' });
      return;
    }
    setRenaming({ ...renaming, saving: true });
    try {
      await renameComponent(id, name);
      setRenaming(null);
      setAlert(null);
      setToast(`Renamed ${original} to "${name}". Existing defects show the new name.`);
      await reload();
    } catch (error) {
      setAlert(messageOf(error));
      const taken = error instanceof ApiError && error.status === 409;
      setRenaming({
        id,
        value,
        saving: false,
        error: taken ? `"${name}" is already in use.` : null,
      });
    }
  }

  async function confirmRetire() {
    if (!retiring) return;
    const { component } = retiring;
    setRetiring({ ...retiring, pending: true });
    try {
      await retireComponent(component.id);
      setAlert(null);
      setToast(`Retired ${component.name}. Reporters can no longer choose it.`);
      await reload();
    } catch (error) {
      setAlert(messageOf(error));
    } finally {
      setRetiring(null);
    }
  }

  const addForm = (
    buttonClass: string,
    label: string,
    fieldLabel: string,
    placeholder: string,
  ) => (
    <form className="add-row" onSubmit={submitNew}>
      <div className="field">
        <label htmlFor="new-name">{fieldLabel}</label>
        <input
          ref={nameInput}
          id="new-name"
          className={newNameError ? 'input is-invalid' : 'input'}
          value={newName}
          placeholder={placeholder}
          onChange={(event) => {
            setNewName(event.target.value);
            setNewNameError(null);
          }}
          aria-invalid={newNameError ? true : undefined}
          aria-describedby={newNameError ? 'new-name-error' : undefined}
          autoComplete="off"
        />
        {newNameError && (
          <span className="field-error" id="new-name-error">
            {newNameError}
          </span>
        )}
      </div>
      <button type="submit" className={`btn ${buttonClass}`} disabled={adding}>
        {adding && <span className="spinner" aria-hidden="true" />}
        {label}
      </button>
    </form>
  );

  return (
    <div className="stack-lg">
      <div className="page-head">
        <div className="stack stack-sm">
          <h1>Components</h1>
          <p className="text-muted">
            {isLead
              ? 'Reporters choose a component from this list when they log a defect. Retired components stay on existing defects.'
              : 'Only Leads can change the component list. You can view it here.'}
          </p>
        </div>
        {isLead && components.length > 0 && (
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => nameInput.current?.focus()}
          >
            Add component
          </button>
        )}
      </div>

      {alert && (
        <div className="alert alert-danger cluster" role="alert">
          <span>{alert}</span>
          <button type="button" className="btn btn-ghost btn-sm" onClick={() => setAlert(null)}>
            Dismiss
          </button>
        </div>
      )}

      {components.length === 0 ? (
        <div className="empty-state">
          <h3>No components yet</h3>
          {isLead ? (
            <>
              <p>
                Reporters can&apos;t log a defect until one is added. Name the first component, for
                example Billing.
              </p>
              {addForm('btn-primary', 'Add component', 'Component name', 'For example, Billing')}
            </>
          ) : (
            <p>A Lead needs to add the first component before reporters can log a defect.</p>
          )}
        </div>
      ) : (
        <>
          {isLead &&
            addForm('btn-secondary', 'Add', 'New component name', 'For example, Reports')}
          <ul className="comp-list" aria-label="Components">
            {components.map((component) => (
              <ComponentRow
                key={component.id}
                component={component}
                canEdit={isLead}
                rename={renaming?.id === component.id ? renaming : null}
                onStartRename={(c) => setRenaming({ id: c.id, value: c.name, error: null, saving: false })}
                onRenameChange={(value) => renaming && setRenaming({ ...renaming, value, error: null })}
                onRenameSave={saveRename}
                onRenameCancel={() => setRenaming(null)}
                onRetire={(c, trigger) => setRetiring({ component: c, trigger, pending: false })}
              />
            ))}
          </ul>
        </>
      )}

      {retiring && (
        <RetireConfirmModal
          component={retiring.component}
          pending={retiring.pending}
          returnFocusTo={retiring.trigger}
          onConfirm={confirmRetire}
          onCancel={() => setRetiring(null)}
        />
      )}

      <div className={toast ? 'toast is-open' : 'toast'} role="status">
        {toast}
      </div>
    </div>
  );
}
