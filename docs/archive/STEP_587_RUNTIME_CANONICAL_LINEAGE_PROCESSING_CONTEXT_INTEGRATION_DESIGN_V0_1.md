# STEP 587 — Runtime Canonical Lineage / Processing Context Integration Design v0.1

Status: DESIGN
Step: 587
Baseline: 74908d8c44fe181b2beadf3db1547889dce92b98
V4 production activation: INACTIVE

## Objective

Implement the smallest orchestration boundary:

Canonical Decision → Raw Ingestion → STEP 579 Lineage → STEP 568 Durable Verification → Exact Authority Binding → Cursor.

Do not change semantic ownership.

## Orchestration boundary

Proposed adapter:

`processCanonicalRange({ provider, database, writerFence, fromBlock, toBlock, confirmations, chainId, rawLogs, relevantLogFilter, ... })`

Ordering:
1. validate exact range;
2. assert writer fence;
3. capture `database.snapshot()`;
4. create/reconstruct exact canonical decision snapshot;
5. ingest raw evidence for exact range;
6. resolve a contract-approved lineage/generation context;
7. invoke `acceptCanonicalLineage()`;
8. reconstruct/verify immutable context;
9. bind authority to exact context;
10. advance cursor.

No raw counter can satisfy authority/cursor.

## Context

Return at minimum:

```
{
 status: "VERIFIED",
 fromBlock, toBlock,
 processingResultId, processingExecutionId,
 parentResultId, transitionType, generation,
 canonicalEvidenceIds, emptyResult, evidenceSetDigest,
 lineageId, provenance, committedAt,
 canonicalDecisionSnapshotId
}
```

STEP 568/579-owned values pass through unchanged.

## Durability

Outer snapshot is captured before canonical-decision writes. Before durable processing-result success, failures restore it and never reach authority/cursor. After durable success, authority/cursor failure preserves immutable evidence and leaves cursor unchanged.

## Authority

Pass `processingContext` into the existing authority gate. Require VERIFIED status, exact range, and generation/cursor endpoint consistency. Authority remains independent and cannot establish canonicality, parent, transition, generation, evidence, or processing identities.

## Replay/restart/reorg

Identical canonical state/range reuses deterministic identities. Restart after durable result reconstructs it. Reorg remains delegated to STEP 579 and requires the separately contracted replacement-generation rule.

## Concurrency

Use only the existing writer fence. Assert ownership at critical persistence, authority, and cursor boundaries. No second lock.

## Operator output

Project only derived verified fields: range, result ID, lineage ID, transition, generation, digest, authority outcome, cursor outcome. Durable evidence remains authoritative.

## Tests

Cover exact decision/range, empty result, replay, restart, continuation, reorg after generation contract, raw-only boundary, authority mismatch, digest tampering, fence loss, snapshot restore, cursor regression, concurrency, and STEP 578/579 golden vectors.

## Blocking condition

The current contracts provide no safe source for INITIAL or REORG_REPLACEMENT generation. Do not use default 0, parent+1, cursor, authority, timestamp, randomness, or hash truncation. Freeze the generation source and deterministic semantics in the next contract before production code.

V4 production activation remains INACTIVE.
