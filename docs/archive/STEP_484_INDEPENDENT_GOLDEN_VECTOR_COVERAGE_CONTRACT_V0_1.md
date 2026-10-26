# STEP 484 — Independent Golden Vector Coverage Contract v0.1

Status: CONTRACT CANDIDATE

## Purpose

Define the next auditable boundary after STEP 483: prove that the independent golden-vector verifier can be applied to the complete committed V4 golden-vector fixture set, rather than only the default fixture path.

STEP 483 freezes the verifier implementation and its independence property. STEP 484 does not replace that boundary. It defines coverage of the committed vector corpus while preserving the existing verifier semantics and production authority boundaries.

## Scope

STEP 484 MUST establish:

- an explicit inventory of the committed V4 golden-vector fixture files in scope;
- deterministic discovery or explicit enumeration of those fixture files;
- independent verification of every in-scope fixture file using the STEP 483 verifier boundary;
- fail-closed behavior when a required fixture is missing, unreadable, malformed, duplicated in the inventory, or not independently verifiable;
- deterministic reporting of fixture path, vector count, and verification result;
- evidence that the complete in-scope corpus is covered by the verification command/test.

The existing golden-vector fixture contents MUST NOT be regenerated or silently normalized by this step.

## Independence

The coverage mechanism MUST preserve the STEP 483 independence invariant.

It MUST NOT:

- import `src/reference/v4/*`;
- derive expected hashes from production reference code;
- modify production V4 authority;
- modify raw evidence;
- modify cursor, checkpoint, manifest, migration, or runtime state;
- contact RPC providers, external APIs, or other network services.

The STEP 483 verifier remains the independent cryptographic implementation. STEP 484 only establishes complete corpus coverage around it.

## Coverage invariant

For every fixture declared in the STEP 484 inventory:

`fixture → independent verifier → all vectors verified`

The contract is satisfied only when no declared fixture is silently skipped.

A passing verification of one default fixture MUST NOT be treated as proof that the entire committed golden-vector corpus has been verified.

## Determinism requirements

The coverage process MUST be deterministic:

- fixture inventory ordering is stable;
- the same repository state produces the same fixture set;
- each fixture is verified exactly once per coverage run;
- duplicate inventory entries fail closed;
- unexpected fixture format or unsupported fixture type fails closed rather than being silently ignored.

## Traceability

The verification evidence MUST permit reconstruction of:

`Coverage Run → Fixture Path → Vector Set → Vector ID → Domain/Input Object → Canonical Bytes → SHA-256`

The evidence must identify the exact repository state under which coverage was established.

## Non-goals

STEP 484 does not:

- change the canonicalization algorithm;
- change domain-separated hashing semantics;
- change existing golden-vector values;
- establish production V4 authority;
- implement checkpoint/cursor recovery;
- implement migration or lease/fencing;
- modify raw evidence or runtime state;
- introduce prediction, ranking, trading, signing, or publication behavior.

## Acceptance gates

Before implementation is considered eligible:

1. The fixture inventory is explicitly defined.
2. Coverage semantics are deterministic and fail-closed.
3. The STEP 483 independent verifier remains the only cryptographic verification authority used by the coverage layer.
4. No production-state or network dependency is introduced.
5. Historical STEP 482 and STEP 483 boundaries remain intact.
6. The contract itself passes repository security/regression checks before any implementation step is opened.

## Relationship to previous steps

- STEP 482: defines the independent offline golden-vector verification boundary.
- STEP 483: implements and freezes the independent verifier.
- STEP 484: defines complete committed-fixture coverage around that frozen verifier.

STEP 484 therefore advances the existing boundary without changing its semantics.
