# STEP 549 — F-03 Durable Expected-Authority Source Analysis & Design Finding v0.1

Status: BLOCKED — PREREQUISITE MISSING

## Repository-grounded finding

The STEP 549 implementation contract requires the expected authority commitment to be read from an existing durable persisted evidence/checkpoint representation.

Inspection of the current repository shows:

- `src/core/database.js` persists raw events, canonical evidence, and generic ingestion state.
- `src/core/evidence-repository.js` persists/verifies canonical evidence linked to raw events.
- `src/core/block-cursor.js` persists only the cursor state through `state.json`.
- `src/core/f03-production-authority-record.js` validates an authority record in memory.
- `src/core/f03-ingestion-authority-integration.js` still receives `expectedAuthorityFactory` as an injected source.
- No durable production checkpoint/manifest/segment authority record containing the complete F-03 commitment tuple and provenance exists in the current persistence schema.

The normative V4 checkpoint documents are deliberately offline/design boundaries and explicitly do not authorize production checkpoint handling.

## Consequence

The existing durable persistence cannot currently provide all required fields:

- segmentId
- manifestDigest
- checkpointDigest
- generation
- cursorBlock
- exact fromBlock/toBlock range
- durable provenance
- explicit segment → manifest → checkpoint linkage

Constructing these values from the submitted authority, cursor state, or unrelated evidence would violate STEP 549 and would manufacture authority.

Therefore the implementation MUST NOT proceed by adding an adapter that merely wraps an injected factory, deriving missing commitments, or silently extending unrelated state.

## Required next prerequisite

A separate reviewed contract is required for a minimal durable checkpoint/authority persistence boundary that records and verifies the exact F-03 commitment and its provenance/linkage before the existing authority gate can consume it.

That prerequisite must preserve:
- existing raw/canonical evidence;
- existing cursor semantics;
- existing cryptographic binding;
- checkpoint-before-cursor ordering;
- fail-closed behavior;
- no V4 production activation.

## Design decision

STEP 549 implementation is intentionally blocked rather than weakened.

No production runtime code is changed.

Gate 2 remains NOT PASSED.
