# HAHAWEEK — STEP 610 Analysis v0.1

Status: ANALYSIS — PENDING VERIFICATION
Step: 610 — Analysis
Contract: `docs/STEP_610_DOMAIN_MEASUREMENT_EVIDENCE_BOUNDARIES_CONTRACT_V0_1.md`

## 1. PURPOSE

Inspect the actual repository after the verified STEP 610 Contract and determine the smallest repository-grounded implementation boundary for domain measurements.

No production implementation is authorized by this Analysis alone.

## 2. REPOSITORY BASELINE

Fresh inspection of `main` confirms:

- `package.json` exposes `npm test`, `npm start`, `npm run scan`, `npm run health`, and V4 verification commands.
- `src/core/surveillance-observation.js` provides a deterministic, immutable derived observation envelope.
- `src/core/canonical-evidence.js` provides structured projection of preserved raw evidence.
- `src/core/evidence-graph.js` provides a deterministic derived evidence graph and is not authoritative.
- `src/core/liquidity-event.js` decodes `ModifyLiquidity` with pool/block/transaction/log evidence.
- `src/core/swap-event.js` decodes `Swap` with raw signed amount, price-state, liquidity, tick, fee, and sender fields.
- `src/core/flow-aggregation.js` deterministically aggregates swap flow and unique senders without BUY/SELL classification, price, momentum, score, or prediction.
- `src/core/validation-boundary.js` and `src/core/validation-result.js` provide existing validation infrastructure, but their vocabulary is formation/outcome-oriented rather than a complete domain-measurement validation vocabulary.
- `src/core/database.js` contains durable raw/canonical, lineage, processing-result, and authority persistence surfaces; no frozen domain-measurement table is present in the inspected schema.

## 3. DOMAIN CAPABILITY MAPPING

### 3.1 Liquidity / Depth

Existing liquidity-event decoding is a valid evidence input:

- pool identity;
- sender address;
- tick lower/upper;
- liquidity delta;
- block;
- transaction;
- log identity.

It is not sufficient by itself to calculate executable depth.

A domain implementation still needs an explicit, versioned model for:

- snapshot selection;
- range/tick state;
- pool/asset identity;
- fee tier where applicable;
- quote direction;
- price convention;
- executable quote calculation;
- slippage/price-impact calculation;
- model parameters and assumptions.

The Contract explicitly forbids silently applying a generic constant-product model. Therefore Design must freeze the applicable AMM/depth model before implementation.

### 3.2 Transaction Cost

The inspected surveillance/evidence modules do not provide a frozen transaction-cost measurement record.

The existing event surfaces can supply block/transaction identity, but a comparable cost measurement additionally requires:

- gas used;
- effective gas price;
- fee source;
- native fee calculation;
- optional token/fiat conversion evidence;
- conversion timestamp/source when conversion occurs;
- calculation version.

If conversion evidence is absent, the native-denominated value must remain native-denominated.

No social-media cost comparison is authoritative.

### 3.3 Contract / Deployer Transparency

The evidence graph can represent contract and event relationships, and preserved evidence can bind observations to addresses.

However, the inspected repository does not provide a frozen surveillance schema for:

- deployer relation;
- source verification state;
- bytecode/proxy evidence;
- upgradeability evidence;
- ownership/control fields;
- deployment transaction.

These properties require direct evidence binding.

No inference of real-world ownership, actor identity, fraud, malicious intent, trustworthiness, or profitability is permitted.

### 3.4 Promotional Provenance

The repository does not expose an authoritative social-media/promotional evidence ingestion boundary in the inspected surfaces.

Therefore implementation must not create canonical evidence from screenshots, posts, quoted figures, or third-party claims.

A future provenance observation may preserve external claims only as explicitly non-authoritative provenance material, with validation state preserved.

## 4. EXISTING SURVEILLANCE ENVELOPE GAP ANALYSIS

`src/core/surveillance-observation.js` already provides:

- deterministic JCS + SHA-256 identity;
- domain separation;
- sorted/duplicate-rejected evidence references;
- event/observation/processing temporal checks;
- immutable output;
- input payload cloning;
- rule-version binding;
- UNKNOWN/INCONCLUSIVE/UNVERIFIED statuses.

Important contract-to-repository gaps remain:

1. The Contract requires promotional provenance states including CLAIMED and CONFLICTING, while the current envelope only accepts OBSERVED, UNKNOWN, INCONCLUSIVE, and UNVERIFIED.
2. The current observation types contain LIQUIDITY_ACTIVITY and TRANSACTION_COST, but there is no dedicated frozen observation type for executable DEPTH; Design must decide whether depth is a versioned payload under liquidity activity or a distinct type without silently expanding semantics.
3. The Contract requires domain-specific measurement identity to include calculation/rule version. The existing envelope already includes `rule_version`, which is compatible, but Design must define whether domain/model parameters also belong to identity payload.
4. The envelope requires a provenance reference but does not itself validate that the referenced provenance object exists or matches the evidence. Design must specify the binding boundary rather than adding an ad-hoc lookup.
5. Existing validation-result vocabulary is `CONFIRMED/REJECTED/INCONCLUSIVE`, while the surveillance Contract additionally requires explicit UNKNOWN/UNVERIFIED behavior. Design must define a compatible versioned validation mapping.
6. The current observation layer is pure and does not persist measurements. No database authority should be added unless Design establishes a derived, append-only persistence boundary.
7. Processing time is excluded from the current identity payload, which is consistent with the Contract.

