# Automatic desktop ↔ cloud sync

The web app reads and writes cloud PostgreSQL directly. This service captures PostgreSQL writes (including web edits) with triggers. The desktop records SQLite writes in a durable outbox, uploads them, then downloads the cloud change log. It runs every 15 seconds while SCSMS is open, retries failed requests with backoff up to 60 seconds, and retries immediately on an online event or **Sync Now**.

## Server setup

1. Install the workspace with `pnpm.cmd install`.
2. Configure root `.env`: `DATABASE_URL` must point at the **same PostgreSQL database as the web app**; set `SCSMS_SYNC_TOKEN` to a separate random secret of at least 32 characters. Never use a public/Next.js environment variable for this token.
3. Apply existing PostgreSQL schema migrations using the database package workflow. Use `db:push:postgres` for development. Seed PostgreSQL before connecting desktops.
4. Run `pnpm.cmd dev:web` or `pnpm.cmd dev:desktop`: either starts the local sync API automatically and reuses a running instance. Use `pnpm.cmd dev:sync` to ensure it is running separately, or `pnpm.cmd --filter sync-api start` for production.
5. Put the service behind an HTTPS reverse proxy. It binds to `127.0.0.1:4001` by default; `SCSMS_SYNC_HOST` and `SCSMS_SYNC_PORT` override these. Restrict network access to managed devices. `GET /health` reports process readiness; `POST /v1/sync` requires `Authorization: Bearer <token>`.

On startup, the service installs its `__sync_*` bookkeeping tables and capture triggers in a transaction and records an initial snapshot. The PostgreSQL role needs schema/table/trigger creation and read/write privileges. Start the service once before allowing new web writes; afterwards the triggers track web writes even when the API process is stopped. Keep the log, receipts, and aliases when backing up or restoring PostgreSQL. Run one service instance during schema initialization; concurrent exchanges are serialized per device.

## Desktop setup

For local development, start the desktop with `pnpm.cmd dev:desktop`. The launcher starts the local API automatically in the background and reads `SCSMS_SYNC_TOKEN` from root `.env`. Its API URL defaults to `http://127.0.0.1:4001` (or `SCSMS_SYNC_PORT`). Set `SCSMS_SYNC_URL` in root `.env` to use another API; a remote URL uses the existing remote service. Runtime environment variables take precedence. Restart desktop development after changing these values. The token is passed to the native process, never a public frontend variable.

The background API stays running when a development terminal closes so both apps can share it. Startup is coordinated with a process lock; simultaneous launches do not create duplicate APIs, and a stopped process is replaced on the next app launch. Logs are in `.tmp/sync-api.log`. If API startup fails, the app still opens and the desktop retains queued edits. This development convenience does not install a Windows startup service or launch an API inside a packaged desktop application; production API hosting remains a separate deployment.

Development ports are fixed: web (`pnpm.cmd dev:web`) uses **3000**, desktop's Next.js frontend uses **3001**, and sync uses **4001**. The desktop window connects to port 3001 and signs in through native SQLite commands. Open `http://localhost:3000` in a browser for web sign-in; the desktop frontend has no `/api/auth/login` route. Stop old dev servers before restarting both apps after changing ports.

On each managed desktop set runtime environment variables `SCSMS_SYNC_URL` (the service base URL, e.g. `https://sync.example.org`) and `SCSMS_SYNC_TOKEN` (the same secret as the service), then restart SCSMS. The Rust process reads these variables; the Next.js browser never receives the token. Root `.env` configures the Node server and does **not** automatically configure an installed desktop.

Alternatively create `sync.json` in Tauri's application data directory (`%APPDATA%\ke.go.scsms.desktop\sync.json` on Windows):

```json
{"url":"https://sync.example.org","token":"your-managed-device-secret-of-at-least-32-characters"}
```

Protect that file with the device user's filesystem permissions. Configuration is re-read each cycle. HTTP is allowed only for localhost development. An unconfigured desktop continues working offline and queues edits.

