# HAHAWEEK — STEP 609 Design v0.1

Status: DESIGN — PENDING VERIFICATION
Step: 609 — Design
Contract: `docs/STEP_609_SURVEILLANCE_OBSERVATION_BOUNDARY_CONTRACT_V0_1.md`
Analysis: `docs/STEP_609_ANALYSIS_V0_1.md`

## 1. DESIGN GOAL

Implement only the smallest safe analytical boundary required by the frozen Contract:

`AUTHORITATIVE/PRESERVED EVIDENCE → SURVEILLANCE OBSERVATION`

The implementation is derived, deterministic, evidence-linked, versioned, and read-only with respect to raw/canonical evidence.

No domain-specific profitability, ranking, trading, actor identity, or predictive scoring is implemented by this Design.

## 2. IMPLEMENTATION SURFACE

Add one pure module:

`src/core/surveillance-observation.js`

The module MUST:

- construct a surveillance observation from explicitly supplied evidence references and derived payload;
- validate required provenance and temporal fields;
- canonicalize identity input using the repository's existing JCS implementation;
- hash with a dedicated surveillance domain;
- return a new immutable object;
- never access the database, cursor, writer fence, V4 authority, RPC provider, or raw store.

No existing production ingestion path is modified.

## 3. OBSERVATION TYPES

The envelope recognizes these versioned types:

- `LIQUIDITY_ACTIVITY`
- `WALLET_ACTIVITY`
- `TRANSACTION_COST`
- `CONTRACT_TRANSPARENCY`
- `PROMOTIONAL_PROVENANCE`

Recognition of a type does not assert that its underlying measurement is available.

Domain-specific measurement requires an evidence-backed payload.

## 4. VALIDATION STATUS

Allowed status values:

- `OBSERVED`
- `UNKNOWN`
- `INCONCLUSIVE`
- `UNVERIFIED`

`UNKNOWN`, `INCONCLUSIVE`, and `UNVERIFIED` are first-class results and MUST NOT be silently converted to false, failure, or zero.

## 5. OBSERVATION ENVELOPE

Required fields:

- `schema_version`
- `observation_id`
- `observation_type`
- `chain_id`
- `entity_ref`
- `evidence_refs[]`
- `provenance_ref`
- `event_time` (nullable)
- `observation_time`
- `processing_time`
- `rule_version`
- `validation_status`
- `uncertainty`
- `payload`

The constructor rejects missing/duplicate evidence references, invalid timestamps, unsupported types/statuses, and missing provenance.

## 6. IDENTITY

Identity is calculated from a dedicated domain:

`HAHAWEEK-SURVEILLANCE-OBSERVATION-V1`

The identity payload is exactly:

- schema_version;
- observation_type;
- chain_id as canonical decimal string;
- entity_ref;
- sorted evidence_refs;
- provenance_ref;
- event_time;
- observation_time;
- rule_version;
- validation_status;
- uncertainty;
- payload.

The identity hash is:

`SHA256(UTF8(domain) || 0x00 || RFC8785_JCS(identity_payload))`

The processing_time field is deliberately excluded from identity so the same observation is reproducible across processing runs.

## 7. ADDRESS / ACTOR

`entity_ref` may contain an observed address.

The module MUST NOT infer actor identity.

No field named actor, owner, trader identity, or smart-money classification is created by this Design.

## 8. TEMPORAL RULES

- event_time describes the observed event when available;
- observation_time describes when the observation was established;
- processing_time records processing provenance;
- future evidence cannot alter a prior observation;
- a changed evaluation produces a new observation identity through changed evidence/rule/payload.

## 9. DETERMINISM / CONFLICTS

- evidence_refs are canonicalized by sorted order for identity;
- duplicate evidence_refs are rejected;
- identity collision with different payload is a consumer-level integrity conflict;
- no latest-wins behavior;
- no mutation after construction.

## 10. REORG / RECOVERY

The module itself has no recovery authority.

If an evidence reference becomes non-canonical, a caller must construct a new observation from the new evidence state.

Existing observations remain historical analytical records.

No cursor or V4 recovery path is touched.

## 11. DOMAIN-SPECIFIC LIMITS

This Design deliberately does NOT define:

- a DEX depth formula;
- realizable-value formula;
- gas-cost comparison formula;
- profitability/PnL formula;
- actor-identification logic;
- contract trust/fraud scoring;
- promotional authenticity scoring;
- predictive/risk score.

Those require separate explicit measurement/validation contracts.

## 12. TEST DESIGN

Required tests for the Code phase:

1. deterministic identity;
2. processing_time excluded from identity;
3. evidence reference ordering canonicalization;
4. duplicate evidence rejection;
5. missing provenance rejection;
6. invalid timestamp rejection;
7. unsupported type rejection;
8. unsupported status rejection;
9. ADDRESS != ACTOR surface;
10. UNKNOWN/INCONCLUSIVE/UNVERIFIED preservation;
11. payload immutability / input non-mutation;
12. no database/cursor/V4 access by module surface;
13. JCS/hash golden vector;
14. temporal-field preservation;
15. malformed identity inputs fail closed.

## 13. SECURITY / REGRESSION DESIGN

The Code phase must prove:

- no raw/canonical evidence mutation;
- no cursor access;
- no V4 authority access;
- no RPC/network side effect;
- no automated action;
- deterministic identity;
- no silent normalization;
- no actor inference;
- no future-evidence leakage.

## 14. OPERATOR ACCEPTANCE

The module is not an operator command.

Any later operator-facing output must expose observation type, identity, evidence references, provenance, times, rule version, validation status, and uncertainty without inventing commands.

## 15. GATE

Design authorizes implementation of the pure surveillance-observation envelope only.

It does NOT authorize domain-specific scoring or production V4 activation.

## 16. NEXT

Proceed to Code → Test → Security/Regression → CI → Review → Merge → Post-Merge Verification → Reconciliation → Documentation.
