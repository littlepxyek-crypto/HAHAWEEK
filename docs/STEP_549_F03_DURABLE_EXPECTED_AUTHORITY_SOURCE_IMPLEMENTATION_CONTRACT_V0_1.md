# STEP 549 — F-03 Durable Expected-Authority Source Implementation Contract v0.1

Status: CONTRACT DEFINITION
Step: 549
Baseline: STEP 548 merged as `4abc61ddc4021018782012fc6373114fc8f59e46`

## 1. Purpose

Define the narrow implementation boundary required to close the STEP 548 F-03 gap: the expected authority commitment used by the ingestion authority gate MUST be read from durable persisted evidence/checkpoint state for the exact processed range.

This contract does not activate V4 production authority and does not declare Gate 2 PASS.

## 2. Repository-grounded baseline

The current production boundary already has:
- `createAuthorityGate` requiring a distinct expected-authority source.
- `assertProductionAuthority` requiring segmentId, manifestDigest, checkpointDigest, generation, and cursorBlock.
- `assertAuthorityBinding` requiring cryptographic agreement between submitted and expected commitments.
- checkpoint-before-cursor enforcement.
- an existing durable state file and legacy SQLite/raw-event persistence boundaries.

The current `expectedAuthorityFactory` remains an injected source and is therefore insufficient to satisfy STEP 548 until it resolves through a durable evidence/checkpoint reader.

## 3. Required implementation

Create a dedicated, side-effect-free durable expected-authority source boundary.

The source MUST:

1. Read persisted evidence/checkpoint state rather than accepting expected commitments from the submitted live authority.
2. Resolve exactly one authoritative persisted record for the requested `fromBlock`/`toBlock` range.
3. Require exact range identity; wrong-range records MUST fail closed.
4. Require complete commitment fields:
   - segmentId
   - manifestDigest
   - checkpointDigest
   - generation
   - cursorBlock
5. Require durable provenance identifying the persisted evidence/checkpoint record and its storage identity/location.
6. Require explicit linkage proving the checkpoint belongs to the committed manifest/segment chain already covered by F-03.
7. Reject missing evidence, missing checkpoint linkage, malformed records, incomplete records, ambiguous/multiple matching records, and stale/wrong-range records.
8. Never derive, repair, normalize, regenerate, or silently replace a missing/malformed commitment.
9. Never accept the submitted live authority as the source of the expected commitment.
10. Never write cursor, checkpoint, manifest, segment, raw evidence, or runtime state while resolving the expected source.
11. Produce deterministic output for identical persisted state and identical requested range.
12. Preserve the existing STEP 544 cryptographic binding validation and STEP 547 distinct-source/range validation.
13. Preserve checkpoint-before-cursor ordering.
14. Fail closed before cursor advancement whenever the durable source cannot be proven authoritative.

## 4. Authority separation

The implementation MUST maintain these separate roles:

- submitted authority: candidate live authority supplied to the ingestion boundary;
- durable expected authority: independently persisted commitment read from durable evidence/checkpoint state;
- validator: structural validation of each source;
- binding validator: cryptographic equality between candidate and durable expected commitment.

The durable source MUST NOT receive the submitted authority as an input from which it can construct the expected commitment.

## 5. Persistence and provenance requirements

The implementation MUST bind the expected record to the actual durable evidence/checkpoint representation already present in the repository.

It MUST NOT invent a parallel authoritative store merely to satisfy the test.

If the existing persistence model cannot supply all required fields or provenance, the implementation MUST fail closed and document the missing prerequisite rather than manufacture data.

## 6. Negative cases required

Dedicated tests MUST cover at minimum:

- valid persisted record for exact range;
- missing persisted record;
- wrong-range persisted record;
- malformed persisted record;
- incomplete commitment field;
- missing checkpoint linkage;
- ambiguous/multiple matching records;
- stale persisted record;
- submitted authority attempting to manufacture expected commitment;
- submitted authority differing from durable expected commitment;
- deterministic repeated reads;
- read-path nonmutation of cursor/evidence/checkpoint state;
- checkpoint-not-committed rejection before source use.

## 7. Integration boundary

The durable source MUST be wired into the existing `createAuthorityGate` path without weakening existing validation.

The implementation MUST NOT:
- reset the cursor;
- rewrite historical evidence;
- delete evidence;
- change frozen contracts;
- alter RPC/provider semantics;
- perform SQLite schema migration unless a separately reviewed contract proves it necessary;
- activate V4 production authority;
- bypass H-01/H-03 durability or writer controls.

## 8. Acceptance criteria

STEP 549 implementation may be considered verified only when:

1. Dedicated durable expected-authority source exists.
2. It reads actual persisted evidence/checkpoint state.
3. Exact range and provenance are enforced.
4. Complete commitment fields are validated.
5. Segment/manifest/checkpoint linkage is verified.
6. All required negative cases fail closed.
7. Submitted authority cannot manufacture the expected commitment.
8. Read path is side-effect-free.
9. Deterministic replay/read behavior is demonstrated.
10. Existing F-03 cryptographic binding remains mandatory.
11. Existing repository Tests and Security/Regression pass.
12. No historical evidence or frozen contract is mutated.
13. V4 production authority remains inactive.
14. PR, merge, post-merge verification, reconciliation, and documentation are complete.

## 9. Explicit non-claims

STEP 549 does not by itself establish:
- Design Gate 2 PASS;
- full legacy/V4 authority cutover;
- V4 production activation;
- production migration;
- RPC/provider redesign.

Those require separate verified evidence and/or subsequent reviewed steps.

## 10. Traceability

Requirement → STEP 548 Contract → STEP 549 Implementation Contract → Code → Test → Security/Regression → CI → Review → Merge → Post-Merge Verification → Reconciliation → Documentation.
