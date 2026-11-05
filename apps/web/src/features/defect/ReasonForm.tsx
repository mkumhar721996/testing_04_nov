import { useId, useState } from 'react';

export type ReasonKind = 'reject' | 'reopen';

const COPY: Record<
  ReasonKind,
  {
    title: string;
    hint: string;
    example: string;
    placeholder: string;
    error: string;
    pending: string;
  }
> = {
  reject: {
    title: 'Reject defect',
    hint: 'Rejection is final. A reason is required and is saved as a comment.',
    example: 'For example: Duplicate of DEF-12.',
    placeholder: 'Why is this defect rejected?',
    error: 'Enter a reason to reject this defect. The defect stays Triaged.',
    pending: 'Rejecting…',
  },
  reopen: {
    title: 'Reopen defect',
    hint: 'A reason is required and is saved as a comment. The defect moves to Triaged.',
    example: 'For example: Regression in 2.3.',
    placeholder: 'Why is this defect reopened?',
    error: 'Enter a reason to reopen this defect. The defect stays Closed.',
    pending: 'Reopening…',
  },
};

interface Props {
  kind: ReasonKind;
  pending: boolean;
  onSubmit: (reason: string) => void;
  onCancel: () => void;
}

export function ReasonForm({ kind, pending, onSubmit, onCancel }: Props) {
  const copy = COPY[kind];
  const uid = useId();
  const [reason, setReason] = useState('');
  const [invalid, setInvalid] = useState(false);

  const submit = () => {
    const trimmed = reason.trim();
    if (!trimmed) {
      setInvalid(true);
      return;
    }
    setInvalid(false);
    onSubmit(trimmed);
  };

  return (
    <section className="card stack-sm" aria-labelledby={`${uid}-title`}>
      <h2 id={`${uid}-title`}>{copy.title}</h2>
      <p className="text-muted text-sm">{copy.hint}</p>
      <div className="field">
        <label htmlFor={`${uid}-reason`}>Reason</label>
        <textarea
          id={`${uid}-reason`}
          className={invalid ? 'textarea is-invalid' : 'textarea'}
          rows={4}
          placeholder={copy.placeholder}
          value={reason}
          maxLength={2000}
          aria-invalid={invalid || undefined}
          aria-describedby={invalid ? `${uid}-error` : undefined}
          onChange={(e) => setReason(e.target.value)}
        />
        {invalid ? (
          <p className="field-error" id={`${uid}-error`} role="alert">
            {copy.error}
          </p>
        ) : (
          <span className="field-hint">{copy.example}</span>
        )}
      </div>
      <div className="actions">
        <button className="btn btn-secondary" type="button" onClick={onCancel} disabled={pending}>
          Cancel
        </button>
        <button className="btn btn-primary" type="button" onClick={submit} disabled={pending}>
          {pending ? (
            <>
              <span className="spinner" aria-hidden="true" /> {copy.pending}
            </>
          ) : (
            copy.title
          )}
        </button>
      </div>
    </section>
  );
}
