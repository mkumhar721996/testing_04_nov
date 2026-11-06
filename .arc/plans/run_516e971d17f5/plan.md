summary: |
  Give the Core API a reproducible, versioned schema workflow on one cloud-hosted PostgreSQL instance (single non-production environment, AWS per ADR-0009). The repo already has a minimal runner (`services/api/src/database/migrate.ts`, `pnpm migrate`, `schema_migrations` keyed by file name, one transaction per file). This plan hardens it into the tooling the ACs describe: a pure-ish `migrate` that is idempotent and atomic, a `version` command that prints the latest applied migration, a `tooling_proof` table migration, and infrastructure-as-code for exactly one PostgreSQL instance plus a connectivity/instance-count check. No business tables are added. Tests are written first, against a real Postgres (throwaway database per test).
scope:
  - description: |
      Refactor the migration runner into testable functions and add a `version` command.
      Signatures (before -> after):
      ```ts
      // before
      export async function migrate(pool: Pool, dir = MIGRATIONS_DIR): Promise<string[]>
      // after
      export async function migrate(pool: Pool, dir = MIGRATIONS_DIR): Promise<string[]>   // same contract, still returns names applied this run
      export async function latestVersion(pool: Pool): Promise<string | null>            // latest applied migration name without ".sql", null when none
      ```
      Version = migration file name without `.sql` (e.g. `002_tooling_proof`), because two existing files share the `001_` prefix. "Latest" = highest name in sort order among rows in `schema_migrations`. The CLI block at the bottom of the file takes a subcommand: `tsx src/database/migrate.ts` (or `up`) runs migrations; `tsx src/database/migrate.ts version` prints `latestVersion` (or `none`) and exits 0. Add `"migrate:version": "tsx src/database/migrate.ts version"` to package.json scripts.
      Keep the existing per-file `BEGIN ... COMMIT` plus advisory lock: Postgres DDL is transactional, so a file failing partway rolls back its DDL and its `schema_migrations` insert (AC6, AC7). Make sure the ROLLBACK itself cannot mask the original error (wrap it so the migration error is the one thrown). Do not change how already-applied rows are keyed (name), so existing environments keep working.
    files:
      - services/api/src/database/migrate.ts
      - services/api/package.json
    rationale: |
      AC3, AC6, AC7, AC8. Reuses the existing runner instead of adding a migration library.
  - description: |
      Add the tooling-proof migration `services/api/migrations/002_tooling_proof.sql`:
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
      AC4 names a "tooling-proof table" as the only non-tracking table. Sorts after the two existing `001_*` files.
  - description: |
      Provision exactly one PostgreSQL instance for the single non-production environment as Terraform HCL under `infra/postgres/` (AWS RDS for PostgreSQL, one `aws_db_instance`, no replica in this environment; credentials via a secrets manager or sensitive variables, never committed). Add `infra/postgres/README.md` with the apply steps, how to read the connection string into `DATABASE_URL`, and the commands for the two checks in `scripts/`. Add `scripts/check-db-connection.ts` (opens a `pg` Client with `DATABASE_URL`, runs `SELECT 1`, exits non-zero on failure) and `scripts/count-db-instances.ts`, whose parsing function `countInstances(describeOutput: unknown): number` takes the JSON of `aws rds describe-db-instances` filtered to the environment tag; it exits non-zero unless the count is exactly 1. Document `DATABASE_URL` for the cloud instance in `services/api/.env.example`.
    files:
      - infra/postgres/main.tf
      - infra/postgres/variables.tf
      - infra/postgres/outputs.tf
      - infra/postgres/README.md
      - services/api/scripts/check-db-connection.ts
      - services/api/scripts/count-db-instances.ts
      - services/api/.env.example
    rationale: |
      AC1 and AC5. No IaC exists in the repo today (searched for Dockerfile, docker-compose, infra/, .github/ with Glob and found none), so this is the first.
tests:
  - |
    AC2 (write first, expect red) in `services/api/src/database/migrate.spec.ts`, using a helper that runs `CREATE DATABASE` with a random name from `DATABASE_URL`'s server and drops it in `afterEach`; the suite uses `describe.skipIf(!process.env.DATABASE_URL)` so the unit run stays green without a database, and CI/dev set `DATABASE_URL`. Compare the migrated schema to a committed snapshot of `information_schema.columns` (table, column, type, nullable, default) for the real `migrations/` dir:
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
    AC4: run a fixture directory `services/api/test/fixtures/migrations-proof/` containing only a copy of the tooling-proof migration, then list tables:
    ```ts
    await migrate(pool, FIXTURE_DIR);
    expect(await listTables(pool)).toEqual(['schema_migrations', 'tooling_proof']);
    ```
    A second assertion lists the tables after the real `migrations/` dir and equals the committed snapshot. See the first open question: the real dir already holds defects/accounts/cards tables from earlier stories, so the literal AC cannot hold for it.
  - |
    AC6: fixture `test/fixtures/migrations-fail/` with `001_ok.sql` and `002_fails.sql` (creates a table, then a statement that errors):
    ```ts
    await expect(migrate(pool, FAIL_DIR)).rejects.toThrow();
    expect(await dumpSchema(pool)).toEqual(schemaAfterOnly001);
    ```
    Also assert the half-created table from `002_fails.sql` does not exist.
  - |
    AC7: after the failed run above:
    ```ts
    expect(await latestVersion(pool)).toBe('001_ok');
    ```
    and for an empty database `expect(await latestVersion(pool)).toBeNull()`.
  - |
    AC8: through the CLI so the printed output is what is tested (spawn `tsx src/database/migrate.ts version` with `DATABASE_URL` set to the throwaway database):
    ```ts
    expect(stdout.trim()).toBe('002_tooling_proof');
    ```
  - |
    AC1: `services/api/scripts/check-db-connection.ts` is run against the provisioned instance as a manual/CI post-apply step, with an env-guarded vitest case that does the same against `DATABASE_URL`:
    ```ts
    const res = await pool.query('SELECT 1 AS ok');
    expect(res.rows[0].ok).toBe(1);
    ```
  - |
    AC5: unit test in `services/api/scripts/count-db-instances.spec.ts` (add that path to vitest `include`) with canned `describe-db-instances` JSON:
    ```ts
    expect(countInstances({ DBInstances: [{ DBInstanceIdentifier: 'x' }] })).toBe(1);
    expect(countInstances({ DBInstances: [] })).toBe(0);
    ```
    The script run against the real environment must print 1.
