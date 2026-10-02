# HFI-RADAR — Analysis & Design v0.1

Status: DESIGN BASELINE — AUTHORIZED
Contract: `HFI-RADAR-V0_1`
Input: `docs/HFI_RADAR_GAP_ANALYSIS_V0_1.md`
Branch: `hfi-radar-analysis-2026-10-02`

## 1. Design Objective

Extend the existing verified HAHAWEEK formation/validation lineage with a deterministic read-only Radar projection without replacing any frozen authority.

Target:

`RAW → CANONICAL → EVIDENCE ID → FORMATION → OUTCOME → VALIDATION → RADAR PROJECTION`

The implementation is additive. Existing Formation Result, Historical Outcome, Validation Result, and frozen Validated Radar contracts remain semantic authorities for their respective domains.

## 2. Key Finding From Existing Formation Semantics

The existing Pool Bootstrap Formation Engine already defines:

- `OBSERVED`
- `PARTIAL`
- `CANDIDATE`
- `VALID`

and derives `CANDIDATE` deterministically when `POOL_CREATED` and `LIQUIDITY_ADDED` exist in valid order, before `FIRST_SWAP` is required.

This existing state MUST be reused rather than redefined.

The HFI-RADAR Candidate layer therefore does not require an invented market-cap, liquidity, volume, price, or profitability threshold.

## 3. Radar Layers

### 3.1 Formation Radar

Formation Radar is a projection of Formation-derived state.

Input authority:

- Formation Engine / Formation Result
- Formation Evidence Reference
- canonical evidence identity

Required lineage:

`FORMATION_STATE → FORMATION_RADAR_RECORD → EVIDENCE`

For a complete Formation Result, the record retains:

- formation_id
- formation_type
- formation_rule_version
- chain_id
- pool_id
- formation_start
- formation_end
- source formation state
- evidence_ids
- provenance_reference

For incomplete formation discovery, the projection may expose an operational Radar observation only when its input contract explicitly permits a non-Formation-Result observation. Such records MUST remain distinguishable from a material Formation Result and MUST NOT fabricate a formation_id.

### 3.2 Candidate Radar

Candidate Radar is a derived eligibility projection.

For the initial Pool Bootstrap implementation:

**Candidate eligibility = source Formation Engine state `CANDIDATE`.**

That means:

- `POOL_CREATED` evidence exists;
- `LIQUIDITY_ADDED` evidence exists;
- event order is valid;
- the source formation detector has deterministically emitted `CANDIDATE`;
- no future `FIRST_SWAP` evidence is required for candidacy;
- no outcome or validation result is required for candidacy.

This is intentionally not a profitability, quality, or investment score.

Candidate Radar MUST preserve the source formation rule version and evidence references.

### 3.3 Validated Radar

The existing frozen Validated Radar Record remains the semantic authority.

Eligibility remains:

`Validation Result = CONFIRMED`

The HFI-RADAR implementation MUST delegate to, or compose around, the existing:

- `validated-radar-record.js`
- `validated-radar-record-integration.js`

It MUST NOT recreate or reinterpret Validation semantics.

## 4. State Model

The Radar state model is divided into source lifecycle state and epistemic/operational state.

### Source lifecycle states

- OBSERVED — evidence was observed but no complete formation/candidate condition is established.
- PARTIAL — some formation evidence exists but the required formation condition is incomplete.
- CANDIDATE — the frozen Formation Engine has deterministically established candidate eligibility.
- VALIDATED — an existing Validation Result is CONFIRMED and the frozen Validated Radar contract has produced the validated projection.

The source Formation Engine's `VALID` state remains a Formation-domain state. It MUST NOT be silently renamed to `VALIDATED`.

### Epistemic / operational states

The Radar record MUST preserve explicit distinctions for:

- UNKNOWN
- UNAVAILABLE
- INCOMPLETE
- INCONCLUSIVE
- CONFLICT
- CONTRADICTED
- FAILED

These are not interchangeable with lifecycle success states.

Operational failure MUST NOT become negative evidence.

## 5. State Transition Boundary

The deterministic logical progression is:

`OBSERVED → PARTIAL → CANDIDATE → FORMATION VALID → VALIDATION → VALIDATED`

Important boundary:

- Candidate does not require Outcome.
- Candidate does not require Validation.
- Formation VALID does not mean Validation CONFIRMED.
- Validation CONFIRMED is the only source that permits VALIDATED Radar.
- A failed/unavailable/inconclusive operation does not automatically transition a record to REJECTED.
- Contradictory evidence produces an explicit conflict/contradicted state rather than silent replacement.

Not every record must traverse every state. A source observation may terminate as UNKNOWN, UNAVAILABLE, INCOMPLETE, INCONCLUSIVE, CONFLICT, CONTRADICTED, or FAILED.

## 6. Candidate Rule Version

Initial candidate rule:

`hfi-radar-pool-bootstrap-candidate-v1`

Definition:

`Formation Engine state == CANDIDATE`

with the following source invariants:

