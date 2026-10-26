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
| `src/pass.js` | One pass for schedulers that start a new process each time (GitHub Actions cron, Termux). Before touching RPC it reads `state.json`: a previous **non-retryable** failure is a fail-closed STOP (exit 78, no pass) until an operator passes `--resume-after-stop`. A retryable provider failure exits 0 with a warning (cursor unchanged; next pass retries). |
| `src/watch.js` | Window mode loop: runs `src/pass.js` in a fresh process, sleeps `HAHAWEEK_LOOP_SLEEP_MS`, backs off on errors, stops on exit 78 (see §3b). |
| `src/runner.js` | Long-running loop (in window mode it delegates to `src/watch.js`): `health.js` → `index.js` → sleep (`HAHAWEEK_LOOP_SLEEP_MS`, or `HAHAWEEK_CATCHUP_SLEEP_MS` while a pass hit its batch cap). Retryable failures back off; a non-retryable state is a fail-closed STOP: exit code 78, or stay idle with `HAHAWEEK_RUNNER_ON_STOP=hold`. |
| `src/health.js` | Checks RPC chain ID and head, prints operational state. Used as Docker healthcheck. |
| `src/status.js` | Prints persisted operational state from `state.json` (no RPC). |
| `bin/hahaweek` | Shell wrapper around the above (Termux shebang). |
| `deploy/`, `Dockerfile` | Both run `src/runner.js`. Docker uses `HAHAWEEK_RUNNER_ON_STOP=hold` so `restart: unless-stopped` cannot restart-loop a BLOCKED state; systemd uses `Restart=on-failure` + `RestartPreventExitStatus=78`. No deployed host is recorded in this repository. |

## 3. Profiles, throughput and start block

`HAHAWEEK_PROFILE` selects the defaults: **`free`** (default) or **`fast`**. Any explicit variable overrides the profile value.

| Variable | free | fast | Meaning |
|---|---|---|---|
| `HAHAWEEK_CHUNK_SIZE` (`CHUNK_SIZE`) | 100 | 500 | Blocks per verified batch. |
| `HAHAWEEK_LOG_CHUNK_SIZE` | 100 | 500 | `eth_getLogs` range per call (an explicit `CHUNK_SIZE` sets it too). |
| `HAHAWEEK_MAX_BATCHES_PER_RUN` (`MAX_BATCHES_PER_RUN`) | 5 | 20 | Batches per pass. |
| `HAHAWEEK_HEADER_CONCURRENCY` | 2 | 8 | Concurrent header requests per batch (results validated in block order). |
| `MAX_RPC_CALLS_PER_RUN` | 1000 | 4096 | Budget for budgeted calls (`getLogs`, head). |
| `HAHAWEEK_RPC_TIMEOUT_MS` (`RPC_TIMEOUT_MS`) | 30000 | 15000 | Per-request timeout. |
| `HAHAWEEK_RPC_RETRY_MAX_ATTEMPTS` | 6 | 4 | Attempts per RPC request. |
| `HAHAWEEK_RPC_RETRY_BASE_MS` / `_MAX_MS` | 2000 / 60000 | 250 / 10000 | Backoff base and cap. |
| `HAHAWEEK_LOOP_SLEEP_MS` / `HAHAWEEK_CATCHUP_SLEEP_MS` | 60000 / 15000 | 5000 / 250 | Runner sleeps. |
| `HAHAWEEK_START_BLOCK` | empty | empty | First block when no cursor exists (backfill). Empty = current safe head. Ignored once a cursor exists. |

### Free profile: why these numbers

Probed against `https://rpc.mainnet.chain.robinhood.com` on 2026-10-26 (a handful of requests):

- The chain makes **~9.6 blocks/s** (100,000 blocks in 10,418 s), ~830k blocks/day.
- PoolManager logs: **~1.1 logs and ~1 KB per block**. `getLogs` over 100 blocks: 108 logs / 97 KB / ~110 ms; 500 blocks: 783 KB; 2,000 blocks: 2.7 MB; 10,000 blocks: rejected with `-32000 logs matched by query exceeds limit of 10000`. 100-block log ranges keep every response small and far from that cap.
- `eth_getBlockByNumber` (no txs): ~2.4 KB each. Latency swung between **~90 ms and ~1.1–1.4 s** per request within minutes. No HTTP 429 was seen, even with 24 requests in parallel; the endpoint is behind Cloudflare and sends no rate-limit headers. Concurrency 2 is a polite choice, not a measured limit.
- One free pass = 500 blocks ≈ 500 header requests + 5 `getLogs` ≈ **1.7 MB downloaded**, 6 s to ~6 min depending on latency. Measured: 100 blocks in 6 s and 100 blocks in 73 s (all time spent waiting on RPC).
- ethers also sends an `eth_chainId` before most sequential `getBlock` calls (network check), so real request count is ~1.5 per header at concurrency 2.

