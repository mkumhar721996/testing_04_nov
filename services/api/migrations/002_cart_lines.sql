CREATE TABLE IF NOT EXISTS cart_lines (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id     text    NOT NULL,
  part_number  text    NOT NULL,
  description  text    NOT NULL,
  sap_instance text    NOT NULL,
  stock_shown  integer NOT NULL CHECK (stock_shown >= 0),
  quantity     integer NOT NULL CHECK (quantity >= 1),
  created_at   timestamptz NOT NULL DEFAULT now(),
  UNIQUE (owner_id, sap_instance, part_number)
);
CREATE INDEX IF NOT EXISTS cart_lines_owner_idx ON cart_lines (owner_id, created_at, id);
