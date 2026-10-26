# STEP 552 — F-03 Durable Authoritative Chain Persistence Boundary Contract v0.1

Status: CONTRACT DEFINITION
Step: 552
Baseline: STEP 551 reconciled on `main`

## 1. Purpose

Define the minimal durable persistence boundary for the authoritative chain required by STEP 550:

`verified segment -> verified manifest -> verified checkpoint`.

This contract is a prerequisite for implementing the durable F-03 expected-authority source. It does not activate V4 production authority and does not declare Design Gate 2 PASS.

## 2. Repository finding being closed

STEP 551 established that current durable persistence contains raw/canonical evidence and cursor/runtime state but does not provide authoritative persisted segment, manifest, and checkpoint records with independently verifiable linkage.

Therefore implementation MUST NOT manufacture or derive the missing chain from the submitted live authority, block ranges, or insufficient persistence.

## 3. Scope

This contract covers only:

1. durable segment commitment records;
2. durable manifest commitment records;
3. durable checkpoint commitment records;
4. explicit immutable linkage between them;
5. provenance;
6. atomic persistence and deterministic read;
7. integrity/collision handling;
8. restart durability;
9. independent linkage verification;
10. the read boundary consumed by STEP 550.

It does not authorize:

- V4 production activation;
- cursor reset or replacement;
- historical evidence rewrite;
- migration of existing authority records;
- RPC/provider changes;
- replacement of the existing fail-closed authority gate.

Any migration requirement is a separate contract/STEP.

## 4. Exact authoritative-chain record model

The persistence boundary MUST represent three distinct record classes.

### 4.1 Segment record

Required integrity-critical fields:

- `segmentId`
- `fromBlock`
- `toBlock`
- `segmentDigest`
- `generation`
- `provenance`
- `committedAt`

Rules:

- `segmentId` is immutable identity;
- `fromBlock` and `toBlock` are exact non-negative integers;
- `fromBlock <= toBlock`;
- `segmentDigest` is the canonical digest of the verified segment artifact;
- `generation` uses the existing V4 generation contract;
- provenance is mandatory and immutable;
- malformed or incomplete records fail closed.

### 4.2 Manifest record

Required integrity-critical fields:

- `manifestId`
- `manifestDigest`
- `generation`
- `segmentId`
- `segmentDigest`
- `provenance`
- `committedAt`

Rules:

- manifest identity and digest are immutable;
- referenced `segmentId` and `segmentDigest` MUST identify the same verified segment record;
- manifest generation MUST equal its referenced segment generation where the existing V4 protocol requires generation continuity;
- matching ranges alone MUST NOT establish linkage;
- manifest integrity MUST be independently verifiable.

### 4.3 Checkpoint record

Required integrity-critical fields:

- `checkpointDigest`
- `generation`
- `manifestId`
- `manifestDigest`
- `provenance`
- `committedAt`

The checkpoint input itself MUST obey the frozen normative contract in `docs/V4_NORMATIVE_CHECKPOINT_INPUT_CONTRACT.md`.

Rules:

- checkpoint digest MUST verify against the exact normative checkpoint input;
- referenced manifest MUST exist and verify;
- `manifestDigest` MUST match the verified manifest;
- `generation` MUST match the referenced manifest generation;
- no checkpoint is authoritative from its local digest alone.

## 5. Explicit chain linkage

Authority requires all links to verify independently:

```
SEGMENT
  |
  | segmentId + segmentDigest
  v
MANIFEST
  |
  | manifestId + manifestDigest + generation
  v
CHECKPOINT
  |
  | checkpointDigest + generation
  v
STEP 550 durable authority record
  |
  v
cursor boundary
```

A block-range match is never sufficient proof of linkage.

Every referenced identity and digest MUST resolve to the corresponding persisted record and MUST independently verify.

Missing, mismatched, ambiguous, stale, or corrupt linkage MUST fail closed.

## 6. Provenance contract

Each record MUST retain immutable provenance sufficient to identify:

- persistent record identity;
- persistence mechanism;
- persistence location/key;
- exact artifact identity;
- exact range where applicable;
- referenced upstream record;
- commit/creation timestamp;
- generation;
- integrity digest.