**The free profile does not keep up with the chain head.** It ingests a contiguous, authority-checked range at a polite pace; lag behind the head grows. Tracking the head needs ~10 verified headers/s, i.e. the `fast` profile on a keyed RPC.

### RPC retry

`src/core/rpc.js` builds a `BackoffJsonRpcProvider` whose transport (`_send`) is the single retry point for every RPC call of the live path (`src/core/rpc-backoff.js`):

- retried: HTTP 429, HTTP 5xx, timeouts, connection errors, JSON-RPC rate-limit errors (`-32005`, `-32029`, "rate limit"/"too many requests");
- not retried: everything else (bad params, the 10,000-log cap, chain-ID mismatch);
- delay: exponential, `base·2^(n-1)` capped at the max, jittered within [½, 1] of that step;
- `Retry-After` (seconds or HTTP-date) replaces the computed delay; if it asks for more than the max delay, the pass gives up at once instead of waiting or hammering;
- ethers' own hidden 429 loop is disabled so the above is the only one; `rpc-call.js` does not re-retry an error the transport already gave up on;
- after the last attempt the call fails with `RPC_UNAVAILABLE` (failure class `PROVIDER_UNAVAILABLE`, retryable). The batch fails before the authority gate, so **the cursor does not move**.

The SQLite file is exported at each batch's commit boundaries (processing context, lineage, authority), so larger batches mean far fewer exports per block. Exports are not deferred to once per pass, because the cursor in `state.json` advances per batch and must never get ahead of the evidence on disk.

## 3a. Free runtime: GitHub Actions schedule

`.github/workflows/ingest-scheduled.yml` runs **one bounded `src/pass.js` pass with the free profile** at minutes 7 and 37 of every hour, plus `workflow_dispatch`. GitHub runs `schedule:` only from the default branch, so it is active only once merged to `main`.

- No secrets. Token permissions `contents: read`, `actions: read`. The job runs only in `littlepxyek-crypto/HAHAWEEK` on `refs/heads/main`; forks and PRs never run it.
- `concurrency: hahaweek-scheduled-ingestion` (no cancel): two passes never overlap. `timeout-minutes: 25`.
- **State lives in the GitHub Actions cache**, key `hahaweek-state-v1-<run_id>-<attempt>`, restored by prefix (newest first). The whole `data/` directory is saved as one unit after every pass that ran, including failed ones (so a STOP carries into the next run). A cancelled/timed-out pass is not saved; the next run restores the previous consistent snapshot.
  - Why not commit to a `hahaweek-data` branch: the DB grows ~8 KB per block (measured: 3.8 MB after 467 blocks), ~200 MB/day at this cadence. Every commit would store a full new copy and the file passes GitHub's 100 MB hard limit within a day. The cache compresses it ~12× (zstd), needs no write permission and holds 10 GB per repo.
  - Risk: GitHub evicts caches unused for 7 days or when the repo exceeds 10 GB. If the cache is empty but earlier runs succeeded, the job **refuses to start from scratch** (exit 78) unless dispatched with `allow_fresh_state=true`.
- A fail-closed STOP stays stopped: every later run exits 78 without RPC until dispatched with `resume_after_stop=true`.
- Pass size: repo variable `HAHAWEEK_MAX_BATCHES_PER_RUN` or the dispatch input `max_batches` (default 5 = 500 blocks).
- Scheduled workflows in public repos are disabled by GitHub after 60 days without repository activity; re-enable in the Actions tab.

## 3b. Window-watch mode (`HAHAWEEK_MODE=window`)

`HAHAWEEK_MODE` is `contiguous` (default: every block in order, profiles above) or `window`. Window mode trades completeness for timeliness on the free public RPC: it finds **every** new pool, but fully ingests only short windows.

