# HAHAWEEK — MVP SCOPE SPEC v0.1

Status: Draft
Purpose: Define the smallest end-to-end HAHAWEEK vertical slice that can test the architecture against real blockchain evidence without prematurely building the full system.

## 1. MVP QUESTION

Can HAHAWEEK detect and document an early on-chain formation from raw acquisition through evidence, graph, temporal formation, hypothesis, validation, and an auditable research report?

The MVP is successful only if the complete chain is traceable and reproducible.

It is not intended to prove predictive performance or launch a production radar.

## 2. MVP BOUNDARY

### Included

One chain:
- Robinhood Mainnet
- chain_id: 4663

One primary acquisition source:
- verified blockchain RPC

One formation type:
- POOL_BOOTSTRAP

Formation sequence:
- Pool Created
- Liquidity Added
- First Swap

One primary validation family:
- LIQUIDITY_SURVIVAL

One output:
- evidence-backed research report

Optional descriptive measurements:
- time from pool creation to first liquidity
- time from first liquidity to first swap
- observed wallet count
- liquidity observations
- swap count
- observation lag

### Explicitly excluded from MVP

- X/social ingestion as an authoritative formation input
- wallet ↔ social identity resolution
- cross-chain identity resolution
- predictive price model
- overall score
- automated trading
- private keys/signing
- production V4 cutover
- legacy migration
- production cursor reset
- full-chain graph materialization
- autonomous claim publication

Social/narrative integration remains a later layer after the on-chain vertical slice is validated.

## 3. VERTICAL SLICE

BLOCKCHAIN RPC
↓
ACQUISITION RECORD
↓
RAW EVIDENCE
↓
V4 CANONICAL IDENTITY
↓
IMMUTABLE EVIDENCE / VERIFIED AUTHORITY
↓
EVIDENCE GRAPH
↓
FORMATION WINDOW
↓
POOL_BOOTSTRAP FORMATION
↓
HYPOTHESIS
↓
VALIDATION WINDOW
↓
LIQUIDITY_SURVIVAL OUTCOME
↓
VALIDATION
↓
RESEARCH REPORT

Every downstream object must retain provenance to the upstream evidence.

## 4. FORMATION DEFINITION

POOL_BOOTSTRAP is detected only when the required sequence can be evidenced:

1. Pool creation evidence exists.
2. A liquidity-add event for that pool exists.
3. A first-swap event for that pool exists.
4. The temporal ordering is valid under event_time.
5. All required evidence is traceable to verified acquisition records.

The MVP must not infer a formation merely from token creation or a single swap.

## 5. FORMATION WINDOW

The formation window begins at the earliest verified Pool Created event.

The initial window closes when:
- the first swap is verified; or
- the configured acquisition horizon expires without a first swap.

Window boundaries are defined using event_time.

Observation and processing timestamps remain separate.

A late observation does not rewrite event_time. It changes observation metadata and may affect formation interpretation.

## 6. REQUIRED EVIDENCE

Minimum evidence set:

E1 — Pool Created
- chain_id
- block identity
- transaction identity
- event identity
- pool identity
- participating token identities

E2 — Liquidity Added
- pool identity
- transaction/event identity
- provider wallet
- token/amount fields where available
- event_time

E3 — First Swap
- pool identity
- transaction/event identity
- sender/wallet
- swap direction/amount fields where available
- event_time

Acquisition provenance is mandatory for every E1/E2/E3 object.

## 7. GRAPH MINIMUM

Required node types:

BLOCK
TRANSACTION
EVENT
CONTRACT
TOKEN
POOL
WALLET
FORMATION
HYPOTHESIS
VALIDATION

Required edge types:

CONTAINS
EMITS
CALLS
DEPLOYS
HAS_POOL
PROVIDES_LIQUIDITY
SWAPS_IN
SUPPORTS
CONTRADICTS
DERIVED_FROM
VALIDATED_BY

The graph is a projection and must be rebuildable from authoritative evidence.

## 8. TEMPORAL REQUIREMENTS

Every relevant observation preserves:

- event_time
- observation_time
- processing_time

Derived fields:

- observation_lag
- processing_lag
- total_lag

Formation detection uses event_time.

Validation evidence must not use events occurring after the formation cutoff to retroactively change the original formation detection.

## 9. HYPOTHESIS

The MVP creates one canonical hypothesis template:

"POOL_BOOTSTRAP formation occurred within formation_window W."

The hypothesis must reference:
- formation_id
- evidence_ref[]
- formation_window_id
- falsifier
- uncertainty
- required evidence

No predictive success claim is permitted at formation time.

