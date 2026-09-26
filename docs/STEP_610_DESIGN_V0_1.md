# HAHAWEEK — STEP 610 Design v0.1

Status: DESIGN — PENDING VERIFICATION
Step: 610 — Design
Contract: `docs/STEP_610_DOMAIN_MEASUREMENT_EVIDENCE_BOUNDARIES_CONTRACT_V0_1.md`
Analysis: `docs/STEP_610_ANALYSIS_V0_1.md`

## 1. DESIGN GOAL

Freeze the smallest repository-grounded measurement design that can be implemented without changing raw/canonical evidence, acquisition cursor, V4 authority, or production semantics.

This Design authorizes implementation planning only. It does not implement production code.

## 2. COMMON DESIGN

All measurements use the existing STEP 609 surveillance observation envelope and deterministic JCS + domain-separated SHA-256 identity.

Required common fields remain:
- schema_version;
- observation_id;
- observation_type;
- chain_id;
- entity_ref;
- evidence_refs;
- provenance_ref;
- event_time;
- observation_time;
- processing_time;
- rule_version;
- validation_status;
- uncertainty;
- payload.

### 2.1 Identity

Identity inputs are:
- schema version;
- observation type;
- chain id;
- entity reference;
- canonical sorted evidence references;
- provenance reference;
- event time;
- observation time;
- rule/calculation version;
- validation status;
- uncertainty;
- measurement payload.

Processing time is excluded.

Model parameters that materially affect a calculation MUST be represented in the canonical payload or in a versioned configuration reference included by the payload. They MUST NOT exist only as mutable runtime defaults.

### 2.2 Evidence/provenance binding

A measurement is admissible only when every evidence reference resolves to an already-preserved evidence object at the implementation boundary and the provenance reference resolves to the provenance object required by that domain.

No fallback, latest-wins substitution, or silent omission is permitted.

An unresolved or mismatched reference produces a fail-closed validation outcome and does not become an authoritative measurement.

### 2.3 Validation mapping

The existing surveillance envelope is extended only by a backward-compatible versioned vocabulary addition:
- OBSERVED
- CLAIMED
- UNKNOWN
- INCONCLUSIVE
- UNVERIFIED
- CONFLICTING

Existing four statuses retain their meaning.

Mapping from existing validation infrastructure:
- CONFIRMED → OBSERVED only when the domain evidence criteria are actually satisfied;
- REJECTED → INCONCLUSIVE or CONFLICTING according to the domain conflict contract, never silently discarded;
- INCONCLUSIVE → INCONCLUSIVE.

CLAIMED is reserved for a directly observed promotional claim that has not independently been validated as fact.

UNVERIFIED means the observation/provenance exists but the required validation evidence is absent.

CONFLICTING means independently admissible evidence materially disagrees; both evidence states remain referenced.

The mapping is versioned as `domain-measurement-validation-v1`.

## 3. LIQUIDITY / DEPTH DESIGN

### 3.1 Observation type

Use existing `LIQUIDITY_ACTIVITY` for observed liquidity and liquidity-delta measurements.

Executable depth is represented as a typed payload subtype:
`measurement_kind = EXECUTABLE_DEPTH`.

No new observation type is introduced for depth in v1.

### 3.2 Liquidity activity payload

Required:
- measurement_kind = `LIQUIDITY_ACTIVITY`;
- pool_ref;
- asset_refs;
- snapshot_block;
- liquidity_delta where applicable;
- source_event_refs;
- measurement_version.

Observed liquidity must describe the exact evidence state; it must not be labelled executable depth unless the executable-depth rules below are satisfied.

### 3.3 Executable depth payload

Required:
- measurement_kind = `EXECUTABLE_DEPTH`;
- pool_ref;
- asset_refs;
- snapshot_block;
- quote_direction;
- quote_amount;
- executable_amount;
- model_id;
- model_version;
- fee_tier where applicable;
- model_parameters_digest;
- input_evidence_refs;
- measurement_version.

v1 executable-depth model is deliberately limited to an explicitly declared supported pool model. The implementation MUST fail closed for unsupported pool/model types.

No generic constant-product fallback is permitted.

The calculation MUST preserve the snapshot and parameters required to reproduce the result. A quote is an analytical estimate under the declared model, not an execution guarantee.

### 3.4 Slippage/price impact

Not implemented by this Design v1. It remains an out-of-scope extension because the current repository does not freeze a price convention and multi-input quote model.

## 4. TRANSACTION COST DESIGN

Observation type: `TRANSACTION_COST`.

Payload:
- measurement_kind;
- transaction_ref;
- block_ref;
- gas_used;
- effective_gas_price;
- native_fee;
- fee_asset;
- conversion_ref nullable;
- conversion_time nullable;
- conversion_source nullable;
- measurement_version;
- comparability_status.

Native fee is authoritative for the observation.

Converted token/fiat values are permitted only when conversion evidence is explicitly bound. Missing conversion evidence never produces an invented value.

Cross-chain comparison is a separate derived operation and MUST require compatible:
- fee definition;
- units;
- source quality;
- time window;
- conversion basis.

No comparison result is produced when compatibility is UNKNOWN/INCONCLUSIVE.

## 5. CONTRACT / DEPLOYER TRANSPARENCY DESIGN

Observation type: `CONTRACT_TRANSPARENCY`.

