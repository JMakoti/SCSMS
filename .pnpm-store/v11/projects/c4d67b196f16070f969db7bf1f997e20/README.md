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
2. Runs the initial schema migration.
3. Seeds required initial data.
4. Registers the database pool as Tauri managed state.

Seeded local data includes:

- 🏫 Rabai sub-county.
- 🔐 `administrator` role.
- 👤 `admin@scsms.go.ke` administrator user.

The default fallback desktop seed password is:

```text
Admin@123
```

If `SCSMS_ADMIN_PASSWORD` is available in the environment, the seed uses that value instead.

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

Frontend checks:

```powershell
pnpm.cmd build
pnpm.cmd lint
```

Tauri backend checks from `apps/desktop/src-tauri`:

```powershell
cargo fmt
cargo check
cargo clippy --all-targets -- -D warnings
```

## 🧭 Useful Routes

- 🏠 `/` - main desktop app entry.
- 🧪 `/database-test` - smoke test page for the Tauri SQLite bridge, current user, and active sub-county.

## 📝 Notes

- ⚡ Use `pnpm.cmd` on PowerShell if the `pnpm.ps1` shim is blocked by execution policy.
- 🔌 The app uses the custom Tauri `run_sql` command rather than `tauri-plugin-sql`.
- 🧬 Keep database schema changes in sync with the shared `database/` package and generated SQLite migration SQL.
- 💾 The desktop session helper currently stores the signed-in user in `localStorage`.
