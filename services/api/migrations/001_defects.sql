CREATE TABLE IF NOT EXISTS defects (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key         text NOT NULL UNIQUE,
  title       text NOT NULL,
  status      text NOT NULL DEFAULT 'New'
              CHECK (status IN ('New','Triaged','In progress','Resolved','Verified','Closed','Rejected')),
  owner_id    text,
  owner_name  text,
  row_version integer NOT NULL DEFAULT 1,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS defect_comments (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  defect_id   uuid NOT NULL REFERENCES defects(id),
  author_id   text NOT NULL,
  author_name text NOT NULL,
  body        text NOT NULL, -- plain text only; never interpreted as HTML
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS defect_comments_defect_idx ON defect_comments (defect_id, created_at);
