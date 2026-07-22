# MergifyPDF development

## Everyday workflow

Create a branch for each change:

```bash
git switch -c feat/short-description
pnpm dev
```

Before pushing:

```bash
pnpm check
git status
git diff
git add -A
git commit -m "feat: describe the change"
git push -u origin feat/short-description
gh pr create --fill
```

GitHub runs lint, types, unit tests, a production build, and critical browser tests. Vercel should create an isolated preview for the pull request. Merge only after the checks and preview pass; protected `main` is the production source.

## Commands

- `pnpm dev`: native Turbopack development server.
- `pnpm dev:webpack`: compatibility fallback.
- `pnpm check`: lint, typecheck, and unit tests.
- `pnpm test:e2e`: critical Chromium browser tests.
- `pnpm test:e2e:full`: full browser/device matrix.
- `pnpm diagnose:dev`: safe resource and process report.
- `pnpm benchmark:dev`: cold/warm route timing report.
- `pnpm dev:clean`: remove generated Next cache after the server is stopped.
- `pnpm validate:env`: validate environment isolation without printing values.

Do not run `pnpm build` beside `pnpm dev`; CI performs the production build.

## Codespaces

The project requires at least four CPU cores, 16 GiB memory, and 32 GiB storage. Rebuild the container after dev-container changes. Repository owners should enable a Codespaces prebuild for the default branch after this configuration lands.

If diagnostics report multiple VS Code extension hosts, close duplicate browser/desktop windows connected to the same Codespace.

## Environment safety

Copy `.env.example` to `.env.local` and provide development-only resources. Never copy production credentials into development or preview.

Preview deployments require:

- a separate PostgreSQL database or branch labelled `preview`;
- a separate R2 bucket with `R2_BUCKET_ENVIRONMENT=preview`;
- Stripe test credentials;
- sandbox email delivery;
- a separate Redis instance or namespace labelled `preview`;
- `APP_RUNTIME_GUARD_STRICT=true`.

Missing or mismatched preview labels fail closed. Email is disabled outside production unless `EMAIL_DELIVERY_MODE=sandbox`.

## Recovery

Run `pnpm diagnose:dev` first. If the server is stopped and generated cache is suspected, run `pnpm dev:clean`, then `pnpm dev`. Use `pnpm dev:webpack` only to determine whether a problem is Turbopack-specific.

Never delete databases, uploads, environment files, or source files as cache recovery.

## Repository-owner activation checklist

After this branch is reviewed and pushed:

1. Enable the Codespaces prebuild for the default branch.
2. Add isolated preview database, R2, Redis, Stripe test, and email-sandbox values in Vercel and GitHub.
3. Require the CI check on protected `main`; approvals may remain optional for a solo repository.
4. Confirm Vercel previews run for pull requests and only protected `main` promotes to production.
5. Run the manual deployment smoke workflow after the first production promotion.

Do not copy the current production credentials into preview. Replace any live Stripe key in the local Codespace with a test-mode key before normal development.
