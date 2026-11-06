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

-- Sample transactions, dated relative to now so the latest list is always recent, plus one
-- movement in the previous year so the overview has a trend to show.
INSERT INTO transactions (account_id, merchant, occurred_at, status, card_last4, amount_minor)
SELECT a.id, s.merchant, s.occurred_at, s.status, s.card_last4, s.amount_minor
  FROM accounts a
 CROSS JOIN (VALUES
   ('Adobe Creative Cloud',       now() - interval '1 hour',   'in_progress', '2841',   -5999),
   ('Northwind Logistics salary', now() - interval '1 day',    'completed',   '9286',  245000),
   ('Fresh Market',               now() - interval '20 hours', 'completed',   '9286',   -8432),
   ('Transfer from savings',      now() - interval '3 days',   'completed',   '9286',   30000),
   ('Blue Door Café',             now() - interval '4 days',   'completed',   '2841',   -1240),
   ('Opening deposit',            now() - interval '1 year',   'completed',   NULL,    180000)
 ) AS s (merchant, occurred_at, status, card_last4, amount_minor)
 WHERE a.owner_subject = 'dev-user'
   AND NOT EXISTS (SELECT 1 FROM transactions t WHERE t.account_id = a.id);
