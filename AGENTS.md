# Repository Guidelines

## Project Structure & Module Organization
- `src/app` holds the Next.js App Router entry points, layouts, and route handlers.
- `src/components` stores shared UI components; collocate Tailwind styles when practical.
- `src/lib` gathers utilities such as Prisma clients, auth helpers, and PDF logic.
- `src/emails` contains Resend-friendly transactional templates.
- `prisma/` keeps the Prisma schema, generated client, and migrations; `public/` serves static assets and versioned favicons.

## Build, Test, and Development Commands
- `pnpm install` installs dependencies and triggers `prisma generate`.
- `pnpm dev` starts the dev server on `http://localhost:3000` with hot reload.
- `pnpm lint` runs ESLint with the Next core web vitals ruleset to catch accessibility and performance regressions.
- `pnpm build` runs the production build (Webpack) and surfaces type or config issues early.
- `pnpm prisma migrate dev` applies schema changes to the local database; ensure `.env` exposes `DATABASE_URL`.

## Coding Style & Naming Conventions
- Write TypeScript with explicit exports; keep components in PascalCase files and hooks/utilities in camelCase.
- Favor Tailwind CSS utilities over custom CSS; reserve inline styles for dynamic values only.
- Follow ESLint guidance; use `pnpm lint --fix` before pushing and avoid disabling rules without justification.

## Testing Guidelines
- Automated tests are not yet wired up; document manual checks in PRs and cover critical flows (upload, merge, download) via `pnpm dev`.
- When adding tests, place them under `src/__tests__` and wire a `pnpm test` script (Vitest or Jest) before merging.
- Regenerate the Prisma client after schema edits and verify migrations with a fresh `prisma migrate reset` when reviewing breaking changes.

## Commit & Pull Request Guidelines
- Use Conventional Commit prefixes (`feat:`, `fix:`, `chore:`) as reflected in history; keep messages scoped and imperative.
- Squash or amend to remove noisy commits before opening a PR.
- PR descriptions should call out user impact, database migrations, and include screenshots for UI-facing updates.
- Confirm `pnpm lint`, relevant migrations, and any manual checks succeed before requesting review.

## Environment & Security Notes
- Store secrets in `.env` (`DATABASE_URL`, `NEXTAUTH_SECRET`, `RESEND_API_KEY`) and never commit them.
- Avoid committing new SQLite databases; add example data via migrations instead.
- For production, rotate Resend and auth credentials whenever contributors gain or lose access, and update deployment configs accordingly.

