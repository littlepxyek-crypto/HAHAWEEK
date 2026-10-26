# HAHAWEEK Architecture (as built)

This file describes what the code in this repository **actually does today**.
It is the single source of truth for architecture status. Older design documents
in `docs/` describe intent and history; where they disagree with this file, this
file wins. Historical STEP records live in `docs/archive/`.

Status labels used below:

| Label | Meaning |
|---|---|
| **LIVE** | Called by the long-running/one-shot runtime (`src/index.js`, `src/runner.js`) against a real RPC. |
| **IMPLEMENTED-NOT-WIRED** | Code and unit tests exist, but the live runtime never calls it. It runs only from tests or from CI verification scripts in `scripts/`. |
| **STUB** | A thin module with no real caller (test-only surface). |
| **MISSING** | Described in the README/design docs, no implementation. |

## 1. Chain and data source

- Chain: **Robinhood Chain mainnet**, chain ID `4663` (Arbitrum Orbit L2, ~100 ms blocks).
- Default RPC: `https://rpc.mainnet.chain.robinhood.com` (public, rate-limited; set `HAHAWEEK_RPC_URL` (or `RPC_URL`) to a keyed endpoint for production). RPC URLs are redacted to scheme + host in logs, health output, `state.json`, persisted source IDs and CI artifacts (`src/core/redact.js`).
- Contract watched: the official **Uniswap v4 PoolManager** `0x8366a39cc670b4001a1121b8f6a443a643e40951` (`src/core/pool-discovery.js`).
- Events: one `eth_getLogs` filter on the PoolManager for `Initialize`, `ModifyLiquidity` and `Swap` (`src/index.js`).
- Configuration: `src/core/config.js` (environment variables, see `.env.example`).

## 2. Live entry points

| Entry point | What it does |
|---|---|
| `src/index.js` | One ingestion pass (`IngestionEngine.runOnce()`), then exits. `--once` is accepted; behaviour is the same. |
| `src/runner.js` | Long-running loop: `health.js` → `index.js` → sleep (`HAHAWEEK_LOOP_SLEEP_MS`, or `HAHAWEEK_CATCHUP_SLEEP_MS` while a pass hit its batch cap). Retryable failures back off; a non-retryable state is a fail-closed STOP: exit code 78, or stay idle with `HAHAWEEK_RUNNER_ON_STOP=hold`. |
| `src/health.js` | Checks RPC chain ID and head, prints operational state. Used as Docker healthcheck. |
| `src/status.js` | Prints persisted operational state from `state.json` (no RPC). |
| `bin/hahaweek` | Shell wrapper around the above (Termux shebang). |
| `deploy/`, `Dockerfile` | Both run `src/runner.js`. Docker uses `HAHAWEEK_RUNNER_ON_STOP=hold` so `restart: unless-stopped` cannot restart-loop a BLOCKED state; systemd uses `Restart=on-failure` + `RestartPreventExitStatus=78`. No deployed host is recorded in this repository. |

## 3. Throughput and start block

| Variable | Default | Meaning |
|---|---|---|
| `HAHAWEEK_CHUNK_SIZE` (`CHUNK_SIZE`) | 500 | Blocks per verified batch. |
| `HAHAWEEK_MAX_BATCHES_PER_RUN` (`MAX_BATCHES_PER_RUN`) | 20 | Batches per pass (10,000 blocks ≈ 17 min of chain time). |
| `HAHAWEEK_LOG_CHUNK_SIZE` | = chunk size | `eth_getLogs` range per call. |
| `HAHAWEEK_HEADER_CONCURRENCY` | 8 | Concurrent header requests per batch (results validated in block order). |
| `HAHAWEEK_START_BLOCK` | empty | First block when no cursor exists (backfill). Empty = current safe head. Ignored once a cursor exists. |

The SQLite file is exported at each batch's commit boundaries (processing context, lineage, authority), so larger batches mean far fewer exports per block. Exports are not deferred to once per pass, because the cursor in `state.json` advances per batch and must never get ahead of the evidence on disk.

## 4. Live pipeline (one batch)

```text
safe head = latest - CONFIRMATIONS
  -> processorRange(from, to)                    src/index.js
       createVerifiedProcessingContext            src/core/runtime-processing-context.js
         canonical decision snapshot (block headers, parent links)  canonical-decision-input.js
         raw getLogs -> raw-events.jsonl + raw_events table          raw-log-ingestion.js, raw-store.js, raw-event-store.js
         canonical lineage -> canonical_evidence                     runtime-canonical-lineage.js
  -> authority gate (F-03 expected authority + production lifecycle)  f03-*.js, production-authority-lifecycle*.js
  -> cursor advance (only if AUTHORIZED)          block-cursor.js, state.json
```

