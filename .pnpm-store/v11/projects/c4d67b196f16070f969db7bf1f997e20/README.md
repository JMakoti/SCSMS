# 🖥️ SCSMS Desktop

Desktop application for the Sub-County School Management System. This app combines a Next.js 16 frontend with a Tauri 2 Rust backend so SCSMS can run as a local desktop application with an embedded SQLite database.

![Next.js](https://img.shields.io/badge/Next.js-16-000000?logo=nextdotjs&logoColor=white)
![React](https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=000000)
![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?logo=typescript&logoColor=white)
![Tauri](https://img.shields.io/badge/Tauri-2-24C8DB?logo=tauri&logoColor=white)
![Rust](https://img.shields.io/badge/Rust-1.77+-000000?logo=rust&logoColor=white)
![SQLite](https://img.shields.io/badge/SQLite-local-003B57?logo=sqlite&logoColor=white)
![Drizzle ORM](https://img.shields.io/badge/Drizzle_ORM-sqlite--proxy-C5F74F)
![pnpm](https://img.shields.io/badge/pnpm-11-F69220?logo=pnpm&logoColor=white)

## 🧱 Stack

- ⚛️ Next.js 16, React 19, and TypeScript for the UI.
- 🪟 Tauri 2 for the native desktop shell.
- 🦀 Rust and `sqlx` for local SQLite access.
- 🌧️ Drizzle ORM in `sqlite-proxy` mode for typed frontend database queries.
- Native Tauri file dialogs for selecting optional school logo files.
- 📦 Shared workspace packages from `packages/` and `database/`.

## 🗂️ Folder Layout

```text
apps/desktop/
  app/                    Next.js app routes and layouts
  lib/                    Desktop-specific frontend helpers
    database.ts           Drizzle sqlite-proxy client
    test.ts               Local database smoke-test helpers
  public/                 Static desktop assets
  src-tauri/              Tauri Rust backend
  package.json            Desktop app scripts and dependencies
  next.config.ts          Next.js config for Tauri development/builds
```

For backend internals, see:

```text
src-tauri/README.md
```

## 🔁 How The App Works

The frontend is a normal Next.js app rendered inside a Tauri window. Database reads and writes do not open SQLite directly from JavaScript.

Instead, `lib/database.ts` creates a Drizzle `sqlite-proxy` client. Drizzle sends generated SQL, parameters, and method names to the Tauri backend through:

```text
invoke("run_sql", { sql, params, method })
```

The Rust backend receives that command, executes the query with `sqlx`, and returns JSON rows to Drizzle.

## 🗄️ Local Database

The desktop app uses a local SQLite database named:

```text
scsms.db
```

On startup, the Tauri backend:

1. Creates the SQLite connection pool.
2. Runs all registered SQLite schema migrations.
3. Seeds required initial records.
4. Registers the database pool as Tauri managed state.

Startup inserts the Rabai sub-county and administrator role/user only when they do not already exist. The web app's PostgreSQL database is separate and is not automatically copied into desktop SQLite.
School creation writes through `repository/school.ts`; an optional logo selected in the desktop dialog is copied into the Tauri app-data `school-logos` directory, and only its managed file path is stored in the school's `logo_path`.
Creating a school also initializes zero-count enrollment rows for each grade in its level across Terms 1-3 of the current academic year. If no academic year exists, the current calendar year is created and activated first.

New generated SQLite migrations must be registered in `src-tauri/src/database/migrations.rs` with an embedded SQL constant, version, and application block. Rebuild/restart Tauri after native code or migration changes.

## 🛠️ Development

Run commands from the repository root unless noted otherwise.

Install dependencies:

```powershell
pnpm.cmd install
```

Start the desktop app:

```powershell
pnpm.cmd dev:desktop
```

Or from this folder:

```powershell
pnpm.cmd tauri:dev
```

Run the Next.js frontend only:

```powershell
pnpm.cmd dev
```

This starts a browser frontend without the Tauri database bridge. Use the native window for desktop sign-in and local records. Web and desktop both default to port 3000, so run them separately or adjust their configurations together.

## 📦 Build

From `apps/desktop`:

```powershell
pnpm.cmd build
pnpm.cmd tauri:build
```

The Tauri config uses:

- `beforeDevCommand`: `pnpm dev`
- `beforeBuildCommand`: `pnpm build`
- development URL: `http://localhost:3000`

## ✅ Verification

Frontend checks from `apps/desktop`:

```powershell
pnpm.cmd build
pnpm.cmd lint
pnpm.cmd exec tsc --noEmit
node --test tests/account-navigation.test.mjs tests/desktop-startup.test.mjs tests/desktop-updater.test.mjs
```

Tauri backend checks from `apps/desktop/src-tauri`:

```powershell
cargo fmt
cargo check
cargo clippy --all-targets -- -D warnings
cargo test --lib
```

## Accounts And Profile

The initial email is `admin@scsms.go.ke`. Rust uses the process environment variable `SCSMS_ADMIN_PASSWORD` (at least 8 characters), falling back to `Admin@123` for an unseeded database. To set it before first startup, run these commands from the repository root:

```powershell
$env:SCSMS_ADMIN_PASSWORD = "replace-with-your-bootstrap-password"
pnpm.cmd dev:desktop
```

The root `.env` is not automatically loaded into native Rust. Startup preserves an existing administrator and password, recognising the account by email or administrator role.

After login, records and academic years load together with background retries and a plain loading message. Refresh failures keep the loaded dashboard visible.

Users & Roles > Education Officer > My profile opens the current account. Other role catalogue entries are inactive. Name and phone are editable; email, assigned sub-county, and access role are read-only. Native account handlers enforce the email and sub-county restrictions.

The password card requires the current password, a different new password, and matching confirmation. New passwords require at least 8 characters and at most 72 UTF-8 bytes; the backend stores a bcrypt hash. Log out is available directly at the far right of the topbar.

Automatic updater checks default to off. Update preferences/history are stored separately from login state. See the [release workflow](../../.github/workflows/release.yml) and align the desktop package, Cargo, and Tauri versions before packaging.

## 🧭 Useful Routes

- 🏠 `/` - main desktop app entry.
- 🧪 `/database-test` - smoke test page for the Tauri SQLite bridge, current user, and active sub-county.

## 📝 Notes

- ⚡ Use `pnpm.cmd` on PowerShell if the `pnpm.ps1` shim is blocked by execution policy.
- 🔌 The app uses the custom Tauri `run_sql` command rather than `tauri-plugin-sql`.
- 🧬 Keep database schema changes in sync with the shared `database/` package and generated SQLite migration SQL.
- 💾 Desktop login identity stays in React and native in-memory state. Older saved-login data is cleared, and closing/reopening or reloading requires sign-in again.
