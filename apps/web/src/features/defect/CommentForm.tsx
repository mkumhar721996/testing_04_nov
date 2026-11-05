import { useEffect, useId, useRef, useState } from 'react';

const EMPTY_ERROR = 'Comment cannot be empty. Enter some text, then post again.';

interface Props {
  viewerName: string;
  pending: boolean;
  /** Message from a refused or failed post, shown in the alert summary. */
  formError: string | null;
  /** Resolves true when the comment was saved, so the text can be cleared. */
  onSubmit: (text: string) => Promise<boolean>;
}

export function CommentForm({ viewerName, pending, formError, onSubmit }: Props) {
  const uid = useId();
  const [text, setText] = useState('');
  const [blank, setBlank] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const alertRef = useRef<HTMLDivElement>(null);

  const summary = blank ? 'Your comment was not posted. Write something before posting.' : formError;
  const showSummary = summary !== null && !dismissed;

  useEffect(() => {
    setDismissed(false);
  }, [formError]);

  useEffect(() => {
    if (showSummary) alertRef.current?.focus();
  }, [showSummary, summary]);

  const submit = async () => {
    if (!text.trim()) {
      setBlank(true);
      setDismissed(false);
      return;
    }
    setBlank(false);
    if (await onSubmit(text)) setText('');
  };

  return (
    <form
      className="stack-sm"
      noValidate
      onSubmit={(e) => {
        e.preventDefault();
        void submit();
      }}
    >
      {showSummary && (
        <div className="alert alert-danger" role="alert" tabIndex={-1} ref={alertRef}>
          {summary}
        </div>
      )}
      <div className="field">
        <label htmlFor={`${uid}-text`}>Add a comment</label>
        <textarea
          id={`${uid}-text`}
          className={blank ? 'textarea is-invalid' : 'textarea'}
          rows={3}
          placeholder="For example: Retest on Chrome 120"
          value={text}
          maxLength={2000}
          disabled={pending}
          aria-invalid={blank || undefined}
          aria-describedby={`${uid}-hint${blank ? ` ${uid}-error` : ''}`}
          onChange={(e) => {
            setText(e.target.value);
            setBlank(false);
            setDismissed(true);
          }}
        />
        <span className="field-hint" id={`${uid}-hint`}>
          Posting as {viewerName}. The date and time are added for you.
        </span>
        {blank && (
          <p className="field-error" id={`${uid}-error`}>
            {EMPTY_ERROR}
          </p>
        )}
      </div>
      <div className="composer-actions">
        <button className="btn btn-primary" type="submit" disabled={pending}>
          {pending ? (
            <>
              <span className="spinner" aria-hidden="true" /> Posting…
            </>
          ) : (
            'Post comment'
          )}
        </button>
      </div>
    </form>
  );
}
