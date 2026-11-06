summary: |
  Provision one cloud-hosted (AWS RDS PostgreSQL, per ADR-0009) non-production instance for the Transient Data Layer and harden the migration tooling that already exists in `services/api` (`src/database/migrate.ts`, a `schema_migrations` table, a `pnpm migrate` script, `migrations/001_defects.sql`). The runner already applies `.sql` files once each, in name order, one transaction per file. This story adds what is missing: a versioned reading of those files (version = numeric filename prefix), a `version` command that prints the latest applied version, a `tooling_proof` table delivered by a migration (the only business-free table), a connectivity check, and the infra definition for exactly one instance. Failure atomicity, idempotence and schema equality are pinned by tests against a real throwaway Postgres database. No new packages; no business tables.
scope:
  - description: |
      Extend the migration runner with versions. Keep `migrate(pool, dir)` and the `schema_migrations(name, applied_at)` table unchanged for existing databases. Add:

      ```ts
      export function versionOf(file: string): string;            // '002_tooling_proof.sql' -> '002'; throws on a name without a numeric prefix
      export async function currentVersion(pool: Pool): Promise<string | null>; // newest applied version, null when none
      export async function dumpSchema(pool: Pool): Promise<SchemaDump>;       // tables, columns, types, nullability, defaults, constraints, indexes in public (excluding schema_migrations ordering noise)
      ```

      `migrate` validates up front that every file has a numeric prefix and that no two files share a version (fail before touching the database). The CLI gains a subcommand: `pnpm migrate` applies, `pnpm migrate version` prints the latest applied version (or `none`) and exits 0. Each file still runs inside its own BEGIN/COMMIT, so a failure rolls the whole file back and leaves earlier files committed. Document in a comment that statements which cannot run in a transaction (for example CREATE INDEX CONCURRENTLY) are not allowed in migrations.
    files:
      - services/api/src/database/migrate.ts
    rationale: |
      Covers ACs 2, 3, 6, 7, 8. The transaction-per-file behaviour already gives AC6 and AC7, so the work is making the version observable and locking the behaviour with tests, not rewriting the runner.
  - description: |
      Add the tooling-proof migration `002_tooling_proof.sql` (numbered after the existing 001 so databases that already applied 001 simply apply 002 next):

      ```sql
      CREATE TABLE IF NOT EXISTS tooling_proof (
        id         integer PRIMARY KEY,
        note       text NOT NULL,
        created_at timestamptz NOT NULL DEFAULT now()
      );
      ```

      Add `services/api/migrations/expected-schema.json`, the committed dump of the schema produced by the current migrations; AC2 compares a freshly migrated database to it. Add a package script `"migrate:version": "tsx src/database/migrate.ts version"` and `"db:check": "tsx src/database/check.ts"`.
    files:
      - services/api/migrations/002_tooling_proof.sql
      - services/api/migrations/expected-schema.json
      - services/api/package.json
    rationale: |
      Covers ACs 2 and 4. The expected-schema file turns "matches the current schema" into a diffable artifact that changes in the same PR as any migration.
  - description: |
      Connectivity check used against the provisioned instance:

      ```ts
      export async function checkConnection(pool: Pool): Promise<void>; // runs SELECT 1, rejects on failure
      ```

      `check.ts` reads `DATABASE_URL`, calls it, prints `connected` and exits 0, or prints the error and exits 1. Production code must not log the connection string.
    files:
      - services/api/src/database/check.ts
    rationale: Covers AC1 in a form that runs identically against local Postgres and the cloud instance.
  - description: |
      Infrastructure definition for exactly one non-production PostgreSQL instance in us-east-1 (single `aws_db_instance`, private subnet group, security group limited to the Core API and Background Worker, credentials from a managed secret, automated backups on, no cross-region replica in this story). Files live in `infra/db/`. `infra/db/README.md` documents the provision, connect (`DATABASE_URL`), migrate (`pnpm migrate`) and rebuild-from-scratch steps. Provisioning itself is run by the human operator, not by the implementing agent.
    files:
      - infra/db/main.tf
      - infra/db/variables.tf
      - infra/db/outputs.tf
      - infra/db/README.md
    rationale: |
      Covers ACs 1 and 5. The repo has no IaC today (I looked for infra, terraform, deploy and .github and found nothing), and the stack lists no IaC tool, so Terraform is a proposal that needs a human decision (see open questions).
  - description: |
      Wire the Playwright e2e run for database tests: these tests create and drop a uniquely named scratch database through `DATABASE_ADMIN_URL` (falls back to `DATABASE_URL`), so they never touch the shared database's schema. Document `DATABASE_URL`, `DATABASE_ADMIN_URL` in `infra/db/README.md`.
    files:
      - services/api/test/e2e/support/scratch-db.ts
    rationale: Tests need real Postgres transactional DDL; the repo's existing real-database tests already live in `test/e2e` (status-moves.spec.ts), so this follows that convention.
