import { KeyboardEvent, useEffect, useId, useRef } from 'react';
import { ComponentItem } from '../api/client';

interface RetireConfirmModalProps {
  component: ComponentItem;
  pending: boolean;
  returnFocusTo: HTMLElement | null;
  onConfirm: () => void;
  onCancel: () => void;
}

// Retire is irreversible, so it sits behind this confirmation. Escape and a
// backdrop click cancel, focus stays inside, and it returns to the Retire button on close.
export function RetireConfirmModal({
  component,
  pending,
  returnFocusTo,
  onConfirm,
  onCancel,
}: RetireConfirmModalProps) {
  const titleId = useId();
  const cancelRef = useRef<HTMLButtonElement>(null);
  const confirmRef = useRef<HTMLButtonElement>(null);
  const cancelHandler = useRef(onCancel);
  cancelHandler.current = pending ? () => undefined : onCancel;

  useEffect(() => {
    cancelRef.current?.focus();
    const onKeyDown = (event: globalThis.KeyboardEvent) => {
      if (event.key === 'Escape') cancelHandler.current();
    };
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      returnFocusTo?.focus();
    };
  }, [returnFocusTo]);

  function trapTab(event: KeyboardEvent) {
    if (event.key !== 'Tab') return;
    const first = cancelRef.current;
    const last = confirmRef.current?.disabled ? first : confirmRef.current;
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last?.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first?.focus();
    }
  }

  return (
    <>
      <div className="backdrop is-open" onClick={() => cancelHandler.current()} />
      <div
        className="modal is-open stack"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        onKeyDown={trapTab}
      >
        <h2 id={titleId}>{`Retire ${component.name}?`}</h2>
        <p>
          {`${component.name} will no longer be offered to reporters. Defects that already use it keep showing it. This can't be undone.`}
        </p>
        <div className="cluster">
          <button
            ref={cancelRef}
            type="button"
            className="btn btn-secondary"
            onClick={onCancel}
            disabled={pending}
          >
            Cancel
          </button>
          <button
            ref={confirmRef}
            type="button"
            className="btn btn-danger"
            onClick={onConfirm}
            disabled={pending}
          >
            {pending && <span className="spinner" aria-hidden="true" />}
            Retire component
          </button>
        </div>
      </div>
    </>
  );
}
