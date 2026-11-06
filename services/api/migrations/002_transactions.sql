-- Money movement behind the Dashboard overview and recent transactions. Safe to re-run.
-- amount_minor is signed: positive is money in, negative is money out.
-- Only the last four digits of a card number are stored, never the full number.
CREATE TABLE IF NOT EXISTS transactions (
  id           bigserial   PRIMARY KEY,
  account_id   bigint      NOT NULL REFERENCES accounts (id),
  merchant     text        NOT NULL,
  occurred_at  timestamptz NOT NULL,
  status       text        NOT NULL CHECK (status IN ('in_progress', 'completed')),
  card_last4   char(4)     CHECK (card_last4 ~ '^[0-9]{4}$'),
  amount_minor bigint      NOT NULL
);

CREATE INDEX IF NOT EXISTS transactions_account_occurred_idx
  ON transactions (account_id, occurred_at DESC);
