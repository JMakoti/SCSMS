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

- Node.js 24, as used by the release workflow.
- pnpm `11.10.0`.
- PostgreSQL for server/database seeding workflows.
- Rust toolchain for the desktop Tauri backend.

On PowerShell, use `pnpm.cmd` if the `pnpm.ps1` shim is blocked by execution policy.

## Environment

Create a root `.env` file:

```env
DATABASE_URL=postgresql://username:password@localhost:5432/scsms
SCSMS_ADMIN_PASSWORD=replace-with-your-bootstrap-password
SCSMS_SESSION_SECRET=replace-with-a-random-secret-of-at-least-32-characters
```

`DATABASE_URL` is used by the Postgres database client and seed scripts. `SCSMS_ADMIN_PASSWORD` is used for the PostgreSQL administrator seed. `SCSMS_SESSION_SECRET` signs the web app's HTTP-only authentication cookie and must be a random value of at least 32 characters.

The PostgreSQL seed password must contain at least 8 characters. Native Rust startup reads process environment variables; it does not automatically load this root `.env`. See [desktop setup](apps/desktop/README.md) for its initial account.

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

After generating SQLite SQL, add its `include_str!` constant, version, and application block to `apps/desktop/src-tauri/src/database/migrations.rs`, then rebuild/restart Tauri. Generation alone does not apply a desktop migration.

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
pnpm.cmd --filter desktop lint
```

Focused regression tests from the repository root:

```powershell
node --test apps/web/tests/account-api.test.mjs
node --test apps/desktop/tests/account-navigation.test.mjs apps/desktop/tests/desktop-startup.test.mjs apps/desktop/tests/desktop-updater.test.mjs
```

Build the native installers with `pnpm.cmd --filter desktop tauri:build`.

Tauri backend:

```powershell
cd apps/desktop/src-tauri
cargo fmt
cargo check
cargo clippy --all-targets -- -D warnings
cargo test --lib
```

## Documentation

- [Web app](apps/web/README.md)
- [Desktop app](apps/desktop/README.md)
- [Tauri backend](apps/desktop/src-tauri/README.md)
- [Database package](database/README.md)

## Default Login

```text
Email: admin@scsms.go.ke
Desktop initial password: Admin@123 (unless SCSMS_ADMIN_PASSWORD is set)
```

For the web app, use the password supplied to the PostgreSQL seed. Existing administrator accounts and their passwords are preserved when seeding runs again.

The desktop app also includes `/database-test` for checking the local Tauri SQLite bridge, current user, and active sub-county.

## Accounts And Forms

- Desktop login stays in memory. Closing/reopening or reloading requires sign-in again.
- The far-right topbar button logs out directly.
- Users & Roles > Education Officer > My profile opens the signed-in account. Other role catalogue entries are inactive.
- Name and phone are editable; email, assigned sub-county, and access role are read-only. Account handlers enforce the email and sub-county restrictions.
- A separate password card verifies the current password and confirmation before storing a replacement bcrypt hash. New passwords require at least 8 characters and at most 72 UTF-8 bytes.
- Desktop records and academic years load together after sign-in, with background retries and a plain loading message. Failed refreshes preserve the existing dashboard.
- Dialogs ignore backdrop clicks and Escape. Close icons, Cancel/Done buttons, and successful actions provide explicit completion paths.
- Add School shows Cluster level only for Senior School. Add Ward fills related geography from the selected sub-county.

## Notes

- Keep generated folders such as `.next/`, `node_modules/`, and Tauri build output out of review.
- Keep schema changes in sync between Drizzle schemas, generated migrations, and the desktop migration loader.
- The desktop app uses a local SQLite database file managed by Tauri; running `@scsms/db db:seed` seeds PostgreSQL, not the desktop SQLite file.

The root `pnpm test` command is a placeholder; use the focused Node and Rust tests above. Before a desktop release, align the intended version in the desktop package, Cargo manifest, and Tauri config; see the [release workflow](.github/workflows/release.yml).