Payload is property-oriented and contains only directly evidenced fields:
- contract_ref;
- deployer_ref;
- deployment_transaction_ref;
- source_verification_state;
- bytecode_ref/digest where available;
- proxy_state;
- upgradeability_state;
- ownership_control_state where directly evidenced;
- measurement_version.

Each property carries its evidence reference or inherits an explicitly declared property-to-evidence map.

The implementation MUST NOT create:
- real-world owner identity;
- actor identity;
- fraud/maliciousness classification;
- trust score;
- profitability claim.

ADDRESS != ACTOR remains an invariant.

## 6. PROMOTIONAL PROVENANCE DESIGN

Observation type: `PROMOTIONAL_PROVENANCE`.

Payload:
- source_ref;
- channel;
- capture_time;
- publication_time nullable;
- claim_ref;
- claim_content_digest;
- promotion_relationship where directly evidenced;
- provenance_chain;
- measurement_version.

Validation status:
- CLAIMED for a directly captured claim;
- OBSERVED only for directly observed provenance properties, not for the truth of the claim;
- UNVERIFIED when independent validation is absent;
- CONFLICTING when admissible evidence materially disagrees;
- UNKNOWN when required provenance cannot be established.

The claim remains a claim until an independent evidence boundary validates it. Social-media content is never promoted to canonical evidence by this measurement layer.

## 7. TEMPORAL / VERSION / REORG DESIGN

All measurements obey:
`event_time <= observation_time <= processing_time`.

The observation time represents the evidence state being measured, not the later processing time.

If canonical evidence changes:
1. preserve the historical observation;
2. identify affected evidence;
3. recompute from the new admitted evidence state;
4. emit a new versioned observation.

The new observation MUST have a distinct identity when its measurement inputs/evidence/version differ.

No cursor reset, canonical mutation, or historical rewrite is permitted.

## 8. CONFLICT DESIGN

There is no latest-wins policy.

For materially conflicting admissible evidence:
- retain all relevant evidence references;
- mark validation as CONFLICTING where applicable;
- preserve uncertainty;
- do not collapse conflicting values into one silent result.

For missing evidence:
- UNKNOWN or INCONCLUSIVE according to the domain rule.

For unsupported model:
- UNKNOWN/UNVERIFIED and fail closed for executable measurement.

## 9. OPERATOR-VISIBLE OUTPUT

Every produced measurement MUST expose:
- domain and measurement kind;
- entity;
- observation time;
- calculation/model/rule version;
- evidence references;
- provenance reference;
- validation state;
- uncertainty;
- comparability state where relevant;
- explicit failure/unsupported reason when no measurement can be produced.

No new operator command is introduced by this Design. Existing repository commands remain the only operational authority until implementation documentation defines additional behavior.

## 10. PERSISTENCE BOUNDARY

v1 measurements remain pure derived observations and are reconstructable from preserved evidence.

No new database table is authorized in this Design.

This avoids coupling surveillance measurements to acquisition cursor or V4 authority and avoids introducing a new persistence authority before the repository has a concrete operational requirement.

If durable materialization becomes necessary, it requires a new Contract/Design boundary rather than silently adding database authority.

## 11. SECURITY / FAIL-CLOSED RULES

Implementation MUST fail closed on:
- unresolved evidence/provenance;
- invalid temporal ordering;
- unsupported model;
- missing mandatory model parameters;
- conflicting authoritative inputs where the domain cannot resolve them;
- attempted raw/canonical mutation;
- attempted cursor advancement;
- attempted V4 authority change;
- actor/ownership inference;
- automated action/trading.

No measurement implementation may submit transactions or control wallets.

## 12. IMPLEMENTATION BOUNDARY

Code may introduce only:
- versioned domain measurement builders/validators;
- deterministic calculations explicitly frozen above;
- evidence/provenance binding validation;
- validation vocabulary compatibility;
- tests and golden vectors;
- documentation required to operate and audit the derived measurements.

Code MUST NOT introduce:
- trading signals;
- rankings;
- predictive/risk scores;
- automated actions;
- new acquisition authority;
- canonical evidence mutation;
- cursor mutation;
- V4 activation;
- social-media canonical ingestion.

## 13. OPERATOR ACCEPTANCE DESIGN

The implementation and later documentation must demonstrate:
1. setup/run using repository-defined commands;
2. inspection of health/status;
3. interpretation of measurement/evidence;
4. recognition of UNKNOWN/INCONCLUSIVE/UNVERIFIED/CONFLICTING;
5. fail-closed behavior;
6. evidence-preserving recovery/recomputation after canonical change;
7. no cursor/V4 side effects.

No invented procedure is part of this Design.

## 14. ACCEPTANCE CRITERIA

1. Four Contract domains have a frozen v1 schema boundary.
2. Existing observation envelope is reused rather than replaced.
3. Identity inputs and calculation/model versioning are explicit.
4. Evidence/provenance binding is explicit and fail-closed.
5. Validation vocabulary mapping is versioned.
6. Liquidity/depth has no silent AMM fallback.
7. Transaction-cost conversion is evidence-bound.
8. Contract/deployer remains property/evidence-only.
9. Promotional claims remain non-authoritative.
10. Temporal and reorg rules preserve history.
11. Conflict handling is not latest-wins.
12. No new database authority is introduced.
13. Operator-visible measurement semantics are explicit.
14. No production code is changed by Design.
15. V4 authority and acquisition cursor remain untouched.

## 15. NEXT

After Design verification, reconciliation, and documentation, continue strictly to STEP 610 Code.

No implementation is included in this Design artifact.
