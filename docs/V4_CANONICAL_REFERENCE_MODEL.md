# HAHAWEEK — V4 Canonical Reference Model

Status: DESIGN-ONLY / READ-ONLY
Protocol: HAHAWEEK-EVIDENCE-V4
Purpose: deterministic reference model for Design Gate 2.

## 1. Non-negotiable rules
- UTF-8 encoding.
- RFC8785 JSON Canonicalization Scheme (JCS).
- SHA-256.
- Protocol integers are unsigned 64-bit decimal strings.
- Exact V4 lexical forms for addresses, hashes, topics, and bytes.
- Unknown keys are forbidden in integrity-critical objects.
- null is allowed only where V4 explicitly permits it.
- No production state, raw evidence, SQLite, cursor, or migration artifact is modified.
- Provider-independent and deterministic.
- FREE-FIRST: offline verification must use open-source tooling.

## 2. Canonical primitive
canonical_bytes(O) = UTF8(RFC8785_JCS(O))
hash(D,O) = SHA256( UTF8(D) || 0x00 || canonical_bytes(O) )

No language-native JSON serialization may substitute for JCS.

## 3. Domain registry
PAYLOAD = HAHAWEEK-EVIDENCE-V4-PAYLOAD
TRANSITION = HAHAWEEK-EVIDENCE-V4-TRANSITION
ACQUISITION = HAHAWEEK-EVIDENCE-V4-ACQUISITION
SEGMENT = HAHAWEEK-EVIDENCE-V4-SEGMENT
MANIFEST = HAHAWEEK-EVIDENCE-V4-MANIFEST
CHECKPOINT = HAHAWEEK-EVIDENCE-V4-CHECKPOINT
CURSOR = HAHAWEEK-EVIDENCE-V4-CURSOR
LEASE = HAHAWEEK-EVIDENCE-V4-LEASE
MIGRATION = HAHAWEEK-EVIDENCE-V4-MIGRATION
BACKUP = HAHAWEEK-EVIDENCE-V4-BACKUP

## 4. Identity model
### Event
Event identity contains exactly: chain_id, block_hash, block_number, transaction_hash, transaction_index, log_index, contract_address, topic0.
event_id = hash(PAYLOAD, event_identity)
Block hash is mandatory; block number alone is never sufficient.

### Transition
The first transition has sequence 0, previous_transition_hash null, and from_state OBSERVED. Each later transition references the immediately preceding valid transition.
Authoritative state is the highest contiguous valid transition. Gaps, conflicting predecessors, forks, and conflicting duplicate identities fail closed.

### Reorg
A reorg is an explicit observation plus explicit transitions for affected evidence. Historical artifacts are not overwritten or deleted. Affected canonical evidence may transition to ORPHANED.

### Acquisition
Each exact RPC page/subrange is one acquisition artifact. Identity includes chain_id, provider_id, request_sequence, pagination_index, block_range, and filter_hash. Response normalization and deterministic sorting occur before digesting.
Same identity plus same digest is idempotent. Same identity plus different digest is an integrity conflict.

### Segment
Segment identity, body bytes, body hash, header, and seal follow V4 exact boundaries. Header and seal are excluded from body hash. Record count excludes header and seal. Final LF and filename rules are deterministic.

### Manifest
Manifest is the cumulative inventory authority for a generation. Any integrity-relevant inventory change changes the manifest hash.

### Checkpoint
Checkpoint commits a verified manifest state. checkpoint.manifest_hash must equal the valid manifest hash and checkpoint.generation must equal manifest.generation.

### Cursor
Cursor is a projection of committed progress, not an independent authority. cursor must never exceed checkpoint authority. Ambiguity causes fail-closed recovery.

### Lease
Writer lease provides single-writer authority. Acquisition is atomic/exclusive, renewal verifies ownership, and fencing prevents stale writers from remaining authoritative.

### Migration
Migration binds source provenance and deterministic disposition. Source bytes and digest are accounted exactly. Missing provenance is unresolved, never fabricated. One migration manifest is authoritative for a migration generation.

### Backup
Backup identity binds the protected artifact set and relevant integrity metadata. Verification must detect incomplete or altered backups.

## 5. State machines
Authority: LEGACY_ACTIVE -> LEGACY_FROZEN -> V4_ACTIVE.
Evidence: OBSERVED -> CANONICAL -> ORPHANED, subject only to legal V4 transitions.
State is derived from the valid contiguous transition chain, not from a mutable current-state field alone.

## 6. Recovery algorithm
1. Verify manifest bytes and hash.
2. Verify referenced segment identities and digests.
3. Verify checkpoint bytes and hash.
4. Verify checkpoint-to-manifest linkage and generation.
5. Verify cursor bytes and hash.
6. Verify cursor does not exceed checkpoint authority.
7. Resume only when all invariants pass.
8. Otherwise enter fail-closed recovery.
Never choose the largest cursor, newest timestamp, or newest file merely because it appears newer.

## 7. Duplicate/collision policy
Same identity + same digest -> idempotent.
Same identity + different digest -> INTEGRITY_CONFLICT -> fail closed.
INSERT OR IGNORE is not a V4 integrity policy.

## 8. Golden-vector contract
Each vector contains vector_id, domain, input_object, canonical_utf8_hex, and expected_hash.
Required families: event identity, event payload, transition, reorg observation, acquisition, segment identity/body/seal, manifest, checkpoint, cursor, lease, migration, migration manifest, and backup.

## 9. Negative vectors
Verifier must reject mutations to values, types, key sets, address/hash casing, block hash, transaction/log indexes, transition predecessor, transition gaps/forks, acquisition responses, segment body, manifest inventory, checkpoint linkage, cursor authority, and conflicting duplicate identities.

## 10. Independence
The reference model must not import production ingestion, legacy raw-store, SQLite state, or production cursor code.
Required equivalence: production implementation == reference model == golden vectors == offline verifier.

## 11. Gate 2 exit condition
Gate 2 remains open until executable canonicalization, hash vectors, offline verification, transition/reorg tests, checkpoint/cursor recovery tests, collision tests, lease/fencing tests, durability/crash tests, and deterministic migration tests are demonstrated.

Next artifact: STEP 3 — GOLDEN VECTORS.
