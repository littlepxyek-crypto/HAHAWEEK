# HAHAWEEK — STEP 610 Domain Measurement Evidence Boundaries Contract v0.1

Status: CONTRACT — PENDING VERIFICATION
Step: 610
Parent boundary: STEP 609 Surveillance Observation Boundary

## 1. PURPOSE

Define the evidence and measurement boundary for future domain-specific surveillance observations.

This Contract covers four domains explicitly left out of STEP 609:

1. liquidity/depth;
2. transaction cost;
3. contract/deployer transparency;
4. promotional provenance.

This Contract does not authorize implementation by itself. Analysis and Design remain mandatory.

## 2. AUTHORITY

All measurements are derived observations.

Required chain:

AUTHORITATIVE/PRESERVED EVIDENCE
→ measurement inputs
→ deterministic measurement
→ versioned surveillance observation
→ validation state

Measurements MUST NOT:

- mutate raw/canonical evidence;
- become source of truth;
- advance acquisition cursor;
- modify V4 authority;
- create trading/execution authority;
- submit transactions;
- infer actor identity from an address;
- silently overwrite historical observations.

## 3. COMMON MEASUREMENT ENVELOPE

Every domain measurement MUST bind to the STEP 609 observation envelope.

Required:

- observation schema version;
- measurement type/version;
- entity reference;
- evidence references;
- provenance reference;
- event/observation/processing times;
- calculation/rule version;
- validation status;
- uncertainty;
- deterministic identity.

The calculation/rule version is part of measurement identity.

Processing time alone MUST NOT change measurement identity.

## 4. EVIDENCE ADMISSION

Evidence is admissible only when its source, provenance, time, and identity are available to the applicable evidence boundary.

Social-media screenshots, promotional posts, quoted figures, or third-party claims are not authoritative measurements merely because they are visible.

A claim may be preserved as provenance-bearing external material, but it MUST remain UNKNOWN/UNVERIFIED until an applicable validation boundary admits it.

No latest-wins behavior is allowed for conflicting evidence.

Missing/conflicting evidence MUST remain explicit.

## 5. DOMAIN A — LIQUIDITY / DEPTH

### 5.1 Allowed measurements

The implementation may measure:

- observed pool liquidity;
- liquidity deltas;
- liquidity distribution over explicitly defined ranges;
- quoted executable depth only when a deterministic quote model and evidence snapshot are defined;
- price impact/slippage only when calculation inputs and assumptions are preserved.

### 5.2 Required evidence

At minimum, a depth measurement MUST identify:

- pool/entity;
- token pair or asset identities;
- block/event snapshot;
- liquidity/reserve evidence;
- tick/range state where applicable;
- fee tier where applicable;
- quote direction where applicable;
- calculation version.

### 5.3 Prohibited inference

A displayed balance, TVL, market cap, or portfolio value MUST NOT be called realizable liquidity.

Depth MUST NOT imply that all displayed liquidity is executable at one price.

No execution guarantee is produced.

### 5.4 AMM model boundary

The exact AMM/depth model MUST be declared per implementation. No generic constant-product assumption may be silently applied to a different pool design.

If model parameters are missing, result is UNKNOWN/INCONCLUSIVE.

## 6. DOMAIN B — TRANSACTION COST

### 6.1 Allowed measurements

The implementation may measure:

- observed transaction fee;
- gas used;
- effective gas price;
- native-denominated fee;
- token-denominated fee only when the conversion evidence is preserved;
- comparable fee observations only when measurement definitions are compatible.

### 6.2 Required evidence

A transaction-cost observation MUST bind to:

- chain id;
- block/transaction identity;
- gas used where applicable;
- effective gas price where applicable;
- fee source;
- conversion source/time if converted;
- calculation version.

### 6.3 Comparability

Cross-chain comparisons require compatible definitions, time windows, units, and source quality.

A social-media statement such as "chain X is cheaper" is not itself a transaction-cost measurement.

If conversion evidence is absent, retain the native-denominated measurement rather than inventing a fiat value.

## 7. DOMAIN C — CONTRACT / DEPLOYER TRANSPARENCY

### 7.1 Allowed observations

The implementation may record verifiable properties:

- contract address;
- deployer address;
- source-code verification state;
- bytecode/proxy evidence;
- upgradeability evidence;
- ownership/control fields when directly evidenced;
- deployment transaction reference.

