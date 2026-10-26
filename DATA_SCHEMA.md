# Data Schema

Storage lives in `HAHAWEEK_DATA_DIR` (default `./data`). The SQLite file is managed by
`src/core/database.js` (sql.js, schema version **9**). DDL is the source of truth; this is a map.

## SQLite tables written by the live runtime

| Table | Written by | Purpose |
|---|---|---|
| `schema_meta` | `database.js` | Schema version. |
| `raw_events` | `raw-event-store.js` | Raw PoolManager logs (mirror of `raw-events.jsonl`). |
| `canonical_block_decisions`, `canonical_decision_snapshots`, `canonical_decision_snapshot_blocks` | `canonical-decision-input.js` | Block headers (hash, parent hash, decision head, confirmation depth, source) used to decide a range is canonical. |
| `canonical_evidence` | `runtime-canonical-lineage.js`, `evidence-repository.js` | Canonical evidence derived from raw events (identity hash, canonical JSON, provenance). |
| `canonical_transitions`, `canonical_lineage` | `runtime-canonical-lineage.js` | Range lineage: `INITIAL`, `CONTINUATION`, `REORG_REPLACEMENT`. |
| `processing_results`, `processing_result_evidence` | `processing-result-persistence.js` | One verified processing result per batch and its evidence set. |
| `f03_segments`, `f03_manifests`, `f03_checkpoints` | `f03-authoritative-chain-persistence.js` | F-03 segment → manifest → checkpoint chain. |
| `production_authority_lifecycle` | `production-authority-lifecycle.js` | Durable authority record binding a batch to its cursor block. |

## Tables present but not written by the live runtime

`pools`, `liquidity_events`, `flow_windows`, `ingestion_state` — used only by `scripts/live-*-gate.js` or not at all. `derived_projection_lifecycle` — written by `analytical-reorg-lifecycle.js` (verification script only).

## Files

| File | Purpose |
|---|---|
| `hahaweek.sqlite` | The database above. |
| `raw-events.jsonl` | Append-only raw log records (see [EVENT_SCHEMA.md](EVENT_SCHEMA.md)). |
| `state.json` | Cursor (`lastProcessedBlock`, `lastVerifiedCursor`) and operational state/failure. |
| `writer-fence-state.json` (+ `.lock`) | Single-writer lease. |
| `legacy-write-state.json` | Legacy-write freeze flag. |
