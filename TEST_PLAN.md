# Test Plan

## Offline (no network) — run on every change

```bash
npm test                          # node --test, all files in tests/
npm run verify:v4                 # golden vectors
npm run verify:v4:coverage        # golden-vector coverage
npm run verify:source-independence
npm run verify:analytical-reorg
```

`npm test` must report 0 failures. One test that needs live RPC is skipped by default.

## Live RPC (CI workflows, Robinhood Chain mainnet)

| Workflow | Script |
|---|---|
| `hfi-runtime.yml` | `scripts/hfi-mvp-runtime-verify.js` (one pre-selected pool, formation → report) |
| `hfi-radar-runtime.yml` | `scripts/hfi-radar-operational-runtime-verify.js` |
| `hfi-radar-continuous-runtime.yml` | `scripts/hfi-radar-continuous-runtime.js` (real engine, 2 cycles) |
| `a9-runtime.yml` | `src/acquisition` runner against `example.com` |
| `analytical-reorg-runtime.yml` | `scripts/analytical-reorg-runtime-verify.js` |

`test.yml` and `security.yml` run the offline suite and secret checks.

## Rules

- Tests assert behaviour, not documentation wording.
- New runtime behaviour needs unit tests with mocked providers (no network).
