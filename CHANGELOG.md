# Changelog

## Unreleased

- Free profile (default): `HAHAWEEK_PROFILE=free|fast`. `free` uses 100-block batches and `getLogs` ranges, 2 concurrent header requests, 5 batches per pass and longer sleeps, sized from live probes of the public RPC; `fast` keeps the previous defaults. Explicit variables still override.
- RPC retry: exponential backoff + jitter on HTTP 429/5xx, timeouts and network errors in the provider transport, honouring `Retry-After`; exhausted retries surface `RPC_UNAVAILABLE` (retryable) and leave the cursor unchanged. ethers' internal 429 loop disabled; `rpcCall` no longer multiplies attempts.
- `src/pass.js`: one bounded pass that keeps a previous fail-closed STOP across processes (exit 78; `--resume-after-stop` for operators).
- `.github/workflows/ingest-scheduled.yml`: free scheduled ingestion every 30 min + manual dispatch, no secrets, read-only token, no overlapping runs, state in the Actions cache; refuses to restart from empty state after earlier successes. Active once merged to `main`.
- Docs: Termux instructions, profile table and probe evidence in README/ARCHITECTURE, `.env.example` rewritten. docker-compose defaults to the `fast` profile.
- Ingestion: Docker/systemd run `src/runner.js` (fail-closed STOP no longer restart-loops); configurable batch size, batches per pass, log range and header concurrency with defaults for ~10 blocks/s; concurrent header fetch; `HAHAWEEK_START_BLOCK` backfill; `HAHAWEEK_RPC_URL`; RPC URL redaction in logs, health, state, source IDs and CI artifacts.
- Docs: root `ARCHITECTURE.md` describes the as-built system (stage status, entry points, storage, chain, gaps); `DATA_SCHEMA.md`, `EVENT_SCHEMA.md`, `EVIDENCE_MODEL.md`, `TEST_PLAN.md`, `ROADMAP.md` filled; empty root `DECISIONS.md` removed (log lives in `docs/DECISIONS.md`).
- Docs: STEP records moved to `docs/archive/`; README claims corrected; prose-only documentation tests removed.
- Fix (#817): removed the raw-to-formation bypass (`src/core/pool-formation.js`) and disabled the legacy single-block ingestion path.

Earlier history: see `PROJECT_STATE.md` and `docs/archive/`.
