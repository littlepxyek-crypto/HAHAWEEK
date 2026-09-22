# Formation Evidence Reference Contract v0.1

Status: VERIFIED / FROZEN
Step: 450
Scope: deterministic derived evidence reference emitted from a frozen Formation Result

## Purpose

Define the narrow boundary for representing the evidence lineage selected by a VALID Formation Result.

This contract is a derived reference only. It does not create authoritative blockchain evidence and does not replace preserved raw RPC evidence.

## Authority

The output is explicitly DERIVED. It MUST NOT be treated as AUTHORITATIVE evidence.

It MUST:
- consume only a VALID Formation Result;
- preserve Formation ID and rule version;
- preserve selected evidence IDs and event-order references;
- preserve chain and pool context;
- remain deterministic for equivalent Formation Results;
- return a distinct object without retaining mutable input references.

It MUST NOT:
- access or mutate cursor or runtime state;
- write to the raw store;
- manufacture evidence IDs;
- normalize or rewrite raw blockchain payloads;
- promote SYNTHETIC or DISCOVERY_ONLY data;
- activate V4 authority;
- introduce predictive scoring or trading.

## Required fields

The derived reference MUST contain schema_version, evidence_class DERIVED, formation_id, formation_type, formation_rule_version, chain_id, pool_id, evidence_ids, event_order, graph_reference, and provenance_reference.

The processing-only created_at field is intentionally excluded.

## Consistency rules

- Formation state MUST be VALID.
- formation_id MUST be non-empty.
- evidence_ids MUST be a non-empty unique array of strings.
- Every event_order evidence_id MUST occur in evidence_ids.
- Event evidence IDs MUST be unique.
- Provenance chain ID MUST match Formation chain ID.
- Provenance evidence IDs MUST exactly match Formation evidence IDs.
- Graph reference MUST point to the same Formation ID.

## Determinism

Equivalent Formation Results MUST produce equivalent semantic reference content.
Processing metadata such as created_at MUST NOT affect the derived reference.

## Boundary

VALID FORMATION RESULT -> DERIVED EVIDENCE REFERENCE -> downstream analysis/projection

This does not alter the authoritative replay boundary:

AUTHORITATIVE RAW RPC CAPTURE -> AUTHORITATIVE EVIDENCE ENVELOPE -> REPLAY ADAPTER -> FORMATION ENGINE

## Non-goals

- no live capture;
- no backfill;
- no RPC ingestion redesign;
- no cursor migration;
- no raw-store migration;
- no V4 production activation;
- no predictive scoring;
- no trading/signing.

Design Gate 2 remains OPEN.
Production V4 remains NOT AUTHORIZED.

## Verification Result

- PR #104 merged to main.
- Merge commit: `c191f99dafdda710c1f2b267dac28f5fb2ad7845`.
- Security and Regression workflow #1131 completed successfully on the PR head.
- Verified DERIVED-only formation evidence reference, VALID-only acceptance, deterministic semantic content independent of processing metadata, input/output isolation, and lineage consistency.
- No raw evidence, cursor, runtime state, V4 authority, predictive scoring, trading, or signing was changed.
- Design Gate 2 remains OPEN; production V4 remains NOT AUTHORIZED.
