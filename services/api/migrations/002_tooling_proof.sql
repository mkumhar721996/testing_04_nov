CREATE TABLE IF NOT EXISTS tooling_proof (
  id         integer PRIMARY KEY,
  note       text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