- formation type is `POOL_BOOTSTRAP`;
- formation rule version is `pool-bootstrap-v1`;
- `POOL_CREATED` is present;
- `LIQUIDITY_ADDED` is present;
- event order is deterministic and canonical;
- evidence IDs are unique;
- no future evidence is required to establish candidacy.

No numerical threshold is introduced by HFI-RADAR v0.1.

## 7. Deterministic Identity

Every Radar record uses versioned identity inputs.

Candidate identity MUST include:

- Radar schema version;
- Radar rule version;
- source formation rule version;
- source formation state;
- chain_id;
- pool_id;
- stable source evidence IDs;
- deterministic source Formation ID when available.

Validated identity continues to be governed by the frozen Validated Radar Record contract.

Processing timestamps, runtime host, execution order, and random values MUST NOT affect historical Radar identity.

## 8. Temporal Integrity / No-Look-Ahead

Candidate determination is bounded by the evidence used to establish the Formation Engine's `CANDIDATE` state.

Therefore:

- `FIRST_SWAP` MUST NOT be required to establish Candidate;
- future Outcome observations MUST NOT influence Candidate;
- Validation results MUST NOT feed backward into Candidate eligibility;
- processing_time MUST NOT become event_time;
- historical replay MUST use only evidence available at the relevant observation boundary.

Validated Radar may use Outcome/Validation because its source contract explicitly requires those later observations. It MUST NOT back-propagate that later knowledge into an earlier Candidate record.

## 9. Evidence and Provenance

Every material Radar record MUST carry:

- source evidence IDs;
- source formation ID when one exists;
- source rule version;
- Radar rule version;
- source state;
- observation boundary;
- lineage to Outcome/Validation when applicable.

No Radar path may write to authoritative raw/canonical evidence.

## 10. Rebuild / Replay

Radar projection functions should be pure with respect to authoritative inputs.

Rebuild algorithm:

1. load authoritative Formation/evidence state;
2. reconstruct Formation-derived source state;
3. project Formation Radar;
4. project Candidate Radar when source state is CANDIDATE;
5. if a fixed Outcome and Validation Result exist, delegate Validated Radar creation to the frozen implementation;
6. compare deterministic IDs;
7. preserve prior derived observations for reconciliation;
8. emit reconciliation metadata for changed canonical lineage.

Equivalent authoritative inputs and versions MUST reproduce equivalent Radar IDs and states.

## 11. Duplicate / Conflict Semantics

- Equivalent repeated input → idempotent same Radar identity.
- Duplicate evidence ID in one record → reject.
- Same identity with materially different content → CONFLICT; do not overwrite silently.
- Canonicality/reorg change → reconcile affected derived records from authoritative evidence.
- Corrupted source state → FAILED/UNKNOWN as appropriate; never repair by mutating authoritative evidence.

## 12. Security Boundary

Targeted adversarial coverage MUST include:

- candidate-to-validated escalation;
- future/leakage input;
- fabricated Formation ID;
- fabricated evidence ID;
- duplicate evidence;
- conflicting source state;
- mutation of caller-owned inputs;
- mutation attempts against authoritative evidence;
- cursor/checkpoint mutation;
- writer-fence mutation;
- external action invocation;
- secret/credential handling.

## 13. Implementation Shape

Additive modules are preferred:

- `src/core/hfi-radar-formation.js`
- `src/core/hfi-radar-candidate.js`
- `src/core/hfi-radar-projection.js`
- integration adapters only where the existing repository pattern requires them.

Tests should mirror the repository's established unit, integration, adversarial, determinism, and boundary patterns.

The existing validated-radar and radar-documentation modules remain unchanged unless a narrowly scoped adapter is required and proven not to alter frozen semantics.

## 14. Acceptance Mapping

This design directly addresses:

- AC-R05..R08 — evidence/provenance/deterministic identity;
- AC-R09 — Formation Radar semantics;
- AC-R10 — Candidate Radar semantics;
- AC-R11..R13 — Validated boundary and uncertainty distinctions;
- AC-R14 — no-look-ahead;
- AC-R15 — versioned candidate rule;
- AC-R16..R21 — replay, conflict, reorg, recovery, cursor/evidence protection;
- AC-R22..R24 — security, CI, review;
- AC-R25..R28 — post-merge/runtime/reconciliation/documentation;
- AC-R29..R32 — derived read-only boundary and prohibited-action preservation.

## 15. Explicit Non-Goals

This design does not authorize:

- predictive scoring;
- BUY/SELL signals;
- investment recommendations;
- profitability prediction;
- arbitrary ranking;
- wallet ownership inference;
- social identity inference;
- external X publication;
- trading/signing/transaction execution;
- production V4 activation;
- Surveillance authority;
- raw/canonical evidence mutation.

## 16. Design Gate

ANALYSIS: VERIFIED

DESIGN: VERIFIED

CODE: NOT YET IMPLEMENTED

The next lifecycle stage is CODE, subject to preserving this design and the frozen repository contracts exactly.