**Stage 1, discovery** (`window-discovery.js`). `eth_getLogs` on the PoolManager with the `Initialize` topic only, in `HAHAWEEK_DISCOVERY_CHUNK_BLOCKS` chunks (100,000), at most `HAHAWEEK_DISCOVERY_MAX_BLOCKS_PER_PASS` (1,000,000) per pass. On `logs matched by query exceeds limit of 10000` the chunk is halved and retried, down to `HAHAWEEK_DISCOVERY_MIN_CHUNK_BLOCKS` (1,000). Discovery is contiguous: its cursor (`scannedThrough`) only advances over completed chunks. The discovery ledger (`<root>/window/discovery-ledger.json`) sits **outside** the evidence epoch and is planning input, not evidence. Without a ledger the first pass starts `HAHAWEEK_DISCOVERY_INITIAL_LOOKBACK_BLOCKS` (200) below the safe head. Probe: 1M blocks ≈ 1.9 s, ~5,300 logs; ~4,400 new pools/day.

**Stage 2, full ingestion** (`window-plan.js`, `IngestionEngine.runPlannedSegments`). Planned per pass, strictly ascending, never past `min(safe head, discovery scannedThrough)` and never at or below the cursor (or, in a fresh epoch, the highest block an earlier epoch ingested):

- a `HAHAWEEK_WINDOW_SEGMENT_BLOCKS` (5) segment from each new pool's `Initialize` block, newest `HAHAWEEK_WINDOW_MAX_POOLS_PER_PASS` (60) pools only;
- the newest `HAHAWEEK_WINDOW_LATEST_BLOCKS` (200) blocks;
- overlapping/adjacent ranges merged, then split into batches of `HAHAWEEK_WINDOW_BATCH_BLOCKS` (= `CHUNK_SIZE`).

Each batch, in order:

1. If it does not start at `cursor + 1`, the skipped range `[cursor + 1, from - 1]` is inserted into `window_gaps` (reason `WINDOW_SKIPPED`, `discovery_scanned` flag) **before** the batch is processed. The row is written to disk by the batch's own commit, so a durable authority lifecycle after a gap always has its gap on disk.
2. The unchanged verified processing context (headers, parent-hash linkage, raw logs, canonical lineage). A batch not adjacent to an earlier lineage resolves to a new **`INITIAL`** lineage (generation 1, no parent): continuity is never claimed across a gap.
3. F-03 / production authority gate; the DB is flushed and the cursor advances only after `AUTHORIZED`. Any failure ends the pass with the cursor on the last authorized batch.

Pools whose `Initialize` block is at or below the cursor leave the pending list: *ingested* when an authorized lifecycle covers that block, otherwise *dropped* (pool cap, or a failed pass). Both are counted in the ledger.

**Integrity.**

- `window_gaps` is append-only (triggers).
- Startup reconciliation (`production-authority-lifecycle-reconciliation.js`) still fails closed on any lifecycle that does not start at `cursor + 1`, **unless** a recorded gap covers exactly `[cursor + 1, lifecycle.from - 1]` (window mode only; contiguous mode never accepts a gap).
- `evidence-coverage.js` classifies any block range as `COMPLETE` (all authorized), `PARTIAL` (rest is recorded gaps) or `UNKNOWN` (some block is neither, e.g. before the epoch). `analyticalCoverageInputs()` maps it to the existing `acquisition_status` (formation completeness → `UNKNOWN`/`ACQUISITION_INCOMPLETE` unless `COMPLETE`), `coverage_status` (outcome / liquidity survival / validation: insufficient unless `COMPLETE`) and `block_range_status`.

**Retention: evidence epochs** (`window-retention.js`). Evidence tables are append-only, so rows are never pruned. `src/pass.js` points `HAHAWEEK_DATA_DIR` at `<root>/epochs/<id>/` (sqlite, JSONL, `state.json` with the cursor, writer fence). A new, empty epoch starts when the current one is older than `HAHAWEEK_EPOCH_MAX_AGE_MS` (24 h) or larger than `HAHAWEEK_EPOCH_MAX_BYTES` (150 MB); `HAHAWEEK_EPOCH_KEEP_OLD` (1) older epochs are kept, older ones deleted whole. Rotation is **held** while the current epoch records a fail-closed STOP (or unreadable state). A new epoch starts with no cursor, so its first batch is `INITIAL`; blocks before it are `UNKNOWN` in that epoch. Per-file overrides (`HAHAWEEK_STATE_FILE`, `HAHAWEEK_DB_FILE`, …) are rejected in window mode. A lock (`<root>/window/pass.lock`) keeps passes on one root from overlapping.

**Entry points.** `src/pass.js` (one pass; epoch + lock + STOP rule) and `src/watch.js` (loop: a fresh `pass.js` process each time; exit 78 stops it). `src/runner.js` delegates to `watch.js` in window mode.

**Measured (public RPC, 2026-10-26, fresh data dirs).**

