SCSMS - WEB APPLICATION (WEB BASED)

The browser app uses Next.js 16, React 19, shared SCSMS features, and PostgreSQL. See the [project README](../../README.md) for the workspace layout.

## Setup And Development

Run commands from the repository root. Create the root `.env` with `DATABASE_URL`, `SCSMS_ADMIN_PASSWORD` (at least 8 characters), and a random `SCSMS_SESSION_SECRET` of at least 32 characters, as shown in the project README.

```powershell
pnpm.cmd install
pnpm.cmd --filter @scsms/db db:push:postgres
pnpm.cmd --filter @scsms/db db:seed
pnpm.cmd dev:web
```

Open the URL printed by Next.js, normally http://localhost:3000. The initial email is `admin@scsms.go.ke`, with the password supplied to the PostgreSQL seed. Desktop SQLite is separate.

## Accounts And Profile

Web login uses a signed, HTTP-only `scsms_session` cookie with an eight-hour lifetime. The topbar Log out button clears the session.

Users & Roles > Education Officer > My profile opens the current account. Name and phone are editable. Email, assigned sub-county, and access role are read-only; account handlers reject changes to email and sub-county. Other role catalogue entries are inactive.

The password card requires the current password and matching confirmation. The new password must be different, contain at least 8 characters, and fit within 72 UTF-8 bytes. The server stores a bcrypt hash.

Profile updates use PATCH /api/account/profile; password changes use POST /api/account/password. Both endpoints use the authenticated user ID and reject unauthenticated or cross-origin mutation requests.

## Build And Verify

```powershell
pnpm.cmd --filter web build
pnpm.cmd --filter web lint
pnpm.cmd --filter web exec tsc --noEmit
node --test apps/web/tests/account-api.test.mjs
```

After building, run `pnpm.cmd --filter web start` to serve the production build. The Node tests use mocked database adapters and real password hashing. There is no web package test script.

## Shared Code And Database

Use `packages/features` and `packages/ui` for shared screens and styling, and verify both applications after shared changes.

The PostgreSQL client is exported from `@scsms/db/postgres`; PostgreSQL tables come from `@scsms/db/postgress-schemas/*`. The main `@scsms/db` entry exports SQLite tables. See the [database README](../../database/README.md) for migrations and seeds.