tests:
  - |
    AC1 (write first). `services/api/test/e2e/migrations.spec.ts`: connect to `DATABASE_URL` and assert it works.
    ```ts
    test('client can connect', async () => {
      const pool = new Pool({ connectionString: process.env.DATABASE_URL });
      await expect(checkConnection(pool)).resolves.toBeUndefined();
      await pool.end();
    });
    ```
    Post-provision: run `cd services/api && pnpm db:check` with the cloud `DATABASE_URL` and expect `connected`.
  - |
    AC2. Same file, scratch empty database:
    ```ts
    await migrate(pool);
    expect(await dumpSchema(pool)).toEqual(expectedSchema); // JSON read from migrations/expected-schema.json
    ```
  - |
    AC3. Run twice and compare dumps and applied list:
    ```ts
    await migrate(pool);
    const before = await dumpSchema(pool);
    expect(await migrate(pool)).toEqual([]);
    expect(await dumpSchema(pool)).toEqual(before);
    ```
  - |
    AC4. Table listing of a database migrated from a fixture directory that holds only the tooling-proof migration (the real `migrations/` also contains the defects tables, see open questions):
    ```ts
    const { rows } = await pool.query("SELECT tablename FROM pg_tables WHERE schemaname = 'public' ORDER BY 1");
    expect(rows.map((r) => r.tablename)).toEqual(['schema_migrations', 'tooling_proof']);
    ```
    Also assert that on the real directory the set of tables equals `['defect_comments','defects','schema_migrations','tooling_proof']`, so any extra table needs a deliberate edit.
  - |
    AC5 (unit, `services/api/src/database/infra.spec.ts`, runs in `pnpm test` without a database): read `infra/db/main.tf` and assert it declares exactly one instance.
    ```ts
    const tf = readFileSync(join(__dirname, '../../../../infra/db/main.tf'), 'utf8');
    expect(tf.match(/resource\s+"aws_db_instance"/g)).toHaveLength(1);
    ```
    Post-provision: `aws rds describe-db-instances --region us-east-1 --query 'length(DBInstances)'` prints 1 for the non-production account.
  - |
    AC6. Fixture directory with `001_ok.sql` (creates table a) and `002_bad.sql` (`CREATE TABLE b (id int); SELECT 1/0;`):
    ```ts
    const before = await dumpSchema(pool);          // after applying only 001
    await expect(migrate(pool, badDir)).rejects.toThrow();
    expect(await dumpSchema(pool)).toEqual(before);  // table b does not exist
    ```
  - |
    AC7. Same fixture:
    ```ts
    await expect(migrate(pool, badDir)).rejects.toThrow();
    expect(await currentVersion(pool)).toBe('001');
    ```
    And a pure unit test in `services/api/src/database/migrate.spec.ts`: `expect(versionOf('002_tooling_proof.sql')).toBe('002')` and `expect(() => versionOf('tooling.sql')).toThrow()`; duplicate versions in a directory make `migrate` reject before any query.
  - |
    AC8. After `migrate(pool)` on the real directory: `expect(await currentVersion(pool)).toBe('002')`. CLI check: `pnpm migrate:version` prints `002`; on an empty database it prints `none`.
  - |
    Existing-data test (the migration adds tables to databases that already hold 001): apply only 001, insert a defect row, run `migrate(pool)` and assert the row is still selectable and `tooling_proof` now exists.
  - |
    Narrow commands. Unit: `cd services/api && pnpm vitest run src/database/migrate.spec.ts src/database/infra.spec.ts`. Database: `cd services/api && DATABASE_ADMIN_URL=postgresql://... pnpm playwright test test/e2e/migrations.spec.ts`. The configured full command (worker, api, web unit tests) does not run Playwright, so the real-database tests run only through `pnpm e2e`.
