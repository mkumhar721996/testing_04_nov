# Non-production PostgreSQL

One AWS RDS for PostgreSQL instance (ADR-0009), tagged `Environment=nonprod`, no replica. A human
operator applies it; nothing here is run by the build.

## Provision

```
cd infra/postgres
terraform init
terraform apply \
  -var db_subnet_group_name=... -var 'security_group_ids=["sg-..."]' \
  -var db_username=...
```

RDS generates the master password and stores it in AWS Secrets Manager
(`manage_master_user_password`); read it from there and never commit it. Supply the username via
`TF_VAR_db_username`. `backup_retention_days` is a variable (default 7) pending a product decision.

## Connect

Set `DATABASE_URL=postgresql://<user>:<password>@<endpoint>:5432/core_api` (`endpoint` is a
Terraform output), then from `services/api`:

```
pnpm check:db            # prints "connected"
ENVIRONMENT=nonprod pnpm count:db-instances   # prints 1, exits non-zero otherwise
```

## Migrate

```
pnpm migrate           # applies pending migrations, one transaction per file
pnpm migrate:version   # prints the latest applied version, e.g. 002_tooling_proof, or "none"
```

The database can be rebuilt from migrations alone: drop and recreate `core_api`, then run
`pnpm migrate`. Remove the instance with `terraform destroy` (non-production only).

## Tests

Database-backed tests in `src/database/migrate.spec.ts` run when `DATABASE_URL` points at a
Postgres that allows `CREATE DATABASE`. They create and drop a throwaway database. Point it at a
local or CI Postgres, never the shared cloud instance.