assumptions_or_open_questions:
  - |
    Conflict with AC4. `services/api/migrations/` already contains `001_defects.sql` (defects, defect_comments) and `001_accounts_and_cards.sql` (accounts, cards), merged in earlier stories, and `seeds/dev-dashboard.sql` depends on them. Run against an empty database, the real migrations therefore yield more than "only the migration-tracking table and the tooling-proof table". I have not planned deleting or rewriting merged migrations. AC4 is tested against a proof-only fixture directory, and AC2 against the real directory. Reviewer: confirm this reading, or say if those earlier tables should be moved out of this environment.
  - |
    Cloud provider and provisioning tool are not stated in the item. ADR-0009 says AWS containers, and ADR-0003 says PostgreSQL, single tenant, with a cross-region replica. I assumed AWS RDS with Terraform HCL (no npm dependency) and no replica for this single non-production environment, since AC5 requires exactly one instance. Confirm the tool (Terraform vs CDK vs another), account, region and network access for the client in AC1.
  - |
    I cannot run or verify provisioning from this session. AC1 and AC5 are verified by the scripts after a human applies the Terraform; the plan includes no step that contacts the cloud.
  - |
    Deferred question on retention, backup and reset of POC data, and the epic question on backup frequency: not decided by the item, and out of this story's scope (instance plus migration tooling only). Assumption stated in `infra/postgres/README.md`: the database can be rebuilt from migrations alone (seeds belong to a later story in the epic); backup frequency and the retention of carts, orders and the retry queue need a product decision. I will use the RDS default automated backup setting, with the retention days exposed as a variable, until told otherwise.
  - |
    DB-backed tests need a reachable Postgres via `DATABASE_URL` with permission to `CREATE DATABASE`. They are skipped when unset, so the default `pnpm test` stays green without a database. Point `DATABASE_URL` at a local or CI Postgres, never at the shared cloud instance.
  - |
    The design prototype is not applicable: this item has no UI. I did not open it, and no UI steps are planned.
estimated_points: 5
package_dependencies: []
notes: |
  ### Data & rollout
  - **Existing data**: `002_tooling_proof.sql` only creates a new empty table with `IF NOT EXISTS`; no existing rows are touched. The runner keeps keying `schema_migrations` by file name, so environments that already applied the two `001_*` files see them as applied and only run `002`.
  - **Backfill / seed**: none needed. All SQL is idempotent (`IF NOT EXISTS`) and the runner skips applied files, so re-running is safe. Seed data is a later story in the epic.
  - **Settings**: `DATABASE_URL` (already used by `database.module.ts` and `migrate.ts`; default is the local dev database, so it is safe when unset). Documented in `services/api/.env.example`. Terraform variables (instance class, backup retention, credentials) are documented in `infra/postgres/README.md`; secrets are not committed.
  - **Provisioning**: the single RDS instance, created by `infra/postgres` (applied by a human). Nothing else must exist first apart from AWS network and credentials.
  - **Order and rollback**: provision the instance, run `pnpm migrate`, then check with `pnpm migrate:version`. Rollback: migrations are forward-only. A failed migration rolls back automatically, and `002_tooling_proof` is safe to leave in place (empty table). The instance is removed with `terraform destroy` (non-production only).

  ### Design notes
  - Postgres DDL is transactional, and `pg` runs a multi-statement string sent through `client.query(text)` without parameters as one implicit transaction. The existing explicit `BEGIN`/`COMMIT` per file already gives the atomicity of AC6. The new tests prove it, and the only code change there is making `ROLLBACK` failure-safe.
  - No migration library is added: the existing runner is enough, and the stack lists no other tool.

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
  IN: runner hardening (`latestVersion`, `version` CLI, safe rollback), the `002_tooling_proof` migration, one-instance Terraform, and the check scripts. OUT: business tables, seed data, backups and retention policy, replica. Riskiest area is the AC4 conflict, since existing migrations already create business tables, so AC4 is tested on a fixture directory by design. Version is the file name, not the numeric prefix, deliberately, because two files share `001_`.
