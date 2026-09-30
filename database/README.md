# SCSMS Database

Database package for the Sub-County School Management System. It defines the Drizzle ORM schema, migration configs, database clients, and seed scripts used by the app.

## Stack

- Drizzle ORM for schema definitions and typed database access
- Drizzle Kit for migration generation, push, migrate, and studio
- SQLite through `better-sqlite3` for local/offline development
- PostgreSQL through `postgres` for server deployments
- `tsx` for running TypeScript seed scripts

## Package Layout

```text
database/
  drizzle/                  Generated migrations and snapshots
    sqlite/
    postgres/
  seeders/                  Static/reference data files
  src/
    index.ts                Exports SQLite schema modules
    sqlite.ts               Local SQLite Drizzle client
    postgres.ts             PostgreSQL Drizzle client
    schema/                 Table definitions and relations
    seed/                   Executable seed scripts
  sync/                     Offline sync helpers
  drizzle.config.sqlite.ts  SQLite Drizzle Kit config
  drizzle.config.postgres.ts PostgreSQL Drizzle Kit config
```

## Environment

The seed runner loads environment variables from the project root `.env` file:

```text
school_management/.env
```

Required values:

```env
DATABASE_URL=postgresql://username:password@localhost:5432/scsms
SCSMS_ADMIN_PASSWORD=Admin123456!
```

`DATABASE_URL` is required by the PostgreSQL client and Postgres Drizzle commands. `SCSMS_ADMIN_PASSWORD` is required by the administrator seed and is hashed before storage.

## Database Targets

### SQLite

SQLite is the default local database target used by `src/sqlite.ts` and the current seed script.

- Database file: `database/scsms.db`
- Schema glob: `src/schema/*.ts`
- Migration output: `drizzle/sqlite`
- Config: `drizzle.config.sqlite.ts`

Run commands from `school_management/database`:

```bash
pnpm db:generate:sqlite
pnpm db:migrate:sqlite
pnpm db:push:sqlite
pnpm db:studio:sqlite
```

On PowerShell, use `pnpm.cmd` if script execution policy blocks the `pnpm` shim:

```powershell
pnpm.cmd db:push:sqlite
```

### PostgreSQL

PostgreSQL is configured for deployment/server use.

- Connection string: `DATABASE_URL`
- Schema entry: `src/schema/postgres.ts`
- Migration output: `drizzle/postgres`
- Config: `drizzle.config.postgres.ts`

Run commands from `school_management/database`:

```bash
pnpm db:generate:postgres
pnpm db:migrate:postgres
pnpm db:push:postgres
pnpm db:studio:postgres
```

## Seeding

Run the seed script from `school_management/database`:

```bash
pnpm db:seed
```

PowerShell alternative:

```powershell
pnpm.cmd db:seed
```

The seed runner performs these steps:

1. Loads environment variables from `../.env`.
2. Seeds the Rabai sub-county if it does not already exist.
3. Creates the `administrator` role if it does not already exist.
4. Creates the default administrator user if it does not already exist.

Default administrator:

```text
Email: admin@scsms.go.ke
Password: value of SCSMS_ADMIN_PASSWORD
```

The administrator seed is idempotent. If the administrator already exists, it skips creating a duplicate user.

## Schema Areas

The SQLite schema is split by domain under `src/schema`:

- `academicyear.ts`: academic years and terms
- `subcounty_ward.ts`: sub-county and ward reference data
- `schools.ts`: school registry and school metadata
- `contact.ts`: school and ward contacts
- `staff.ts`: staff records
- `enrollment.ts`: enrollment snapshots and grade rows
- `infrastructure.ts`: infrastructure snapshots, facility rows, and projects
- `performance.ts`: assessment and subject performance records
- `reports.ts`: report templates and generated report runs
- `quality.ts`: data quality checks
- `dashboard.ts`: dashboard snapshot cache
- `setting.ts`: application settings
- `system.ts`: audit logs, sync queue, and backups
- `user.ts`: roles and users

The PostgreSQL schema is currently consolidated in `src/schema/postgres.ts`.

## Importing From Apps

Use the package exports instead of importing files by long relative paths.

```ts
import { db } from "@scsms/db/sqlite";
import { users, schools } from "@scsms/db";
```

For PostgreSQL:

```ts
import { db } from "@scsms/db/postgres";
```

## Typical Local Setup

From the repository root:

```bash
pnpm install
cd database
pnpm db:push:sqlite
pnpm db:seed
```

Then open Drizzle Studio if needed:

```bash
pnpm db:studio:sqlite
```

## Migration Workflow

After editing schema files:

```bash
pnpm db:generate:sqlite
pnpm db:migrate:sqlite
```

For PostgreSQL schema changes:

```bash
pnpm db:generate:postgres
pnpm db:migrate:postgres
```

Use `db:push:*` for quick local development when you want Drizzle Kit to apply schema changes directly without generating a migration first.

## Troubleshooting

If `pnpm db:seed` fails with a password error, check `SCSMS_ADMIN_PASSWORD` in `school_management/.env`.

If PowerShell reports that `pnpm.ps1` cannot be loaded, run the command with `pnpm.cmd`.

If PostgreSQL commands fail with `DATABASE_URL is not defined`, add `DATABASE_URL` to the root `.env` or provide it in the shell before running the command.