## 10. VALIDATION

Primary outcome:

LIQUIDITY_SURVIVAL

The exact threshold and window must be versioned before evaluation.

Example configuration for the first experimental dataset:

- validation window: 7 days
- outcome measurement: liquidity remains at or above a predefined fraction of the reference liquidity

The threshold is a configuration under test, not a universal truth.

A validation cannot begin before its window is closed.

Validation must record:
- outcome_definition_ref
- window_id
- evidence_ref[]
- result
- contradiction_ref[]
- missing_evidence[]
- evaluation version

If the required data is unavailable or incomplete, result is UNKNOWN or INCONCLUSIVE, not FAIL.

## 11. DESCRIPTIVE MEASUREMENTS

The MVP may calculate measurements without treating them as predictive scores:

- time_to_liquidity
- time_to_first_swap
- liquidity_observation_count
- swap_count
- unique_address_count
- observation_lag
- source_count

These measurements must not be collapsed into an overall score.

## 12. IDENTITY RESOLUTION BOUNDARY

The MVP permits only identity relationships necessary to describe directly observed on-chain actions.

Allowed:
- exact address equality
- transaction sender
- transaction recipient
- directly observed deployer
- directly observed liquidity provider
- directly observed swap participant

Not allowed:
- wallet = social account
- wallet = person
- wallet cluster = same owner
- behavioral identity claims
- cross-chain owner claims

Identity hypotheses may be tested later under the Identity Resolution specification.

## 13. THREAT CONTROLS REQUIRED FOR MVP

The MVP must explicitly test:

- wrong-chain RPC response
- incomplete acquisition
- duplicate acquisition
- conflicting acquisition digest
- reorg affecting formation evidence
- wash-trading-like repeated activity
- address diversity vs actor diversity
- missing social data must not affect this on-chain MVP
- future validation evidence leakage
- failed formation retention
- graph edge without evidence_ref
- report claim without provenance

The MVP must fail closed at evidence-authority boundaries.

## 14. REPRODUCIBILITY

Given the same authoritative evidence set and the same versioned configuration:

- canonical identities must match;
- graph projection must match;
- formation window must match;
- hypothesis identity must match;
- validation input set must match;
- report provenance must match.

Non-authoritative projections may be rebuilt.

## 15. MVP ACCEPTANCE CRITERIA

AC-01 At least one real Pool Created → Liquidity Added → First Swap formation can be reconstructed from preserved evidence.

AC-02 Every formation node and edge has traceable evidence.

AC-03 event_time, observation_time, and processing_time remain distinct.

AC-04 A reorg does not delete the original evidence or formation history.

AC-05 An incomplete acquisition cannot advance authoritative recovery state.

AC-06 A validation cannot consume future evidence relative to the formation cutoff.

AC-07 A validation with unavailable outcome data becomes UNKNOWN/INCONCLUSIVE.

AC-08 Graph projection can be discarded and rebuilt from authoritative evidence.

AC-09 Research output can be traced to evidence and acquisition.

AC-10 No predictive score or trading action is required for MVP acceptance.

## 16. MVP PHASES

Phase 1 — Fixture
- define deterministic formation fixture
- define positive/negative vectors
- define expected graph

Phase 2 — Historical replay
- replay a bounded real evidence set
- produce formation objects
- verify deterministic reconstruction

Phase 3 — Validation
- close validation windows
- calculate versioned outcome
- produce validation objects

Phase 4 — Adversarial replay
- inject missing, duplicate, conflicting, reorg, and future-leakage cases
- verify fail-closed behavior

Phase 5 — Research output
- generate one provenance-complete report
- independently trace report claims back to evidence

Phase 6 — Review
- compare implementation against A/B/F/D
- record gaps
- do not activate production until Design Gate 2 exit criteria are satisfied

## 17. NON-GOALS

MVP is not:
- a trading bot;
- a price predictor;
- a complete crypto intelligence platform;
- a social sentiment engine;
- a wallet deanonymization system;
- a production migration;
- a replacement for V4 authority.

## 18. DESIGN GATE

MVP Scope remains DESIGN-ONLY until reviewed.

No production ingestion, raw evidence rewrite, cursor reset, legacy migration, or V4 production cutover is authorized by this document.

The MVP exists to test whether the architecture can produce one complete, auditable formation from real evidence.

## 19. CORE MVP PRINCIPLE

ONE CHAIN.
ONE FORMATION.
ONE VALIDATION.
ONE COMPLETE EVIDENCE CHAIN.

If that cannot be made deterministic and auditable, expanding HAHAWEEK does not solve the underlying problem.
