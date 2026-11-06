# Non-production PostgreSQL

One AWS RDS PostgreSQL instance in us-east-1 (ADR-0009). The schema is built only by the versioned
migrations in `services/api/migrations/`. Provisioning is run by a human operator.

## Provision

```
cd infra/db
terraform init
terraform apply -var vpc_id=... -var 'private_subnet_ids=[...]' \
  -var core_api_security_group_id=... -var worker_security_group_id=...
```

The master password is generated into AWS Secrets Manager (`master_secret_arn` output); it is never
committed.

## Connect

Set `DATABASE_URL=postgresql://<user>:<password>@<endpoint>/core_api`, then:

```
cd services/api
pnpm db:check   # prints "connected"
```

Check there is exactly one instance:
`aws rds describe-db-instances --region us-east-1 --query 'length(DBInstances)'` prints `1`.

## Migrate

```
pnpm migrate           # applies pending migrations, each in its own transaction
pnpm migrate:version   # prints the latest applied version, or "none"
```

Migrations must not contain statements that cannot run in a transaction (for example
`CREATE INDEX CONCURRENTLY`). A change to the schema also updates
`services/api/migrations/expected-schema.json` in the same PR.

## Rebuild from scratch

Drop and recreate the `core_api` database, then run `pnpm migrate`. Destroying the instance is
`terraform destroy`, a human action.

## Test settings

- `DATABASE_URL`: the shared database (defaults to local `core_api`).
- `DATABASE_ADMIN_URL`: used by `pnpm e2e` database tests to create and drop uniquely named scratch
  databases; falls back to `DATABASE_URL`.
