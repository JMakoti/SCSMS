# SCSMS Database

Shared database package for the Sub-County School Management System. It contains Drizzle schemas, generated migrations, database clients, seed scripts, static seed data, and sync helpers used by the web and desktop apps.

![Drizzle ORM](https://img.shields.io/badge/Drizzle_ORM-0.45-C5F74F)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-server-4169E1?logo=postgresql&logoColor=white)
![SQLite](https://img.shields.io/badge/SQLite-desktop-003B57?logo=sqlite&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?logo=typescript&logoColor=white)
![tsx](https://img.shields.io/badge/tsx-seeds-000000)

## What Lives Here

- Drizzle table definitions for SQLite and PostgreSQL.
- Drizzle Kit configs for generating, pushing, migrating, and opening Studio.
- Generated migration SQL and metadata for both database targets.
- Postgres client used by server-side scripts.
- Seed scripts for required Postgres bootstrap data.
- Static reference seed data under `seeders/`.
- Offline sync helper modules under `sync/`.

## Folder Layout

```text
database/
  drizzle/
    sqlite/                 Generated SQLite migrations and snapshots
    postgres/               Generated PostgreSQL migrations and snapshots
  seeders/                  Static/reference seed data
  src/
    index.ts                Exports SQLite schema modules
    sqlite.ts               Placeholder/commented SQLite client
    postgres.ts             Active PostgreSQL Drizzle client
    schema/                 SQLite table definitions
    postgress-schemas/      PostgreSQL table definitions
    seed/                   Executable Postgres seed scripts
  sync/                     Offline sync helpers
  drizzle.config.sqlite.ts  SQLite Drizzle Kit config
  drizzle.config.postgres.ts
                            PostgreSQL Drizzle Kit config
  package.json              Database package scripts
```

## Database Targets

### PostgreSQL

PostgreSQL is the active target for the package seed script and server-style database client.

- Client: `src/postgres.ts`
- Schemas: `src/postgress-schemas/*.ts`
- Migration output: `drizzle/postgres`
- Config: `drizzle.config.postgres.ts`
- Connection env: `DATABASE_URL`

The seed runner imports `db` from `src/postgres.ts`, so `DATABASE_URL` must point to a running PostgreSQL database before seeding.

### SQLite

SQLite schemas are maintained for the desktop/local database.

- Schemas: `src/schema/*.ts`
- Package export: `@scsms/db` exports these SQLite schema modules through `src/index.ts`
- Migration output: `drizzle/sqlite`
- Config: `drizzle.config.sqlite.ts`
- Initial generated SQL: `drizzle/sqlite/0000_empty_scourge.sql`

The desktop app does not currently use `src/sqlite.ts`. Instead, it imports the SQLite schema from this package and runs queries through Tauri's custom Drizzle `sqlite-proxy` backend.

## Environment

The seed runner loads environment variables from the repository root:

```text
school_management/.env
```

Required values:

```env
DATABASE_URL=postgresql://postgres:root@localhost:5432/scsmsdb
SCSMS_ADMIN_PASSWORD=Admin@123
```

`DATABASE_URL` is required by `src/postgres.ts` and all Postgres Drizzle commands. `SCSMS_ADMIN_PASSWORD` is required by the administrator seed, must contain at least 8 characters, and is hashed before storage.

## Scripts

Run these from `database/` or with `pnpm --filter @scsms/db <script>` from the repo root.

### SQLite

```powershell
pnpm.cmd db:generate:sqlite
pnpm.cmd db:migrate:sqlite
pnpm.cmd db:push:sqlite
pnpm.cmd db:studio:sqlite
```

### PostgreSQL

```powershell
pnpm.cmd db:generate:postgres
pnpm.cmd db:migrate:postgres
pnpm.cmd db:push:postgres
pnpm.cmd db:studio:postgres
```

### Seeding

```powershell
pnpm.cmd db:seed
```

From the repository root:

```powershell
pnpm.cmd --filter @scsms/db db:seed
```

## Seed Behavior

The package seed runner at `src/seed/index.ts` seeds PostgreSQL.

It performs these steps:

1. Loads root `.env`.
2. Seeds the Rabai sub-county if it does not already exist.
3. Creates the `administrator` role if it does not already exist.
4. Creates the default administrator user if it does not already exist.

Default administrator:

```text
Email: admin@scsms.go.ke
Password: value of SCSMS_ADMIN_PASSWORD
```

The seed is idempotent. Re-running it skips existing rows instead of creating duplicates.

## Schema Areas

Both SQLite and PostgreSQL schemas are split by domain:

- `academicyear`: academic years and terms.
- `subcounty_ward`: sub-county and ward reference data.
- `schools`: school registry and school metadata.
- `contact`: school and ward contacts.
- `staff`: staff records.
- `enrollment`: enrollment snapshots and grade rows.
- `infrastructure`: infrastructure snapshots, facility rows, and projects.
- `performance`: assessment and subject performance records.
- `reports`: report templates and generated report runs.
- `quality`: data quality checks.
- `dashboard`: dashboard snapshot cache.
- `setting`: application settings.
- `system`: audit logs, sync queue, and backups.
- `user`: roles and users.

## Imports

Use package exports instead of long relative paths.

SQLite schema imports:

```ts
import { users, schools } from "@scsms/db";
import { users as userTable } from "@scsms/db/schema/user";
```

PostgreSQL client and schemas:

```ts
import { db } from "@scsms/db/postgres";
import { users } from "@scsms/db/postgress-schemas/user";
```

## Typical Workflows

### Seed Local PostgreSQL

```powershell
pnpm.cmd --filter @scsms/db db:push:postgres
pnpm.cmd --filter @scsms/db db:seed
```

### Regenerate SQLite Migration SQL For Desktop

```powershell
pnpm.cmd --filter @scsms/db db:generate:sqlite
```

After regenerating SQLite migrations, verify the desktop Tauri migration loader still points at the expected SQL file in `apps/desktop/src-tauri/src/database/migrations.rs`.

### Open Drizzle Studio

```powershell
pnpm.cmd --filter @scsms/db db:studio:postgres
pnpm.cmd --filter @scsms/db db:studio:sqlite
```

## PowerShell Note

If PowerShell blocks the `pnpm.ps1` shim, use `pnpm.cmd`:

```powershell
pnpm.cmd --filter @scsms/db db:seed
```

## Troubleshooting

- `DATABASE_URL is not defined`: add `DATABASE_URL` to the root `.env`.
- `SCSMS_ADMIN_PASSWORD environment variable is required`: add `SCSMS_ADMIN_PASSWORD` to the root `.env`.
- Password length error: use at least 8 characters.
- Seed command prints only the command and no seed logs: check that `src/seed/index.ts` contains live code and is not commented out.
- Desktop data missing: the desktop app uses its own local SQLite database through Tauri; package `db:seed` seeds PostgreSQL, not the desktop SQLite file.