assumptions_or_open_questions:
  - |
    Conflict with AC4. The merged migration `001_defects.sql` (from the defect status story) creates `defects` and `defect_comments`, so a database migrated with "the current migrations" will list four tables, not two. The plan tests AC4 against a fixture directory holding only the tooling-proof migration and asserts the real four-table set separately. Reviewer decision needed: accept this, or reword AC4 to "no tables beyond migration-tracking, tooling-proof and tables from other stories".
  - |
    Infrastructure tool. No IaC exists in the repo and the confirmed stack names none. The plan proposes Terraform in `infra/db/` for AWS RDS PostgreSQL. Confirm Terraform (or name another tool such as CDK) before implementation. The instance size, engine version and VPC/subnet ids are inputs the plan cannot determine.
  - |
    AC1 and AC5 on the real cloud instance cannot be verified by the implementing agent or by the repo's test command; they need a human to provision and run `pnpm db:check` and the `aws rds describe-db-instances` command. The repo-level tests only prove the connectivity helper and that the Terraform file declares one instance.
  - |
    Deferred question on POC data retention, backup and reset. Proposed default, needs owner confirmation: RDS automated backups with 7-day retention for the non-production instance, and the database is rebuildable from migrations alone today (seed data belongs to a later story in the epic). Retention for carts, orders and the retry queue is not decided here because those tables do not exist yet.
  - |
    ADR-0003 and ADR-0009 describe a cross-region replica (us-west-2). This story is a single non-production environment and does not create a replica, per the item's scope.
  - |
    Version format assumption. A migration's version is the numeric prefix of its filename (`002`), and "latest" is the highest by name order. The `schema_migrations.name` column is kept so databases that applied 001 need no data change.
estimated_points: 5
package_dependencies: []
notes: |
  ### Data & rollout

  - **Existing data**: `002_tooling_proof.sql` only creates a new table with `IF NOT EXISTS`; it changes no existing rows, adds no constraint to existing tables, and leaves `schema_migrations` and `defects` data untouched. A database that already applied `001_defects.sql` applies only 002 on the next run.
  - **Backfill / seed**: none needed. `tooling_proof` stays empty. Seed data (distributors, roles and so on) is a separate story in the epic. The runner is idempotent and safe to re-run (each file is recorded in `schema_migrations` and guarded by an advisory lock).
  - **Settings**: `DATABASE_URL` already exists (default `postgresql://postgres:postgres@localhost:5432/core_api` in `services/api/src/database/database.module.ts`). New: `DATABASE_ADMIN_URL`, used only by tests to create scratch databases; unset falls back to `DATABASE_URL`. Both documented in `infra/db/README.md`. Credentials come from a managed secret, never committed.
  - **Provisioning**: the RDS instance, its subnet group and security group, created from `infra/db/` by a human operator; the application role and database must exist before `pnpm migrate`.
  - **Order and rollback**: provision the instance, run `pnpm migrate` against it, then deploy code that reads the new table (nothing reads `tooling_proof`). Rollback: the migrations are forward-only; `tooling_proof` is harmless to leave in place. Rebuilding a broken environment means dropping the database and re-running `pnpm migrate`. Destroying the instance is `terraform destroy` and is a human action.

  ### Existing code read

  `services/api/src/database/migrate.ts` (runner, advisory lock 7019, per-file transaction), `database.module.ts` (lazy `pg` Pool, `PG_POOL`), `services/api/migrations/001_defects.sql`, `services/api/test/e2e/status-moves.spec.ts` (real-Postgres tests live under Playwright e2e), `services/api/vitest.config.ts` (unit tests `src/**/*.spec.ts`). The worker does not own the database (stack notes), so `services/worker` is untouched. No UI work: the design prototype was not needed and no UI step exists.

  ```mermaid
  flowchart TD
    CLI["pnpm migrate / migrate:version / db:check"] --> M["migrate.ts: versionOf, currentVersion, dumpSchema"]
    CLI --> C["check.ts: checkConnection"]
    M --> SQL["migrations/001_defects.sql"]
    M --> P["migrations/002_tooling_proof.sql"]
    M --> E["migrations/expected-schema.json"]
    T["test/e2e/migrations.spec.ts"] --> M
    T --> C
    S["status-moves.spec.ts (existing)"] --> M
    TF["infra/db/main.tf (one aws_db_instance)"] --> RDS[("RDS PostgreSQL, us-east-1")]
    C --> RDS
    M --> RDS
    classDef touched fill:#f96,color:#000
    class M,C,P,E,TF,T,CLI touched
  ```

  The touched nodes are new or extended: `migrate.ts` for versions and the schema dump, `check.ts` for connectivity, `002_tooling_proof.sql` and `expected-schema.json` for the tooling proof, `infra/db` for the single instance, the new spec for the ACs. `status-moves.spec.ts` calls `migrate` and must keep passing; its idempotence test will see 002 applied on first run, which does not change its assertions.

  ### Item text
  The work item text contained no instructions beyond the change itself, so nothing was excluded.
review_focus: |
  IN: version reading, version command, tooling_proof migration, connectivity check, one-instance infra definition, and tests for the 8 ACs. OUT: business tables, seed data, replica, backups tuning, worker changes, UI. Riskiest part is AC4 versus the merged defects migration (flagged as an open question; tests use a fixture directory) and the fact that AC1 and AC5 can only be fully verified against the real cloud instance by a human. The runner's per-file transaction and `schema_migrations(name)` table are deliberately kept so existing databases need no data change.
