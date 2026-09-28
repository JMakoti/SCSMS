# Repository Guidelines

## Project Structure & Module Organization

This is a Next.js 16 TypeScript application managed with pnpm. Route-level code lives in `app/`, with the dashboard grouped under `app/(dashboard)/` and global styling in `app/globals.css`. Shared UI primitives and navigation components are in `components/`, while feature-specific screens, dialogs, schemas, records, types, and shell code are under `features/`. Utility helpers belong in `lib/`; static assets belong in `public/`; seed data belongs in `seeders/`.

Use the `@/*` path alias from `tsconfig.json` for root-relative imports, for example `@/lib/utils`.

## Build, Test, and Development Commands

- `pnpm install`: install dependencies from `pnpm-lock.yaml`.
- `pnpm dev`: start the local Next.js development server.
- `pnpm build`: create a production build and run framework/type checks.
- `pnpm start`: serve the built production app locally.

There is no dedicated lint or test script in `package.json`; use `pnpm build` as the main verification command before submitting changes.

## Coding Style & Naming Conventions

Write TypeScript and React with strict mode in mind. Use two-space indentation, double quotes, semicolons, and named exports for reusable helpers where practical. Components should use PascalCase filenames or exports, hooks should use `useSomething`, and utility functions should use camelCase.

Prefer existing patterns from `features/` and `components/ui/` before introducing new abstractions. Compose Tailwind classes with the shared `cn` helper in `lib/utils.ts` when conditional class merging is needed.

## Testing Guidelines

No project test framework is configured yet. When adding tests, keep them close to the code they cover and use `*.test.ts` or `*.test.tsx` naming. Prioritize feature flows, form validation, dialog behavior, navigation, and data-heavy UI states. Until a test runner is added, document any manual checks performed and run `pnpm build`.

## Commit & Pull Request Guidelines

Recent commits use short, imperative messages such as `Fix enrollment register search` and occasional `feat:` prefixes. Keep commits focused and describe the visible behavior changed.

Pull requests should include a concise summary, verification steps such as `pnpm build`, linked issues when available, and screenshots or short recordings for UI changes. Call out any data, config, or migration steps reviewers need to repeat.

## Security & Configuration Tips

Do not commit secrets or local environment files. Keep generated folders such as `.next/` and `node_modules/` out of review. Production analytics are enabled only when `NODE_ENV` is `production`, so verify behavior in both development and built modes when touching layout or telemetry.