## 5. EVIDENCE / TEMPORAL BOUNDARY

The repository already preserves canonical evidence and canonical lineage.

For domain measurements the required lifecycle is:

AUTHORITATIVE/PRESERVED EVIDENCE
→ admitted measurement inputs
→ deterministic domain calculation
→ versioned surveillance observation
→ validation state.

A future canonicality/reorg change must create a new measurement evaluation/version. It must not edit a historical observation or reset the acquisition cursor.

Temporal invariant remains:

`event_time <= observation_time <= processing_time`

Future evidence cannot be used to retroactively construct a prior observation.

## 6. DOMAIN-SPECIFIC SECURITY ANALYSIS

### Liquidity/depth

Risk boundary: mistaking displayed reserves/TVL/balances for executable liquidity.

Required mitigation: explicit AMM model, snapshot, quote direction, and preserved inputs.

### Transaction cost

Risk boundary: incomparable costs caused by different units, fee definitions, time windows, or conversion sources.

Required mitigation: preserve native fee and source; permit comparison only after compatibility validation.

### Contract/deployer

Risk boundary: turning addresses or source-verification properties into actor/trust/fraud claims.

Required mitigation: evidence-linked properties only; ADDRESS != ACTOR.

### Promotional provenance

Risk boundary: turning a promotional claim into canonical fact or inferred coordination/intent.

Required mitigation: preserve claim/provenance state separately from independently validated facts.

## 7. OPERATOR ACCEPTANCE ANALYSIS

Before implementation, operator-visible output must make it possible to determine:

- what domain measurement was produced;
- exact entity/pool/transaction/contract reference;
- evidence and provenance references;
- calculation/model/rule version;
- observation and processing time;
- validation status;
- uncertainty;
- comparability state where relevant;
- whether the result is UNKNOWN/INCONCLUSIVE/UNVERIFIED;
- when STOP/FAIL-CLOSED applies.

No new operator command is justified by this Analysis. Any operational procedure must come from repository implementation/documentation later.

## 8. PERSISTENCE / AUTHORITY BOUNDARY

The existing database is authoritative for preserved/raw/canonical and lifecycle surfaces. Domain measurement persistence, if required, must remain derived and append-only.

No measurement table should be added merely for convenience. Design must first establish:

- whether persistence is required;
- exact schema;
- deterministic measurement identity;
- append-only/update/delete protections;
- evidence/provenance foreign-key or equivalent validation;
- reorg/version handling;
- recovery behavior.

No cursor or V4 authority may be coupled to measurement persistence.

## 9. MINIMUM DESIGN INPUTS

Design must freeze, per domain:

1. measurement type and schema;
2. calculation/model version;
3. admissible evidence;
4. provenance binding;
5. temporal inputs;
6. uncertainty semantics;
7. validation vocabulary/mapping;
8. deterministic identity inputs;
9. conflict policy;
10. reorg/recovery versioning;
11. operator-visible representation;
12. persistence requirement, if any.

For liquidity/depth specifically, the AMM model must be explicit.

For transaction cost, conversion evidence must be explicit.

For contract/deployer, each property must carry direct evidence.

For promotional provenance, claims must remain non-authoritative until independently validated.

## 10. NON-GOALS

This Analysis does not authorize:

- trading signals;
- ranking;
- predictive/risk scoring;
- profitability analysis;
- actor/deanonymization claims;
- automated action;
- external social-media ingestion;
- canonical evidence mutation;
- cursor advancement;
- V4 production activation.

## 11. ACCEPTANCE CRITERIA

1. Fresh repository surfaces were inspected on `main`.
2. Existing surveillance envelope capability and gaps are explicitly identified.
3. All four Contract domains have repository-grounded capability/gap analysis.
4. No unsupported measurement formula is invented.
5. AMM/depth model remains undefined until Design.
6. Transaction-cost conversion remains evidence-bound.
7. Contract/deployer observations remain address/property evidence, not actor/trust inference.
8. Promotional material remains non-authoritative without validation.
9. Temporal, reorg, cursor, V4, and raw/canonical boundaries remain intact.
10. Validation vocabulary incompatibilities are explicitly identified for Design.
11. Operator acceptance remains repository-grounded.
12. Implementation remains blocked until Design.

## 12. NEXT

After this Analysis is merged, reconciled, and documented, proceed strictly to **STEP 610 Design**.

No production implementation is authorized by this Analysis.
