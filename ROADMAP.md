# Roadmap

Priority order from the 2026-10-26 architecture audit. Status is updated as PRs land.

1. **Honest docs, one source of truth** (S). Root `ARCHITECTURE.md`, fill/remove empty root docs, archive STEP records to `docs/archive/`, drop prose-assertion tests.
2. **Ingestion that keeps up with the chain** (M). _In progress: runner entrypoint, configurable ranges, concurrent headers, start block, RPC redaction._ Run through `src/runner.js` in Docker/systemd, larger configurable block ranges, concurrent header fetch, configurable start block / backfill, keyed RPC from env with redaction.
3. **Live derivation stage** (M–L). After each accepted batch, read new `canonical_evidence` from the DB and run formation adapter → completeness → radar candidate; persist append-only tables bound to the authority generation.
4. **Delayed validation and reporting** (M). Scheduled job for formations whose 7-day window has ended: historical outcome → liquidity survival → validation → research report from the DB, persisted. Shrink `scripts/hfi-mvp-runtime-verify.js` to call `src`; unify raw ID scheme.
5. **Output surface** (S–M). CLI on the read-only query service (`hahaweek radar|formations|report <id>`) and a static JSON/HTML feed.
6. **Run it for real** (S). Started in PR #819: free scheduled GitHub Actions pass with state in the Actions cache (`ingest-scheduled.yml`) and a Termux recipe. Window-watch mode (feat/window-watch) keeps up with new pools on the free RPC and adds epoch retention. Still open: backup of `data/`, a real SQLite engine for long runs (sql.js still exports the whole DB at each batch), wiring `evidence-coverage` into a live formation stage (step 3), or a keyed RPC + `fast` profile for full contiguous history.
7. **CI cleanup and hardening** (S). Mainnet-RPC workflows on schedule/manual, pin actions to SHAs, one Node version with `npm ci`, remove dead/duplicate modules, fix `bin/` shebang.
8. **Reorg and authority semantics** (M). Treat a `block_hash` change as a reorg instead of `INTEGRITY_CONFLICT`, single-source `CHAIN_ID`, wire or retire `authority-activation-state`.
