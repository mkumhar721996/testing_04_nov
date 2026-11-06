-- DEVELOPMENT ONLY: sample data for a local database, applied by hand with psql.
-- Never referenced by the migration, the Dockerfile or any deploy step. Safe to re-run.
INSERT INTO accounts (owner_subject, display_name, balance_minor, currency)
VALUES ('dev-user', 'Ada Lovelace', 1268042, 'USD')
ON CONFLICT (owner_subject) DO NOTHING;

INSERT INTO cards (account_id, number_last4, expiry_month, expiry_year)
SELECT a.id, '9286', 8, 2032
  FROM accounts a
 WHERE a.owner_subject = 'dev-user'
   AND NOT EXISTS (SELECT 1 FROM cards c WHERE c.account_id = a.id);
