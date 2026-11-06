import type { DefectComment } from '../../api/defects';
import { CommentForm } from './CommentForm';

const initials = (name: string) =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('');

// Reason comments are stored with a prefix; the badge replaces it on screen.
const REASON = /^(Rejected|Reopened): /;
const REASON_BADGE = { Rejected: 'Rejection reason', Reopened: 'Reopen reason' } as const;

const formatDateTime = (iso: string) =>
  new Date(iso).toLocaleString(undefined, {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

interface Props {
  comments: DefectComment[];
  viewerName: string;
  newCommentId: string | null;
  pending: boolean;
  formError: string | null;
  showForm: boolean;
  onPost: (text: string) => Promise<boolean>;
}

export function CommentsCard({
  comments,
  viewerName,
  newCommentId,
  pending,
  formError,
  showForm,
  onPost,
}: Props) {
  return (
    <section className="card stack" aria-labelledby="comments-title">
      <div className="stack-sm">
        <h2 id="comments-title">Comments ({comments.length})</h2>
        <p className="text-muted text-sm">Oldest first. Comments cannot be edited or deleted.</p>
      </div>
      {comments.length === 0 ? (
        <div className="empty-state">
          <h3>No comments yet</h3>
          <p>Use comments to record retests, questions and context so they stay with this defect.</p>
        </div>
      ) : (
        <ul className="thread" aria-label="Comments, oldest first">
          {comments.map((c) => {
            const reason = REASON.exec(c.body)?.[1] as keyof typeof REASON_BADGE | undefined;
            return (
              <li className={c.id === newCommentId ? 'comment is-new' : 'comment'} key={c.id}>
                <span className="avatar" aria-hidden="true">
                  {initials(c.authorName)}
                </span>
                <div className="comment-meta">
                  <strong>{c.authorName}</strong>
                  <time dateTime={c.createdAt} className="text-muted text-sm">
                    {formatDateTime(c.createdAt)}
                  </time>
                  {reason && <span className="badge">{REASON_BADGE[reason]}</span>}
                </div>
                {/* Plain text only: a React text child, shown with line breaks and no markup. */}
                <p className="comment-body">{reason ? c.body.replace(REASON, '') : c.body}</p>
              </li>
            );
          })}
        </ul>
      )}
      {showForm && (
        <>
          <hr className="divider" />
          <CommentForm
            viewerName={viewerName}
            pending={pending}
            formError={formError}
            onSubmit={onPost}
          />
        </>
      )}
    </section>
  );
}
