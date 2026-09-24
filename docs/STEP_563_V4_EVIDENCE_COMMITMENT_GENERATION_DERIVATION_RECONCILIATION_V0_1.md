# STEP 563 — V4 Evidence Commitment & Generation Derivation Reconciliation v0.1

Status: VERIFIED / FROZEN
Step: 563
Contract merge: `0090484f2f800cb6aa6723a1270c006026da198d`

## 1. Contract result

STEP 563 freezes the missing deterministic commitment semantics identified by STEP 562.

Frozen boundaries include:

- exact processed-range evidence selection;
- deterministic evidence ordering;
- domain-separated segment leaf hashing;
- deterministic segment digest and identity;
- deterministic manifest digest and identity;
- reuse of the existing F-03 checkpoint derivation;
- explicit generation supplied by the canonical processing result/context;
- cursor boundary equality;
- provenance requirements;
- deterministic replay;
- reorg/concurrency/fail-closed rules;
- preservation of historical evidence;
- inactive V4 activation.

## 2. Important source-separation result

Generation is explicitly NOT manufactured by the authority producer.

The producer must receive generation from the completed canonical processing result/context and reject missing/malformed/conflicting generation.

This avoids deriving authority from:

- durable expected authority;
- runtime cursor;
- wall-clock time;
- writer-fence number;
- arbitrary hash truncation.

The submitted producer remains independently reproducible from the completed canonical processing result.

## 3. Existing F-03 preservation

The existing `checkpointDigestFor(generation, manifestDigest)` formula remains authoritative.

No second checkpoint formula was introduced.

No frozen F-01..F-05 or H-01..H-05 contract was modified.

## 4. CI

PR #309 head commit:

`7061215535334d6ed2065c562ee21eb953ac87e0`

- HAHAWEEK Tests run `35974061794` — SUCCESS
- HAHAWEEK Security and Regression run `35974061824` — SUCCESS

## 5. Review

A review comment was recorded confirming:

- deterministic/domain-separated commitment formulas;
- generation source separation;
- preservation of existing checkpoint derivation;
- independence of expected authority;
- inactive V4 activation.

Formal self-approval is not claimed.

## 6. Merge

PR #309 merged to `main` as:

`0090484f2f800cb6aa6723a1270c006026da198d`

## 7. Post-merge verification

The exact merge commit was queried for workflow runs.

Result: no workflow runs associated with the exact merge commit were returned at reconciliation time.

Therefore no post-merge CI GREEN result is claimed.

## 8. Preservation

STEP 563 is contract-only.

No production code, cursor state, RPC/provider behavior, SQLite schema, historical evidence, or V4 activation was changed.

## 9. Status

STEP 563 is VERIFIED / FROZEN within its contract acceptance boundary.

This does not claim the submitted-authority implementation is complete.

## 10. Next STEP

STEP 564 — V4 Evidence Commitment & Generation Derivation Implementation.
