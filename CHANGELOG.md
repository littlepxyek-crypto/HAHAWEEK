# Changelog

## Unreleased

- Ingestion: Docker/systemd run `src/runner.js` (fail-closed STOP no longer restart-loops); configurable batch size, batches per pass, log range and header concurrency with defaults for ~10 blocks/s; concurrent header fetch; `HAHAWEEK_START_BLOCK` backfill; `HAHAWEEK_RPC_URL`; RPC URL redaction in logs, health, state, source IDs and CI artifacts.
- Docs: root `ARCHITECTURE.md` describes the as-built system (stage status, entry points, storage, chain, gaps); `DATA_SCHEMA.md`, `EVENT_SCHEMA.md`, `EVIDENCE_MODEL.md`, `TEST_PLAN.md`, `ROADMAP.md` filled; empty root `DECISIONS.md` removed (log lives in `docs/DECISIONS.md`).
- Docs: STEP records moved to `docs/archive/`; README claims corrected; prose-only documentation tests removed.
- Fix (#817): removed the raw-to-formation bypass (`src/core/pool-formation.js`) and disabled the legacy single-block ingestion path.

Earlier history: see `PROJECT_STATE.md` and `docs/archive/`.
