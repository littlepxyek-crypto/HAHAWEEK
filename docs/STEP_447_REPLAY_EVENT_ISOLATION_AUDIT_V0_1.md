# STEP 447 — Replay Event Isolation Audit v0.1

Status: IMPLEMENTATION CANDIDATE
Step: 447
Base: main at `14381d38c2258f5e1888de5b9f24dabf18abf212`

## Purpose

Audit whether the frozen authoritative replay boundary provides complete event-data isolation from its input envelope.

## Finding

The replay adapter currently clones each derived event with a shallow object spread. If an event contains nested objects or arrays, the replay result can retain aliases to nested input data.

That is inconsistent with the boundary invariant that replay output must be isolated from authoritative evidence input.

## Required correction

Replay MUST deep-clone each derived event before returning it.

The correction MUST:

- preserve event values;
- prevent nested output mutation from mutating the input envelope;
- preserve deterministic replay;
- retain AUTHORITATIVE-only enforcement;
- retain provenance validation;
- expose no cursor/runtime/raw-store/V4 authority.

## Verification vectors

1. nested event data is isolated from the input;
2. top-level event data remains intact;
3. identical authoritative input produces identical replay output;
4. malformed/non-authoritative evidence remains rejected;
5. no production state authority is exposed.

## Safety

No Formation Contract semantic change.
No live capture/backfill.
No RPC ingestion redesign.
No cursor migration.
No raw-store migration.
No V4 activation.
No predictive scoring.
No trading or signing.

Design Gate 2 remains OPEN.
Production V4 remains NOT AUTHORIZED.
