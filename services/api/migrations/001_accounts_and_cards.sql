-- Accounts and cards behind the Dashboard. Safe to re-run.
-- Only the last four digits of a card number are stored, never the full number.
CREATE TABLE IF NOT EXISTS accounts (
  id            bigserial PRIMARY KEY,
  owner_subject text    NOT NULL UNIQUE,
  display_name  text    NOT NULL,
  balance_minor bigint  NOT NULL,
  currency      char(3) NOT NULL
);

CREATE TABLE IF NOT EXISTS cards (
  id            bigserial PRIMARY KEY,
  account_id    bigint   NOT NULL REFERENCES accounts (id),
  number_last4  char(4)  NOT NULL CHECK (number_last4 ~ '^[0-9]{4}$'),
  expiry_month  smallint NOT NULL CHECK (expiry_month BETWEEN 1 AND 12),
  expiry_year   smallint NOT NULL
);