Provenance MUST NOT be reconstructed from the submitted live authority.

Provenance mutation for an existing authoritative identity MUST be classified as an integrity conflict.

## 7. Persistence mechanism decision

Implementation MUST first establish whether the existing SQLite persistence can represent the three record classes and their linkage without ambiguity.

The current repository persistence identified by STEP 551 does not currently provide these records.

If implementation requires new SQLite tables, the implementation contract/analysis MUST justify:

1. why existing tables cannot safely represent the chain;
2. exact schema;
3. uniqueness constraints;
4. foreign-key/linkage constraints where appropriate;
5. atomic write boundary;
6. schema-version handling;
7. backward compatibility without historical rewrite.

No schema migration is authorized by this contract alone.

## 8. Identity and uniqueness

Authoritative identities MUST be deterministic and immutable.

At minimum:

- segment identity MUST uniquely identify one segment artifact;
- manifest identity MUST uniquely identify one manifest artifact;
- checkpoint identity MUST uniquely identify one exact checkpoint input/digest.

For an identical identity:

`same identity + same verified content/digest = IDEMPOTENT`

For conflicting content/digest:

`same identity + different content/digest = INTEGRITY_CONFLICT`

Conflicts MUST NOT be hidden with:

- `INSERT OR IGNORE`;
- overwrite;
- replacement;
- normalization;
- regeneration;
- latest-wins behavior.

Multiple authoritative records for one exact authority identity MUST fail closed.

## 9. Atomicity and durability

A chain commit MUST NOT expose a partially authoritative chain.

The implementation MUST ensure that a durable reader cannot observe an authoritative checkpoint whose required manifest or segment linkage is absent or unverifiable.

A successful persistence operation MUST survive process restart.

Crash/interruption tests MUST prove that partial writes cannot become authoritative.

The cursor MUST remain unchanged on any failed chain commit.

## 10. Read boundary

The authoritative-chain reader consumed by STEP 550 MUST:

- be deterministic;
- be side-effect-free;
- perform no writes;
- perform no cursor mutation;
- perform no evidence mutation;
- perform no checkpoint repair;
- perform no manifest repair;
- perform no normalization;
- reject zero matches;
- reject multiple matches;
- reject stale matches;
- reject wrong-range matches.

Repeated reads of identical persisted state MUST produce identical results.

## 11. Range semantics

Where an authority lookup is range-scoped:

- `fromBlock` and `toBlock` MUST be exact integers;
- no coercion;
- no wildcard;
- no latest semantics;
- no alternate encoding;
- `fromBlock <= toBlock`.

A record outside the requested range MUST never be substituted.

A range match does not prove segment/manifest/checkpoint linkage.

## 12. Generation semantics

Generation MUST remain an integrity coordinate, not a substitute for linkage.

Required checks include:

- segment generation is valid;
- manifest generation is valid;
- checkpoint generation is valid;
- checkpoint generation equals referenced manifest generation;
- required segment/manifest generation continuity is verified;
- cursor generation cannot exceed verified checkpoint generation.

Generation mismatches fail closed.

## 13. Authority separation

The submitted live authority is NEVER a source for constructing persisted expected authority.

The durable chain MUST originate from committed persisted artifacts.

The expected authority consumed by STEP 550 MUST be independently read from this durable chain.

If submitted authority differs from the durable chain, the existing cryptographic binding layer MUST classify the difference as a binding conflict.

No repair or reconciliation from the submitted authority is permitted.

## 14. Fail-closed matrix

The implementation MUST reject at minimum:

- missing segment;
- missing manifest;
- missing checkpoint;
- malformed segment;
- malformed manifest;
- malformed checkpoint;
- incomplete required fields;
- invalid range;
- wrong range;
- invalid segment digest;
- invalid manifest digest;
- invalid checkpoint digest;
- segment digest mismatch;
- manifest digest mismatch;
- checkpoint digest mismatch;
- missing segment-to-manifest linkage;
- missing manifest-to-checkpoint linkage;
- invalid segment linkage;
- invalid manifest linkage;
- generation mismatch;
- stale record;
- ambiguous candidates;
- integrity conflict;
- corrupted persistence;
- interrupted/partial commit;
- restart state missing required records;
- submitted authority attempting to manufacture expected authority;
- submitted authority differing from durable authority;
- cursor advancement before authority validation.

