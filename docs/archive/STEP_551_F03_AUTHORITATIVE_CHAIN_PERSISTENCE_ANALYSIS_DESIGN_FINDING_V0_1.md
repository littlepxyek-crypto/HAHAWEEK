# STEP 551 — F-03 Durable Authority Persistence Analysis/Design Finding v0.1

Status: ANALYSIS/DESIGN BLOCKER
Step: 551
Baseline: STEP 550 reconciled on main

## 1. Finding

STEP 550 defines the durable F-03 authority record boundary, but the current repository does not yet persist the upstream authoritative chain required to populate or independently verify that record:

`segment -> manifest -> checkpoint`.

The existing persistence inspected on `main` contains raw/canonical evidence and ingestion cursor state, but no durable production segment, manifest, or checkpoint records carrying the required commitments and provenance.

## 2. Evidence

Current `src/core/database.js` persists:

- `raw_events`
- `pools`
- `liquidity_events`
- `flow_windows`
- `ingestion_state`
- `canonical_evidence`

Current `src/core/state.js` persists cursor/runtime state only.

No existing durable representation was found that can unambiguously provide all of:

- `segmentId`
- `manifestDigest`
- `checkpointDigest`
- `generation`
- `cursorBlock`
- exact `fromBlock/toBlock`
- immutable provenance
- independently verifiable segment-to-manifest-to-checkpoint linkage.

## 3. Design consequence

Implementing STEP 550's durable expected-authority reader now would require one of the prohibited behaviors:

1. manufacturing the expected authority from the submitted live authority;
2. deriving checkpoint/manifest/segment commitments from insufficient state;
3. silently introducing a second authoritative source without a reviewed contract;
4. treating matching block ranges as proof of chain linkage.

All four are rejected.

## 4. Existing authority boundary remains unchanged

The current fail-closed authority gate remains authoritative at the ingestion boundary:

`processor -> persistence -> authority validation/binding -> cursor`.

No cursor reset, authority bypass, silent fallback, or V4 activation is permitted.

## 5. Required next contract

Before STEP 550 runtime implementation can proceed, a separately reviewed contract is required for the minimal durable authoritative-chain persistence boundary covering:

1. durable segment commitment;
2. durable manifest commitment;
3. durable checkpoint commitment;
4. explicit segment -> manifest -> checkpoint linkage;
5. provenance and immutable identity;
6. atomic persistence;
7. exact-range lookup;
8. restart durability;
9. integrity-conflict detection;
10. fail-closed missing/ambiguous/stale linkage;
11. independent verification of each upstream commitment;
12. no construction from submitted live authority;
13. no historical rewrite or migration without a separate contract;
14. no V4 production activation.

The implementation contract must establish whether an existing persistence representation can safely host this chain. If not, any schema/persistence change must be justified explicitly before code is written.

## 6. Scope decision

No production code is changed in STEP 551 because the required authoritative upstream persistence does not exist.

Creating an adapter around `expectedAuthorityFactory` would only disguise the missing durable source and would violate STEP 550.

## 7. Gate status

F-03 remains CONDITIONAL.

Design Gate 2 remains NOT PASSED.

V4 production activation remains inactive.

## 8. Traceability

Requirement -> STEP 550 Persistence Contract -> STEP 551 Analysis/Design Finding -> next authoritative-chain persistence contract -> implementation -> tests -> CI -> merge -> post-merge verification -> reconciliation.
