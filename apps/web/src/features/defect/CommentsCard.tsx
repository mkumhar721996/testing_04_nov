import type { DefectComment } from '../../api/defects';

const initials = (name: string) =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('');

const isReason = (body: string) => /^(Rejected|Reopened): /.test(body);

const formatDate = (iso: string) =>
  new Date(iso).toLocaleDateString(undefined, { day: 'numeric', month: 'short' });

export function CommentsCard({ comments }: { comments: DefectComment[] }) {
  return (
    <section className="card stack-sm" aria-labelledby="comments-title">
      <h2 id="comments-title">Comments</h2>
      {comments.length === 0 ? (
        <p className="text-muted">No comments yet.</p>
      ) : (
        comments.map((c) => (
          <div className="comment" key={c.id}>
            <span className="avatar" aria-hidden="true">
              {initials(c.authorName)}
            </span>
            <div>
              <p>
                <strong>{c.authorName}</strong>{' '}
                <span className="text-muted text-sm">{formatDate(c.createdAt)}</span>
              </p>
              {/* Plain text only: a React text child, shown with line breaks and no markup. */}
              <p className={isReason(c.body) ? 'comment-reason comment-body' : 'comment-body'}>
                {c.body}
              </p>
            </div>
          </div>
        ))
      )}
    </section>
  );
}