| Pass | Blocks fully ingested | Wall time |
|---|---|---|
| contiguous free, 2×100 blocks, before this change | 193 | 13.8 s (9 sqlite file writes) |
| contiguous free, 2×100 blocks, after | 200 | 12.7 s (3 writes) |
| window, ~70 s after the previous pass (2–4 segments, 1–3 gaps) | 200–210 | 6.3–8.1 s |
| window, 30 min of chain (17,280 blocks discovered in 0.27 s, 39 pools → 40 segments, 38 gaps) | 390 | 33.9 s |

Header requests dominate (one `eth_getBlockByNumber` per ingested block, ~85 ms average, plus ethers' `eth_chainId` checks). Window mode uses `HAHAWEEK_WINDOW_HEADER_CONCURRENCY` (4): 8 drew occasional HTTP 429s, 4 was almost as fast without any. The old ~200 s / 250 blocks was RPC latency at concurrency 2, not CPU.

**Storage.** Measured 8.5–12.8 KB per fully ingested block in sqlite plus ~1–1.5 KB JSONL. Estimates: GitHub Actions every 30 min ≈ 20–25k blocks/day ≈ 200–350 MB/day (rotates every ~11–18 h, ≤ ~300 MB on disk with 1 old epoch); a Termux loop every ~2 min with 100 latest blocks ≈ 90k blocks/day ≈ 1 GB/day written (rotates every few hours, still ≤ ~300 MB on disk) and ~0.3 GB/day download.

**Detection latency for a new pool** = time to the next pass + pass duration: GitHub Actions up to ~30 min (plus GitHub's schedule delay, often several minutes); a Termux loop sleeping 60–120 s ≈ 1–2.5 min.

**Limits (honest).** Blocks in gaps are not ingested: a pool's activity after its 5-block segment is seen only if it falls in a later segment or latest window. More than 60 new pools between two passes (≈ 90 per 30 min at the average rate) means the older ones are dropped, so the 30-minute Actions cadence misses some pools' detail; a short Termux loop does not. Coverage stays `PARTIAL`/`UNKNOWN` for any range that touches a gap or the time before an epoch.

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
| `writer-fence-state.json` | Single-writer lease (its fence counter is kept across runs). |
| `legacy-write-state.json` | Legacy-write freeze flag. |

In window mode these files live in `<HAHAWEEK_DATA_DIR>/epochs/<id>/`, with `epoch.json` and `window/discovery-ledger.json` at the root (§3b). The DB gains the append-only `window_gaps` table. Writes are committed once per authorized batch (`database.setDeferredSaves` + `flush` before the cursor advances), not once per processing step.

Schema and event identity details: [DATA_SCHEMA.md](DATA_SCHEMA.md), [EVENT_SCHEMA.md](EVENT_SCHEMA.md), [EVIDENCE_MODEL.md](EVIDENCE_MODEL.md).

## 7. Known gaps

1. No live end-to-end path: nothing turns `canonical_evidence` from the DB into formations, validations or reports.
2. No output surface: no query CLI/API, no radar feed, no persisted reports.
3. Throughput is bounded by RPC latency: one header request per block, so a 10,000-block pass needs ~10,000 `eth_getBlockByNumber` calls. The free profile (public RPC) falls further behind the head on every pass. sql.js keeps the whole DB in memory and `canonical_block_decisions` grows by one row per block (~860k/day), so long backfills will eventually need a real SQLite engine (e.g. `better-sqlite3`).
4. The Docker healthcheck (`health.js`) calls RPC and can write a failure state on RPC errors.
5. CHAIN_ID is still defined in two places (`config.js`, `pool-discovery.js`).
6. Raw IDs differ between the live runtime (`4663:block:tx:logIndex`) and the HFI scripts (`raw:v1:<digest>`).
7. A changed `block_hash` for an existing event ID is an `INTEGRITY_CONFLICT` hard stop, not reorg handling. `CHAIN_ID` is defined in two places.
8. Storage grows ~8–13 KB per block (sqlite) + ~1 KB (JSONL). Contiguous mode still has no retention policy; window mode rotates whole evidence epochs (§3b).
9. `PROCESSING_CONTEXT_RECOVERY_PROVIDER_UNAVAILABLE` (provider error during recovery) is classified UNKNOWN, i.e. a STOP, not a retryable provider failure.
10. Mainnet-RPC workflows run on push/PR; actions are not all SHA-pinned; `bin/hahaweek` has a Termux-only shebang.

The plan to close these gaps is in [ROADMAP.md](ROADMAP.md).
