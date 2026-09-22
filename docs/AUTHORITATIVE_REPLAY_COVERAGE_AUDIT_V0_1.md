# Authoritative Replay Coverage Audit v0.1

Status: VERIFIED / FROZEN
Step: 443
Scope: authoritative evidence envelope and replay boundary coverage

## Audit Result

The frozen replay boundary and authoritative evidence envelope are implemented and covered by focused integration tests. The audit identified two documentation-state drifts and a validation edge case requiring hardening before the next freeze:

1. The authoritative evidence envelope contract still declared `IMPLEMENTATION CANDIDATE` although STEP 441 is VERIFIED / FROZEN.
2. The authoritative evidence fixture contract still declared `IMPLEMENTATION CANDIDATE` although STEP 442 is VERIFIED / FROZEN.
3. The executable envelope/replay validators accepted an explicitly supplied `undefined` response payload because presence was checked by property existence alone. A preserved raw RPC response must not be represented by an undefined payload.

## Corrections Applied

- Synchronize the two contract documents to their verified frozen state.
- Reject an undefined `response_payload` at both the envelope and replay boundaries.
- Add adversarial tests covering malformed envelopes and undefined response payloads.
- Preserve the existing authority boundary and Formation Contract semantics.

## Verified Invariants

The audit confirms that replay:
- accepts only AUTHORITATIVE evidence;
- requires schema version 1;
- requires chain, source, evidence ID, request provenance, observation block context, capture metadata, and derived events;
- clones replay events;
- does not expose cursor, runtime state, raw-store authority, or V4 authority;
- produces deterministic Formation IDs for identical inputs;
- rejects SYNTHETIC and DISCOVERY_ONLY classes.

## Non-Goals

No live capture, live backfill, RPC ingestion redesign, cursor migration, raw-store migration, V4 activation, predictive scoring, trading, or signing.