The cursor never advances before the authority gate returns `AUTHORIZED`.
A single-writer fence (`single-writer-fence.js`) and a legacy-write barrier guard every write.

## 5. Stage status

| Stage | Status | Code |
|---|---|---|
| Acquisition (RPC logs + headers) | **LIVE** | `raw-log-ingestion.js`, `rpc*.js`, `canonical-decision-input.js` |
| Acquisition (generic HTTP / "INTERNET") | IMPLEMENTED-NOT-WIRED | `src/acquisition/*` (only `a9-runtime.yml`, against `example.com`) |
| Wallet acquisition | MISSING | — |
| Raw evidence record | **LIVE** | `raw-store.js`, `raw-event-store.js` |
| Canonical evidence | **LIVE** | `canonical-evidence.js`, `evidence-repository.js`, `runtime-canonical-lineage.js` |
| V4 integrity authority (F-03, lifecycle, writer fence) | **LIVE** | `index.js` builds the authority gate for every batch |
| Authority activation state machine | IMPLEMENTED-NOT-WIRED | `authority-activation-state.js` (test-only; the live gate does not consult it) |
| Evidence graph | IMPLEMENTED-NOT-WIRED | `evidence-graph.js` |
| Formation (`POOL_BOOTSTRAP`) | IMPLEMENTED-NOT-WIRED | `hfi-formation-adapter.js`, `pool-bootstrap-formation.js`, `formation-completeness.js` |
| Hypothesis / validation | IMPLEMENTED-NOT-WIRED | `formation-hypothesis-validation.js`, `validation-*.js`, `historical-outcome.js`, `liquidity-survival.js` |
| Intelligence | IMPLEMENTED-NOT-WIRED | `intelligence-projection.js`, `intelligence-evidence-summary.js` |
| Radar | IMPLEMENTED-NOT-WIRED | `hfi-radar-*.js` (CANDIDATE entries via `scripts/hfi-radar-continuous-runtime.js` in CI only) |
| Research report / X content | IMPLEMENTED-NOT-WIRED | `research-report.js`, `x-content-*.js`; nothing is published |
| Query / output surface | STUB | `src/query/*` (test-only) |
| Pools / liquidity / flow tables | IMPLEMENTED-NOT-WIRED | `pool-store.js`, `liquidity-store.js` (only `scripts/live-*-gate.js`) |

Formation → report runs end-to-end only inside `scripts/hfi-mvp-runtime-verify.js`
(CI workflow `hfi-runtime.yml`). That script refetches from RPC, keeps evidence in
memory for one pre-selected pool, bypasses the DB and authority gate, and stores its
result as a CI artifact.

## 6. Storage (`HAHAWEEK_DATA_DIR`, default `./data`)

| File | Content |
|---|---|
| `hahaweek.sqlite` | sql.js database (schema v9). Whole DB is held in memory and exported to disk at each commit boundary. |
| `raw-events.jsonl` | Append-only raw log records (dual-written with the `raw_events` table). |
| `state.json` | Cursor (`lastProcessedBlock`, `lastVerifiedCursor`) and operational state. |
| `writer-fence-state.json` | Single-writer lease. |
| `legacy-write-state.json` | Legacy-write freeze flag. |

Schema and event identity details: [DATA_SCHEMA.md](DATA_SCHEMA.md), [EVENT_SCHEMA.md](EVENT_SCHEMA.md), [EVIDENCE_MODEL.md](EVIDENCE_MODEL.md).

## 7. Known gaps

1. No live end-to-end path: nothing turns `canonical_evidence` from the DB into formations, validations or reports.
2. No output surface: no query CLI/API, no radar feed, no persisted reports.
3. Throughput is bounded by RPC latency: one header request per block, so a 10,000-block pass needs ~10,000 `eth_getBlockByNumber` calls. sql.js keeps the whole DB in memory and `canonical_block_decisions` grows by one row per block (~860k/day), so long backfills will eventually need a real SQLite engine (e.g. `better-sqlite3`).
4. The Docker healthcheck (`health.js`) calls RPC and can write a failure state on RPC errors.
5. CHAIN_ID is still defined in two places (`config.js`, `pool-discovery.js`).
6. Raw IDs differ between the live runtime (`4663:block:tx:logIndex`) and the HFI scripts (`raw:v1:<digest>`).
7. A changed `block_hash` for an existing event ID is an `INTEGRITY_CONFLICT` hard stop, not reorg handling. `CHAIN_ID` is defined in two places.
8. Mainnet-RPC workflows run on push/PR; actions are not all SHA-pinned; `bin/hahaweek` has a Termux-only shebang.

The plan to close these gaps is in [ROADMAP.md](ROADMAP.md).
