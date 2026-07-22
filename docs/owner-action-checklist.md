# Repository owner action checklist

This file tracks dashboard, billing, credential, and infrastructure actions that cannot be completed safely through repository code. Do not paste secret values into issues, commits, logs, or chat.

## Not needed yet

- [ ] Add Stripe test-mode credentials to the Codespace and label any legacy R2 bucket as development (or remove it). The safety guard will intentionally block `pnpm dev` and ordinary local builds while production identities are present. Never paste those values into chat or commit them.

- [ ] Create separate private R2 incoming, source, and derived buckets for development, preview, and production.
- [ ] Create least-privilege R2 credentials for each runtime and add them through the GitHub/Vercel secret dashboards.
- [ ] Apply the exact-origin R2 CORS policy described in `docs/secure-storage-v2-uploads.md`.
- [ ] Keep the source and derived R2 buckets private with no browser CORS, public domain, or public-development URL; see `docs/secure-pdf-delivery.md`.
- [ ] Approve a dedicated inspection-worker runtime. It must support QPDF, current ClamAV signatures, and private temporary disk sized for the maximum PDF plus QDF expansion. This may require a paid service and will not be provisioned without approval.
- [ ] Configure that worker's schedule and alert destination after its deployment package exists.
- [ ] Apply the additive storage migrations to an isolated development database, then preview, and production last.
- [ ] Enable `STORAGE_MODEL_V2_ENABLED=true` only after a disposable end-to-end upload passes in the matching isolated environment.

## Later workflow actions

- [ ] After the current branch is safely pushed, create a new Codespace so the 240-minute personal idle timeout is assigned. A Codespace created before that preference keeps its original shorter timeout; do not delete the current Codespace until all work is on GitHub.

- [ ] Enable Codespaces prebuilds after the dev-container changes are merged.
- [ ] Add isolated preview/test service credentials through GitHub and Vercel.
- [ ] Enable required `main` branch checks if repository permissions require owner confirmation.
- [ ] Confirm final Vercel production-domain promotion settings.
- [ ] Perform a short subjective Studio usability check at major refactor checkpoints.
