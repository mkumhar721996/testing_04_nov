CREATE TABLE components (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name       text NOT NULL CHECK (length(btrim(name)) BETWEEN 1 AND 80),
  status     text NOT NULL DEFAULT 'active' CHECK (status IN ('active','retired')),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX components_name_key ON components (lower(name));
