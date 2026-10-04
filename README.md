# SCSMS

Sub-County School Management System. This monorepo contains the web app, desktop app, shared feature/UI packages, and the database package for managing school records, enrollment, staff, infrastructure, reports, and related sub-county education data.

![Next.js](https://img.shields.io/badge/Next.js-16-000000?logo=nextdotjs&logoColor=white)
![React](https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=000000)
![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?logo=typescript&logoColor=white)
![Tauri](https://img.shields.io/badge/Tauri-2-24C8DB?logo=tauri&logoColor=white)
![Rust](https://img.shields.io/badge/Rust-1.77+-000000?logo=rust&logoColor=white)
![Drizzle ORM](https://img.shields.io/badge/Drizzle_ORM-0.45-C5F74F)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-server-4169E1?logo=postgresql&logoColor=white)
![SQLite](https://img.shields.io/badge/SQLite-desktop-003B57?logo=sqlite&logoColor=white)
![pnpm](https://img.shields.io/badge/pnpm-11-F69220?logo=pnpm&logoColor=white)

## Apps

- `apps/web`: browser-based Next.js application.
- `apps/desktop`: desktop application using Next.js inside Tauri.
- `database`: shared Drizzle schemas, migrations, seed scripts, and database helpers.
- `packages/features`: reusable SCSMS feature screens, dialogs, schemas, records, and navigation.
- `packages/ui`: shared UI primitives, styles, and utilities.

## Repository Layout

```text
school_management/
  apps/
    web/                  Web application
    desktop/              Tauri desktop application
  database/               Drizzle schemas, migrations, clients, seeds
  packages/
    features/             Shared feature modules and screens
    ui/                   Shared UI components and styles
    public/               Shared static assets
  docs/                   Project documentation
  services/               Service-level code and experiments
  package.json            Root workspace scripts
  pnpm-workspace.yaml     Workspace package definitions
  turbo.json              Turbo configuration
```

## Prerequisites

- Node.js with Corepack.
- pnpm `11.10.0`.
- PostgreSQL for server/database seeding workflows.
- Rust toolchain for the desktop Tauri backend.

On PowerShell, use `pnpm.cmd` if the `pnpm.ps1` shim is blocked by execution policy.

## Environment

Create a root `.env` file:

```env
DATABASE_URL=postgresql://postgres:root@localhost:5432/scsmsdb
SCSMS_ADMIN_PASSWORD=Admin@123
```

`DATABASE_URL` is used by the Postgres database client and seed scripts. `SCSMS_ADMIN_PASSWORD` is used for the seeded administrator account.

## Install

From the repository root:

```powershell
pnpm.cmd install
```

## Development

Start the web app:

```powershell
pnpm.cmd dev:web
```

Start the desktop app:

```powershell
pnpm.cmd dev:desktop
```

Run package scripts directly:

```powershell
pnpm.cmd --filter web dev
pnpm.cmd --filter desktop tauri:dev
pnpm.cmd --filter @scsms/db db:seed
```

## Database

The project supports two database targets:

- PostgreSQL for server-style workflows and the package seed command.
- SQLite for the Tauri desktop app, using Drizzle `sqlite-proxy` through a custom Tauri `run_sql` command.

Seed local PostgreSQL:

```powershell
pnpm.cmd --filter @scsms/db db:push:postgres
pnpm.cmd --filter @scsms/db db:seed
```

Generate SQLite migration SQL for desktop:

```powershell
pnpm.cmd --filter @scsms/db db:generate:sqlite
```

More detail is in [database/README.md](database/README.md).

## Build And Verify

Web app:

```powershell
pnpm.cmd --filter web build
pnpm.cmd --filter web lint
```

Desktop frontend:

```powershell
pnpm.cmd --filter desktop build
```

Tauri backend:

```powershell
cd apps/desktop/src-tauri
cargo fmt
cargo check
cargo clippy --all-targets -- -D warnings
```

## Documentation

- [Desktop app](apps/desktop/README.md)
- [Tauri backend](apps/desktop/src-tauri/README.md)
- [Database package](database/README.md)

## Default Login

```text
Email: admin@scsms.go.ke
Password: Admin@123
```

The desktop app also includes `/database-test` for checking the local Tauri SQLite bridge, current user, and active sub-county.

## Notes

- Keep generated folders such as `.next/`, `node_modules/`, and Tauri build output out of review.
- Keep schema changes in sync between Drizzle schemas, generated migrations, and the desktop migration loader.
- The desktop app uses a local SQLite database file managed by Tauri; running `@scsms/db db:seed` seeds PostgreSQL, not the desktop SQLite file.