### 7.2 Required evidence

Each property MUST carry a source/provenance reference and observation context.

### 7.3 Prohibited inference

The measurement MUST NOT infer:

- real-world ownership;
- actor identity;
- fraud;
- malicious intent;
- trustworthiness;
- profitability.

ADDRESS != ACTOR remains mandatory.

"Verified source" is a property of the evidence/source state, not proof that the project or actor is trustworthy.

## 8. DOMAIN D — PROMOTIONAL PROVENANCE

### 8.1 Allowed observations

The implementation may preserve structured provenance about:

- source;
- capture time;
- claim text/reference;
- publication time where available;
- referral/promotion relationship when directly evidenced;
- distribution channel;
- provenance chain.

### 8.2 Validation

Promotional claims are claims, not facts, until independently validated.

A provenance observation MUST distinguish:

- OBSERVED;
- CLAIMED;
- UNVERIFIED;
- CONFLICTING;
- UNKNOWN.

If the STEP 609 validation vocabulary cannot represent a domain-specific state, Design MUST define a compatible versioned extension before implementation.

### 8.3 Prohibited inference

Do not infer:

- scam/fraud;
- intent;
- identity;
- authenticity;
- financial outcome;
- endorsement;
- coordinated behavior

without an explicit evidence contract.

## 9. TEMPORAL INTEGRITY

Measurements MUST respect:

event_time ≤ observation_time ≤ processing_time.

Future evidence MUST NOT retroactively alter a prior measurement.

A new evidence state creates a new versioned measurement.

Historical measurements remain reconstructable.

## 10. REORG / RECOVERY

If canonical evidence used by a measurement changes:

canonical evidence change
→ affected measurement reference
→ new evaluation
→ new versioned observation.

No historical measurement is silently rewritten.

No cursor reset is permitted.

No V4 recovery authority is added.

## 11. DETERMINISM

For identical:

- admitted evidence references;
- measurement inputs;
- calculation version;
- configuration/model parameters;

the result MUST be reproducible.

Canonical serialization and domain-separated identity MUST be used.

No latest-wins conflict resolution.

No processing-time-only identity changes.

## 12. UNCERTAINTY / FAILURE

Missing required inputs → UNKNOWN/INCONCLUSIVE.

Conflicting authoritative inputs → CONFLICTING/INCONCLUSIVE according to the validation boundary.

Unsupported model/pool type → UNKNOWN/UNVERIFIED.

Invalid provenance → FAIL-CLOSED.

Attempted evidence mutation, cursor advancement, authority expansion, or automated action → FAIL-CLOSED.

## 13. OPERATOR ACCEPTANCE

Operator-visible measurements MUST allow the operator to determine:

- what was measured;
- which model/calculation version was used;
- which evidence supports it;
- when it was observed;
- validation state;
- uncertainty;
- whether the result is comparable;
- when the operator must STOP.

No new operator command is authorized by this Contract.

## 14. SECURITY BOUNDARY

No implementation under this Contract may:

- submit transactions;
- control wallets;
- alter canonical evidence;
- deanonymize addresses;
- target address holders;
- create trading signals;
- automatically trade;
- create authority over acquisition or V4 lifecycle.

## 15. ACCEPTANCE CRITERIA

The Contract is acceptable only if:

1. all four measurement domains are explicitly bounded;
2. required evidence is defined;
3. model/calculation versions are versioned;
4. deterministic reproduction is required;
5. temporal leakage is prohibited;
6. reorg/recovery behavior is bounded;
7. UNKNOWN/INCONCLUSIVE/UNVERIFIED behavior is explicit;
8. ADDRESS != ACTOR remains explicit;
9. raw/canonical evidence remains immutable;
10. cursor/V4 authority remain untouched;
11. conflicting evidence is not latest-wins;
12. social/promotional claims are not automatically authoritative;
13. operator interpretation is bounded;
14. implementation remains blocked until Analysis and Design.

## 16. NON-GOALS

This Contract does not:

- implement any measurement;
- define a universal AMM model;
- establish profitability;
- identify real-world actors;
- rank tokens;
- create predictive/risk scores;
- authorize trading;
- activate V4 production authority.

## 17. NEXT

After Contract verification, continue strictly:

Analysis → Design → Code → Test → Security/Regression → CI → Review → Merge → Post-Merge Verification → Reconciliation → Documentation → Next STEP.
