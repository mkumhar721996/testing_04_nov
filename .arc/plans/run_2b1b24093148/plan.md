summary: |
  Give the Core API a reproducible, versioned schema workflow on one cloud-hosted PostgreSQL instance (single non-production environment, AWS per ADR-0009). The repo already has a minimal runner (services/api/src/database/migrate.ts, `pnpm migrate`, `schema_migrations` keyed by file name including `.sql`, one transaction per file with an advisory lock). This plan hardens it: a failure-safe ROLLBACK, a `latestVersion` function and `version` CLI command, a `002_tooling_proof` migration, and Terraform for exactly one RDS PostgreSQL instance plus a connectivity check and an instance-count check. No business tables are added. Tests are written first, against a real Postgres (throwaway database per test).
scope:
  - description: |
      Refactor the migration runner into testable functions and add a `version` command.
      ```ts
      // before
      export async function migrate(pool: Pool, dir = MIGRATIONS_DIR): Promise<string[]>
      // after
      export async function migrate(pool: Pool, dir = MIGRATIONS_DIR): Promise<string[]>   // same contract, returns file names applied this run
      export async function latestVersion(pool: Pool): Promise<string | null>            // highest name in schema_migrations, without ".sql"; null when none or table missing
      ```
      Version = migration file name without `.sql` (e.g. `002_tooling_proof`), because two existing files share the `001_` prefix. The CLI block takes a subcommand: no argument or `up` runs migrations; `version` prints `latestVersion` (or `none`) and exits 0. Add `"migrate:version": "tsx src/database/migrate.ts version"` to package.json scripts.
      Keep the per-file BEGIN/COMMIT plus advisory lock: Postgres DDL is transactional, so a file failing partway rolls back its DDL and its schema_migrations insert (AC6, AC7). Wrap the ROLLBACK in try/catch so a rollback failure cannot mask the migration error. Do not change how applied rows are keyed (`name` includes `.sql`), so existing environments keep working.
    files:
      - services/api/src/database/migrate.ts
      - services/api/package.json
    rationale: |
      AC3, AC6, AC7, AC8. Reuses the existing runner instead of adding a migration library.
  - description: |
      Add the tooling-proof migration:
      ```sql
      CREATE TABLE IF NOT EXISTS tooling_proof (
        id         smallint PRIMARY KEY,
        note       text NOT NULL,
        created_at timestamptz NOT NULL DEFAULT now()
      );
      ```
      No rows, no business columns.
    files:
      - services/api/migrations/002_tooling_proof.sql
    rationale: |
      AC4 names a "tooling-proof table" as the only non-tracking table. Sorts after the two existing 001_* files.
  - description: |
      Provision exactly one PostgreSQL instance for the single non-production environment as Terraform HCL under `infra/postgres/` (AWS RDS for PostgreSQL, one `aws_db_instance`, no replica, tagged with the environment; credentials via sensitive variables or a secrets manager, never committed; backup retention days exposed as a variable). Add a README with apply steps, how to put the connection string into `DATABASE_URL`, and the commands for the two checks. Add `services/api/scripts/check-db-connection.ts` (opens a pg Client with DATABASE_URL, runs `SELECT 1`, exits non-zero on failure) and `services/api/scripts/count-db-instances.ts` exporting `countInstances(describeOutput: unknown): number` over the JSON of `aws rds describe-db-instances` filtered to the environment tag; the script exits non-zero unless the count is exactly 1. Add `check:db` and `count:db-instances` scripts to package.json. Document the cloud `DATABASE_URL` in `.env.example`. Extend vitest `include` with `scripts/**/*.spec.ts`.
    files:
      - infra/postgres/main.tf
      - infra/postgres/variables.tf
      - infra/postgres/outputs.tf
      - infra/postgres/README.md
      - services/api/scripts/check-db-connection.ts
      - services/api/scripts/count-db-instances.ts
      - services/api/.env.example
      - services/api/vitest.config.ts
      - services/api/package.json
    rationale: |
      AC1 and AC5. A Glob for infra/** found no IaC in the repo (only .arc/plans files), and services/api/scripts/ does not exist yet, so both are new.
tests:
  - |
    AC2 (write first, expect red) in `services/api/src/database/migrate.spec.ts`. A helper runs `CREATE DATABASE` with a random name on the server of `DATABASE_URL` and drops it in afterEach. The suite uses `describe.skipIf(!process.env.DATABASE_URL)` so the default run stays green without a database. Compare the migrated schema to a committed snapshot of `information_schema.columns` (table, column, type, nullable, default) for the real `migrations/` dir:
    ```ts
    await migrate(pool);
    expect(await dumpSchema(pool)).toEqual(EXPECTED_SCHEMA);
    ```
  - |
    AC3: run twice, schema and tracking rows identical, second run applies nothing:
    ```ts
    await migrate(pool);
    const before = await dumpSchema(pool);
    expect(await migrate(pool)).toEqual([]);
    expect(await dumpSchema(pool)).toEqual(before);
    ```
  - |
    AC4: run a fixture dir `services/api/test/fixtures/migrations-proof/` holding only a copy of the tooling-proof migration, then list tables:
    ```ts
    await migrate(pool, FIXTURE_DIR);
    expect(await listTables(pool)).toEqual(['schema_migrations', 'tooling_proof']);
    ```
    A second assertion lists tables after the real dir and equals the committed snapshot (see the open question on AC4).
  - |
    AC6: fixture `test/fixtures/migrations-fail/` with `001_ok.sql` and `002_fails.sql` (creates a table, then a failing statement):
    ```ts
    await expect(migrate(pool, FAIL_DIR)).rejects.toThrow();
    expect(await dumpSchema(pool)).toEqual(schemaAfterOnly001);
    expect(await listTables(pool)).not.toContain('half_created');
    ```
  - |
    AC7: after the failed run above, and for an empty database:
    ```ts
    expect(await latestVersion(pool)).toBe('001_ok');
    expect(await latestVersion(emptyPool)).toBeNull();
    ```
  - |
    AC8: through the CLI so the printed output is what is tested (spawn `tsx src/database/migrate.ts version` with DATABASE_URL set to the throwaway database after migrating):
    ```ts
    expect(stdout.trim()).toBe('002_tooling_proof');
    ```
  - |
    AC1: `check-db-connection.ts` is run against the provisioned instance as a manual post-apply step, plus an env-guarded vitest case against DATABASE_URL:
    ```ts
    const res = await pool.query('SELECT 1 AS ok');
    expect(res.rows[0].ok).toBe(1);
    ```
  - |
    AC5: unit test in `services/api/scripts/count-db-instances.spec.ts` with canned describe-db-instances JSON:
    ```ts
    expect(countInstances({ DBInstances: [{ DBInstanceIdentifier: 'x' }] })).toBe(1);
    expect(countInstances({ DBInstances: [] })).toBe(0);
    ```
    The script run against the real environment must print 1.
  - |
    Narrow run form: `cd services/api && pnpm vitest run src/database/migrate.spec.ts scripts/count-db-instances.spec.ts`.
assumptions_or_open_questions:
  - |
    CONFIRMED by reviewer (AC4 on a proof-only fixture dir, AC2 on the real dir, existing tables stay; AWS RDS with Terraform and no replica accepted; backups, retention and reset stay out of scope for a later story). Conflict with AC4. `services/api/migrations/` already holds `001_defects.sql` and `001_accounts_and_cards.sql` from earlier stories, and `seeds/dev-dashboard.sql` depends on them. Against an empty database the real migrations yield more than only the tracking and tooling-proof tables. I do not plan deleting or rewriting merged migrations. AC4 is tested on a proof-only fixture directory, AC2 on the real directory. Reviewer: confirm, or say those earlier tables should move out of this environment.
  - |
    Cloud provider and provisioning tool are not stated in the item. ADR-0009 says AWS and ADR-0003 says PostgreSQL with a cross-region replica. I assumed AWS RDS with Terraform and no replica, since AC5 requires exactly one instance. Confirm tool, account, region and network access for the client in AC1.
  - |
    I cannot provision or verify cloud resources from this session. AC1 and AC5 are verified by the scripts after a human applies the Terraform; no plan step contacts the cloud.
  - |
    Deferred questions on backup frequency, retention of carts, orders and the retry queue, and demo reset are out of this story's scope. Assumption stated in the README: the database can be rebuilt from migrations alone (seeds belong to a later epic story). I use the RDS default automated backup with retention days as a variable until a product decision.
  - |
    DB-backed tests need a reachable Postgres via DATABASE_URL with CREATE DATABASE permission. They skip when unset. Point it at a local or CI Postgres, never the shared cloud instance.
  - |
    No UI in this item. I did not open the design prototype, and no UI steps are planned.
estimated_points: 5
package_dependencies: []
notes: |
  ### Data & rollout
  - **Existing data**: `002_tooling_proof.sql` creates a new empty table with IF NOT EXISTS; no existing rows are touched. The runner keeps keying schema_migrations by file name, so environments that applied the two 001_* files only run 002.
  - **Backfill / seed**: none. All SQL is idempotent and applied files are skipped. Seed data is a later epic story.
  - **Settings**: `DATABASE_URL` (already used by migrate.ts and database.module.ts; defaults to the local dev database when unset). Documented in services/api/.env.example. Terraform variables (instance class, backup retention, credentials) are documented in infra/postgres/README.md; secrets are never committed.
  - **Provisioning**: the single RDS instance from infra/postgres, applied by a human; needs AWS network and credentials first.
  - **Order and rollback**: provision, run `pnpm migrate`, then `pnpm migrate:version`. Migrations are forward-only; a failed migration rolls back automatically and 002_tooling_proof is safe to leave in place. The instance is removed with `terraform destroy` (non-production only).

  ### Design notes
  - Postgres DDL is transactional. The existing explicit BEGIN/COMMIT per file already gives AC6 atomicity; the tests prove it and the only code change there is the failure-safe ROLLBACK.
  - No migration library is added; the existing runner suffices.
  - vitest currently includes only `src/**/*.spec.ts`, so the scripts spec needs the include change.

  ```mermaid
  flowchart TD
    CLI[pnpm migrate / migrate:version] --> M[services/api/src/database/migrate.ts]
    M --> SQL[services/api/migrations/*.sql]
    M --> PG[(PostgreSQL instance)]
    DM[services/api/src/database/database.module.ts] --> PG
    TF[infra/postgres Terraform] --> PG
    CHK[services/api/scripts/check-db-connection.ts] --> PG
    T[migrate.spec.ts] --> M
    classDef touched fill:#f96,color:#000
    class M,SQL,TF,CHK,T touched
  ```
review_focus: |
  IN: runner hardening (latestVersion, version CLI, safe rollback), the 002_tooling_proof migration, one-instance Terraform, and the two check scripts. OUT: business tables, seed data, backups and retention policy, replica. Riskiest area is the AC4 conflict: existing migrations already create business tables, so AC4 is tested on a fixture directory by design. Version is the file name without .sql, not the numeric prefix, deliberately, because two files share 001_.