No failure may silently downgrade to `UNGUARDED`.

## 15. Cursor ordering

The authoritative sequence remains:

`evidence -> segment -> manifest -> checkpoint -> durable authority -> authority validation/binding -> cursor`.

Cursor advancement is prohibited until:

1. persistence commit succeeds;
2. segment linkage verifies;
3. manifest linkage verifies;
4. checkpoint linkage verifies;
5. durable authority record resolves exactly;
6. production authority validation succeeds;
7. cryptographic authority binding succeeds.

This contract does not change the existing cursor implementation by itself.

## 16. Concurrency

The persistence boundary MUST preserve single-authority semantics under concurrent writers.

Required behavior:

- competing identical commits may converge idempotently;
- conflicting commits MUST fail closed;
- no writer may replace another writer's authoritative record;
- a reader MUST NOT observe an authority chain that is only partially committed;
- existing writer fencing MUST remain enforced.

Concurrency behavior MUST be covered by executable tests.

## 17. Historical preservation

Implementation MUST NOT:

- delete historical evidence;
- rewrite historical segment/manifest/checkpoint artifacts;
- reset cursor;
- rewrite golden vectors;
- mutate frozen normative contracts;
- silently migrate malformed historical records;
- silently normalize old records.

If historical data requires migration, stop and create a separate migration contract/STEP.

## 18. Required executable test categories

Implementation MUST provide tests for:

### Positive

- complete valid segment → manifest → checkpoint chain;
- exact-range lookup;
- deterministic repeated read;
- restart/reload persistence;
- idempotent identical commit;
- valid provenance;
- valid generation continuity.

### Negative

- missing segment;
- missing manifest;
- missing checkpoint;
- wrong range;
- malformed record;
- incomplete record;
- missing provenance;
- invalid digest;
- invalid segment linkage;
- invalid manifest linkage;
- missing linkage;
- generation mismatch;
- stale chain;
- ambiguous chain;
- integrity conflict;
- partial commit;
- crash/restart;
- concurrent conflicting writers;
- read-path nonmutation;
- submitted-authority manufacture attempt;
- submitted-authority mismatch;
- checkpoint-not-committed;
- cursor-before-authority attempt.

## 19. Security/regression requirements

The implementation MUST preserve:

- F-03 fail-closed authority binding;
- checkpoint-before-cursor ordering;
- existing single-writer fencing;
- legacy write barrier;
- raw/canonical evidence integrity;
- recovery behavior;
- reorg-aware historical evidence;
- existing tests and golden vectors.

No test may be weakened solely to obtain a green result.

## 20. V4 boundary

This contract does NOT:

- activate V4 production authority;
- declare F-03 VERIFIED;
- declare Design Gate 2 PASS;
- replace the existing authority gate;
- authorize production cursor migration.

F-03 remains CONDITIONAL until implementation, independent verification, tests, security/regression, CI, merge, post-merge verification, and reconciliation demonstrate the complete chain.

## 21. Acceptance criteria

STEP 552 is contract-complete only when:

1. exact segment/manifest/checkpoint record models are documented;
2. explicit linkage semantics are documented;
3. provenance requirements are documented;
4. persistence mechanism decision is justified;
5. identity/collision policy is explicit;
6. atomicity/durability requirements are explicit;
7. exact-range semantics are explicit;
8. generation semantics are explicit;
9. authority separation is explicit;
10. fail-closed matrix is explicit;
11. cursor ordering is preserved;
12. concurrency requirements are explicit;
13. historical preservation is explicit;
14. executable test categories are defined;
15. security/regression requirements are defined;
16. V4 remains inactive.

## 22. Traceability

Requirement
-> STEP 550 durable authority persistence contract
-> STEP 551 analysis/design finding
-> STEP 552 authoritative-chain persistence contract
-> implementation analysis/design
-> code
-> test
-> security/regression
-> CI
-> review
-> merge
-> post-merge verification
-> reconciliation
-> documentation
-> next STEP.
