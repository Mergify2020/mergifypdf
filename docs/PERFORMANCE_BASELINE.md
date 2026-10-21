# Development performance baseline

## Before the overhaul

Observed in the original two-core Codespace configuration:

- Next development server RSS: approximately 3.2 GiB after route compilation.
- Total memory: 7.8 GiB with no active swap.
- Generated `.next` size: approximately 1.6 GiB.
- Webpack production cache: approximately 946 MiB.
- Webpack development cache: approximately 574 MiB.
- Development forced Webpack and disabled native SWC.
- WorkspaceShell prefetched five routes during development.
- Studio brand navigation forced a complete browser reload.
- Studio client source: approximately 17,725 lines and 785 KiB.

These figures contain no credentials, hosts, user identifiers, response bodies, or customer data.

## First Turbopack checkpoint

Measured after a controlled cache clean on the current Codespace, which still reported two CPU cores and 7.8 GiB RAM:

| Route | First compile/request | Warm request |
| --- | ---: | ---: |
| `/` | 5545.5 ms | 163.6 ms |
| `/projects/all` | 5110.8 ms | 159.6 ms |
| `/account` | 3014.1 ms | 148.8 ms |
| `/signature-center` | 2610.0 ms | 285.6 ms |
| `/studio` | 4929.3 ms | 65.7 ms |

The Next server used approximately 794 MiB RSS and the generated `.next` directory was 4.3 MiB. The prior Webpack observation was approximately 3.2 GiB RSS and 1.6 GiB of generated output. These are reporting-only results; repeat after the upgraded Codespace is restarted before enforcing thresholds.

## Repeatable measurement

Start the app with `pnpm dev`, then run:

```bash
pnpm diagnose:dev
pnpm benchmark:dev
pnpm benchmark:dev -- --json
```

Measure the same routes twice: `/`, `/projects/all`, `/account`, `/signature-center`, and `/studio`. The first pass represents lazy route compilation; the second is warm navigation.

Performance remains reporting-only until three comparable runs establish a stable upgraded-machine baseline. Proposed enforcement targets are documented in the project goal and must not be enabled using a single noisy run.

## Upgraded-machine checkpoint (4 CPU, 16 GiB)

Measured on 2026-07-19 with Next.js 16.2.6 and Turbopack:

- Development startup: 1.22 seconds.
- Warm requests: root 86.3 ms, projects 103.5 ms, account 80.0 ms, signature center 166.9 ms, Studio 135.2 ms.
- Simple HMR p95: 449.5 ms.
- Studio HMR p95: 161.5 ms.
- Fifty route/edit cycles: zero crashes, 3.77 GiB maximum RSS, and 3.69 GiB final RSS.
- RSS growth during the corrected CSS hot-update stress run was 119.2 percent, and 28 hot-update signals required a browser reload recovery. The growth threshold is therefore not enforced. The scheduled performance workflow runs the same 50 cycles over 90 minutes and preserves the report for trend comparison.

The navigation and HMR targets pass. Memory remains reporting-only until three comparable scheduled runs establish whether retained Turbopack compiler memory plateaus; no result is hidden or treated as passing prematurely.
