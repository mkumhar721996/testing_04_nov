CREATE TABLE IF NOT EXISTS app_users (
  id   text PRIMARY KEY,
  name text NOT NULL,
  role text NOT NULL CHECK (role IN ('Developer','Tester','Lead'))
);