## Behavior and boundaries

- Includes school, geography, academic year/term, enrollment, staff, contact, infrastructure, performance, reporting, settings, quality, dashboard, audit, role, and user records. Password hashes and account changes are included; this is an **administrator-managed, full-database replication credential**, not a per-user API token. Use only on trusted devices in the same deployment.
- Initial insert collisions preserve cloud records and reconcile different seed UUIDs using unique business keys. Device aliases translate both primary and foreign keys. Ambiguous unique-key collisions fail the transaction and remain queued for correction.
- Subsequent updates use **server arrival order**: the last accepted write wins, including offline edits uploaded later. This does not merge individual fields. Deletes propagate through the log and database foreign keys. Review this policy before allowing multiple officers to edit the same records offline.
- Upload receipts make retries safe after a lost response. Downloads and cursor advancement are atomic; capture is suppressed only inside the download transaction. Pending uploads are drained before applying downloads. A failed page rolls back locally and is retried with the same cursor.
- Desktop uploads use batches of 10 with a 60-second request deadline to tolerate slower cloud connections. The queue display refreshes after every committed batch. Initial synchronization may take several minutes; downloads begin after the existing upload queue drains.
- The desktop syncs without a signed-in UI session while the application process is open. Closing the app stops sync; the persistent outbox resumes next launch. The browser refreshes visible cloud data every 15 seconds. Browser editing itself requires a connection.
- School logos upload to the Supabase Storage bucket `scsms`. SQLite's `logo_path` stays local; the portable `logo_object_key` replicates through PostgreSQL. Desktop file uploads are queued durably, retried automatically, and shown in the sync queue as `__files`. Existing local logos are queued on the next desktop launch. Downloads cache logos locally for offline use and do not overwrite an unsent local replacement. Other local backup/export files are not transferred.
- Do not reset device IDs/cursors or clear server history independently. Existing unrelated records with overlapping natural keys may need administrative reconciliation. Schema changes must be deployed to the API, PostgreSQL, and desktops together; unknown columns stop sync instead of silently dropping fields.

## Supabase Storage

The example configuration uses placeholders for `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY`; configure the real project URL and server-only service-role key in root `.env`, leaving `SUPABASE_STORAGE_BUCKET=scsms`. Restart the sync API and web server after changing them. Placeholders intentionally leave files queued while ordinary record sync continues. The real service-role key belongs only on the API/web server, never in desktop settings or public frontend variables.

The first upload checks for `scsms` and creates it as a **private** bucket when missing; an existing bucket's access settings are preserved. Web sessions and the native sync credential authorize uploads/downloads through server endpoints, so the bucket does not need public access or signed URLs stored in PostgreSQL. Objects use immutable UUID filenames under `school-logos/`. Supported formats: PNG, JPEG, WebP, SVG, up to 5 MB. Replaced/deleted references do not automatically delete old objects, which can still be referenced by offline replicas or sync history.

The new SQLite migration is wired into Tauri startup. The API adds `schools.logo_object_key` idempotently before reading cloud metadata; the PostgreSQL migration is also included for managed deployments. Upgrade the API and both apps together. Mock Storage and isolated PostgreSQL tests cover upload/download authorization and file-reference replication; live uploads require real credentials.

## Checks

`pnpm.cmd --filter sync-api build` checks syntax; `pnpm.cmd --filter sync-api test` runs protocol tests. Native sync tests run with `cargo test --lib database::sync::tests` from `apps/desktop/src-tauri`. For a real integration test, set `SCSMS_SYNC_TEST_DATABASE_URL` to an **empty, disposable PostgreSQL database** and run the API tests; the integration test creates and drops the public schema.

When root `DATABASE_URL` points at local PostgreSQL and its role can create databases, `pnpm.cmd --filter sync-api test:local` creates a separate temporary database, runs integration tests, and drops that database afterwards. It never runs the tests against the configured application database.
