# HAHAWEEK — ARCHITECTURE DESCRIPTION V1.0

Status: ARCHITECTURE REVIEW BASELINE / NOT FINAL / IMPLEMENTATION FREEZE BLOCKED
Project: HAHAWEEK
System Class: Evidence Intelligence Infrastructure / Early Formation Intelligence
Primary Network: Robinhood Mainnet (chain_id 4663) for current MVP
Baseline: Canonical Blueprint 19 Sep 2026 + repository state + Master Architecture Blueprint V1.0 + EQC/Agent Read Boundary V1
Review Scope: Context → Container → Component → Runtime → Data/Evidence → Authority → Agent → Deployment → Failure/Recovery, followed by R-01…R-14 closure review.

---

## 0. Architecture Status

This document is the formal Architecture Description baseline for HAHAWEEK. It does not declare the architecture final.

The architecture is considered:
- Conceptually coherent
- Engineering-substantiated in several vertical slices
- Partially formalized
- Not yet implementation-frozen
- Not production-authorized for V4 authority
- Not production-authorized for the complete Agent surface

The canonical product architecture remains the 19 Sep 2026 flow:

INTERNET / X
  ↓
SOCIAL + NARRATIVE
  ↓
HAHAWEEK ENGINE
  ↓
ON-CHAIN / WALLET / SOCIAL
  ↓
EVIDENCE GRAPH
  ↓
FORMATION
  ↓
VALIDATION
 /       \
RADAR   RESEARCH
            ↓
          REPORT
            ↓
        X CONTENT

The current MVP is a strict subset of that target architecture.

Architecture freeze rule:

Architecture Description
  ↓
R-01…R-14 closure
  ↓
Executable negative vectors
  ↓
Repository reconciliation
  ↓
Architecture Gate
  ↓
ONLY THEN: implementation freeze

Until that chain is satisfied, this document remains a review baseline.

---

# 1. Architectural Drivers

## 1.1 Primary purpose

HAHAWEEK observes early formation processes, connects evidence, evaluates defined hypotheses, and produces traceable intelligence.

Core principle:

> Observe what is forming. Connect the evidence. Validate before believing.

## 1.2 Non-goals

HAHAWEEK is not:
- a guaranteed prediction engine;
- an automatic BUY/SELL system;
- a trading/signing system;
- a private-key system;
- a source-of-truth social feed;
- an autonomous claim authority;
- an Agent-owned evidence system.

## 1.3 Architectural invariants

1. Evidence precedes interpretation.
2. Raw history is not silently overwritten.
3. Derived projections are rebuildable.
4. V4 authority is distinct from analytical state.
5. Graph identity is distinct from V4 evidence identity.
6. Formation, hypothesis, and validation are separate analytical domains.
7. Unknown/incomplete acquisition is not negative evidence.
8. Event time, observation time, and processing time remain distinct.
9. Agent is outside the authority chain.
10. EQC is the Agent read boundary.
11. Publication cannot rewrite evidence.
12. Social is a target architecture capability, not current MVP authority.
13. Vendor/runtime choice cannot become a HAHAWEEK authority dependency.

---

# 2. VIEW 1 — CONTEXT ARCHITECTURE

## 2.1 System context

HUMAN / RESEARCHER
        ↓
AGENT / CONSUMER
        ↓
EQC
        ↓
+------------------------------------------------+
|                    HAHAWEEK                    |
| Acquisition → Evidence → Analytical → Output |
+------------------------------------------------+
     ↑                 ↑                 ↑
 Robinhood RPC      Internet/X       Other Sources

## 2.2 External actors

| Actor | Relationship | Authority |
|---|---|---|
| Human/Researcher | consumes intelligence | external |
| Agent | queries declared HAHAWEEK state | read-only |
| Future operator | operates infrastructure | operational |
| Publication consumer | consumes reports/content | external |

## 2.3 External systems

- Robinhood Mainnet
- RPC provider(s)
- X / social sources
- future external data sources
- future research/enrichment sources

## 2.4 Trust boundaries

A. External → Acquisition: observations are untrusted until acquired and provenance-recorded.

B. Acquisition → Evidence Authority: only contract-compliant evidence enters authoritative processing.

C. Authority → Analytical: analytical systems may interpret evidence but may not rewrite authority.

D. HAHAWEEK → Agent: Agent receives bounded read access only.

E. Research → Publication: publication is derivative and cannot modify upstream evidence.

## 2.5 Context verdict

PASS WITH OPEN CONTRACTS.

The conceptual boundary is correct. Formal social, external-source, and publication contracts remain incomplete.

---

# 3. VIEW 2 — CONTAINER ARCHITECTURE

Logical containers implied by the repository:

1. Acquisition
2. Evidence Authority
3. Evidence Graph
4. Analytical Engine
5. Intelligence Output
6. EQC Read Service
7. Agent Consumer

## 3.1 Container responsibilities

### C1 — Acquisition

Owns:
- source interaction;
- acquisition metadata;
- observation timestamps;
- acquisition failure classification.

Does not own:
- formation;
- validation;
- authoritative identity.

### C2 — Evidence Authority

Owns:
- raw evidence;
- canonical identity;
- V4 integrity;
- segment/manifest/checkpoint/cursor semantics;
- reorg history;
- recovery authority.

### C3 — Evidence Graph

Owns:
- graph projection;
- graph nodes/edges;
- graph-specific identity;
- derived relationships.

Does not own authoritative evidence.

### C4 — Analytical Engine

Owns:
- formation;
- hypothesis;
- historical outcomes;
- validation;
- analytical state transitions.

### C5 — Intelligence Output

Owns:
- Radar;
- descriptive intelligence projections;
- research artifacts;
- report artifacts;
- publication projections.

### C6 — EQC Read Service

Owns:
- bounded query contract;
- query validation;
- read-only enforcement;
- typed response status;
- limitation reporting.

### C7 — Agent Consumer

Owns:
- reasoning;
- investigation;
- synthesis;
- non-authoritative drafts;
- future research workflows.

Does not own evidence authority.

## 3.2 Container verdict

PASS WITH FORMALIZATION REQUIRED.

The containers are materially represented by repository components, but ownership, persistence, deployment, and API boundaries need further formal contracts.

---

# 4. VIEW 3 — COMPONENT ARCHITECTURE

## 4.1 Evidence/authority components

Representative repository components:
- ingestion
- state
- block-cursor
- raw event processing
- canonical evidence
- V4 hash/identity
- writer fence
- authority gate
- production authority
- checkpoint/cursor mechanisms

Primary invariant:

process → authority acceptance → cursor advance

Never:

cursor advance → process

## 4.2 Analytical components

Current repository evidence includes:
- pool discovery
- pool-bootstrap formation
- HFI formation adapter
- historical outcome
- liquidity survival
- validation result
- validation boundary
- research report
- X content projection
- evidence graph
- HFI radar projections

## 4.3 Agent boundary components

Current Agent branch:
- src/query/evidence-query-contract.js
- src/query/read-only-query-service.js
- src/query/index.js

Implemented query surface:
1. get_evidence
2. get_evidence_lineage
3. get_block_context
4. get_transaction_context
5. get_wallet_activity
6. get_pool_context

Declared but not activated:
7. graph context
8. formation context
9. hypothesis context
10. validation context
11. radar record
12. research context
13. claim provenance

## 4.4 Component ownership rule

Every component must eventually declare:
- responsibility;
- inputs;
- outputs;
- owned state;
- authority level;
- identity domain;
- failure semantics;
- temporal semantics;
- tests;
- upstream/downstream contracts.

## 4.5 Component verdict

PARTIAL PASS.

The implementation has strong component-level substance, but a formal architecture-to-code responsibility matrix is still required.

---

# 5. VIEW 4 — RUNTIME ARCHITECTURE

## 5.1 Normal acquisition runtime

RPC / Source
  ↓
Acquisition
  ↓
Raw observation
  ↓
Canonicalization
  ↓
Authority validation
  ↓
Persist
  ↓
Checkpoint / cursor progression

## 5.2 Formation runtime

Current HFI vertical slice:

POOL_CREATED
  ↓
LIQUIDITY_ADDED
  ↓
FIRST_SWAP
  ↓
Canonical Evidence
  ↓
POOL_BOOTSTRAP formation

The repository orders events using block number, transaction index, and log index.

## 5.3 Validation runtime

Formation
  ↓
Outcome window
  ↓
Historical observations
  ↓
Criterion evaluation
  ↓
Validation result

Current MVP validation family:
LIQUIDITY_SURVIVAL

## 5.4 Research runtime

Formation + Outcome + Validation + Claims
  ↓
Research Report
  ↓
X Content Projection

## 5.5 Replay runtime

The HFI runtime verification includes deterministic replay checks for formation, outcome, validation, and research report.

## 5.6 Agent runtime

Current state:

Agent
  ↓
EQC
  ↓
bounded read
  ↓
HAHAWEEK state

No production autonomous Agent runtime is part of this architecture freeze.

## 5.7 Runtime gaps

Required before production-level runtime freeze:
- acquisition completeness state;
- reorg → analytical propagation;
- full historical/as-of query semantics;
- bounded EQC resource semantics;
- analytical transition history;
- claim provenance runtime;
- social snapshot runtime.

## 5.8 Runtime verdict

PASS FOR MVP VERTICAL SLICE / NOT COMPLETE SYSTEM-WIDE.

---

# 6. VIEW 5 — DATA / EVIDENCE ARCHITECTURE

## 6.1 Evidence hierarchy

SOURCE
  ↓
ACQUISITION
  ↓
RAW EVIDENCE
  ↓
CANONICAL EVIDENCE / V4
  ↓
GRAPH PROJECTION
  ↓
ANALYTICAL OBJECTS
  ↓
INTELLIGENCE
  ↓
RESEARCH
  ↓
PUBLICATION

## 6.2 Temporal model

Relevant domains preserve:
- event_time;
- observation_time;
- processing_time.

Rules:
- event_time determines historical ordering;
- observation_time describes observation;
- processing_time describes processing;
- processing time cannot become event time.

## 6.3 Evidence provenance

Material claims must be traceable:

publication
  ↓
claim
  ↓
research
  ↓
validation
  ↓
formation
  ↓
evidence
  ↓
acquisition
  ↓
source

## 6.4 Graph rule

V4 Evidence Identity ≠ Graph Identity.

Graph is rebuildable and cannot become the evidence source of truth.

## 6.5 Data immutability rule

Raw evidence is append-only.

Corrections are represented as new evidence/state/projection relationships rather than silent mutation of historical evidence.

## 6.6 Data verdict

STRONG / R-01 AND R-05 STILL BLOCK FULL FREEZE.

---

# 7. VIEW 6 — AUTHORITY ARCHITECTURE

## 7.1 Authority stack

Source / Acquisition
  ↓
Raw Evidence
  ↓
V4 Identity / Integrity
  ↓
Segments
  ↓
Manifest
  ↓
Checkpoint
  ↓
Cursor

Analytical layers consume authority:

Evidence
  ↓
Formation
  ↓
Hypothesis
  ↓
Validation
  ↓
Radar / Research

## 7.2 Authority separation

V4 transition is not:
- formation transition;
- hypothesis transition;
- validation transition.

Analytical transitions require separate domains.

## 7.3 Activation states

The architecture must distinguish:

IMPLEMENTED
VERIFIED
AUTHORIZED
ACTIVE

The existence of V4 production code does not mean production authority is active.

## 7.4 Agent authority

Agent has no authority over:
- evidence;
- V4 identity;
- V4 transitions;
- cursor;
- checkpoint;
- manifest;
- canonicality;
- reorg state;
- formation authority;
- validation authority;
- identity promotion.

## 7.5 Authority verdict

STRONG / R-02, R-07, R-13 OPEN.

---

# 8. VIEW 7 — AGENT ARCHITECTURE

## 8.1 Boundary

HAHAWEEK AUTHORITY SYSTEM
        ↑
       EQC
        ↑
      AGENT

Agent is a consumer, not a layer in the authority chain.

## 8.2 Read permissions

Allowed only through declared EQC operations.

No:
- arbitrary SQL;
- DB handle;
- persistence mutation;
- evidence insertion/deletion;
- V4 mutation;
- cursor manipulation;
- checkpoint manipulation;
- canonicality manipulation;
- identity promotion;
- autonomous publication.

## 8.3 Query status semantics

EQC must distinguish:
- COMPLETE;
- PARTIAL;
- UNKNOWN;
- INCOMPLETE;
- ERROR.

Non-COMPLETE results cannot automatically become negative evidence.

## 8.4 Known limitations

Current implementation has known limitations:
- canonicality is not fully joined for every query;
- wallet activity is observed liquidity-event activity, not inferred swap-sender identity;
- historical/as-of semantics are incomplete;
- resource bounds need enforcement;
- graph/formation/validation/research/claim query contracts are not activated.

## 8.5 Agent vendor neutrality

Claude, OpenAI, local models, or another runtime may implement an Agent.

HAHAWEEK depends on the EQC contract, not on a particular model vendor.

## 8.6 Agent verdict

STRONG BOUNDARY / INCOMPLETE PRODUCTION SURFACE.

---

# 9. VIEW 8 — DEPLOYMENT ARCHITECTURE

## 9.1 Required deployment classes

### D1 — Local Development

Purpose:
- development;
- deterministic tests;
- contract work.

No production authority.

### D2 — CI / Verification

Purpose:
- tests;
- negative vectors;
- replay;
- static verification;
- contract verification.

No production mutation.

### D3 — Free/Low-Cost Runtime

Purpose:
- MVP experimentation;
- scheduled acquisition;
- runtime verification.

Requires explicit persistence limits, retry/backoff, and backup strategy.

### D4 — Production

Purpose:
- future continuous evidence acquisition.

Requires before activation:
- authority authorization;
- durable storage;
- backup;
- recovery;
- observability;
- secret management;
- single-writer enforcement;
- RPC resilience;
- reorg handling;
- migration/cutover contract.

## 9.2 Deployment trust zones

Internet
  |
External RPC / Sources
  |
Acquisition Runtime
  |
Evidence Authority Storage
  |
Analytical Runtime
  |
EQC
  |
Agent Runtime

Agent infrastructure must never receive direct authority-datastore credentials.

## 9.3 Deployment open items

- persistent storage specification;
- backup/restore specification;
- secrets boundary;
- process supervision;
- resource limits;
- observability;
- deployment version pinning;
- migration/cutover procedure.

## 9.4 Deployment verdict

OPEN / ARCHITECTURE FREEZE BLOCKER.

---

# 10. VIEW 9 — FAILURE / RECOVERY ARCHITECTURE

## 10.1 Acquisition failures

Examples:
- RPC timeout;
- provider error;
- rate limit;
- incomplete block range;
- malformed response;
- unavailable historical block.

Required behavior:

failure
  ↓
classify
  ↓
persist failure state
  ↓
retry if safe
  ↓
recover

No failure may silently advance authoritative cursor state.

## 10.2 Cursor recovery

Required invariant:

persisted evidence >= cursor authority

A restart must replay or resume deterministically without losing authoritative history.

## 10.3 Reorg recovery

Reorg handling must preserve prior evidence and create new canonicality/state relationships.

Never:
reorg → delete history

Instead:
old observation + new chain state → reconciled canonicality

## 10.4 Analytical failure

Formation/validation failures are not equivalent to acquisition failures.

Example:
No FIRST_SWAP is negative only if acquisition completeness is established; otherwise UNKNOWN/INCONCLUSIVE.

## 10.5 Analytical invalidation

A canonicality change may affect formation, outcome, validation, radar, and research.

Historical analytical state remains traceable; affected projections are recomputed/versioned rather than silently overwritten.

## 10.6 Agent failure

Agent failure must not affect evidence authority.

Agent crash → HAHAWEEK continues.

Agent hallucination → does not become evidence.

## 10.7 Recovery verdict

STRONG V4 FOUNDATION / ANALYTICAL RECOVERY STILL OPEN.

---

# 11. CROSS-VIEW INVARIANTS

I-01 Authority: only HAHAWEEK authority owns authoritative evidence.

I-02 Projection: Graph, Radar, Research, Report, and X Content are derived artifacts.

I-03 Temporal: no future evidence leakage into historical formation.

I-04 Completeness: acquisition incompleteness cannot be interpreted as negative evidence.

I-05 Identity: identity claims never change evidence authority.

I-06 Independence: multiple observations do not automatically imply independent sources.

I-07 Agent: Agent cannot cross the authority boundary.

I-08 Rebuildability: derived projections can be rebuilt from authoritative inputs.

I-09 Versioning: rules, predicates, thresholds, schemas, and analytical transitions are versioned.

I-10 Fail closed: authority-boundary failures fail closed rather than guessing.

---

# 12. ARCHITECTURE-TO-REPOSITORY RECONCILIATION

| Architecture area | Repository evidence |
|---|---|
| Canonical product flow | docs/BLUEPRINT_CANONICAL.md |
| Master architecture | docs/MASTER_ARCHITECTURE_BLUEPRINT_V1_0.md |
| MVP boundary | docs/MVP_SCOPE_SPEC_V0_1.md |
| Cross-spec audit | docs/CROSS_SPEC_RECONCILIATION_AUDIT_V0_1.md |
| Design Gate | docs/DESIGN_GATE_2_STATE.md |
| Identity | docs/IDENTITY_RESOLUTION_L4_L5_CONTRACT_V0_1.md |
| Source independence | docs/SOURCE_INDEPENDENCE_CONTRACT_V0_1.md |
| Agent query contract | docs/EVIDENCE_QUERY_CONTRACT_V1_0.md |
| Agent boundary | docs/AGENT_READ_BOUNDARY_V1.md |
| Query implementation | src/query/* |
| Formation | src/core/pool-bootstrap-formation.js |
| Formation adapter | src/core/hfi-formation-adapter.js |
| Historical outcome | src/core/historical-outcome.js |
| Validation | src/core/validation-result.js / validation-boundary.js |
| Liquidity validation | src/core/liquidity-survival.js |
| Research | src/core/research-report.js |
| X projection | src/core/x-content-projection.js |
| Evidence Graph | src/core/evidence-graph.js |
| HFI runtime | scripts/hfi-mvp-runtime-verify.js |
| Radar runtime | scripts/hfi-radar-operational-runtime-verify.js |

---

# 13. R-01 → R-14 CLOSURE REVIEW

An item is CLOSED only when the architecture contract, repository implementation, and executable verification agree.

| ID | Finding | Current repository evidence | Current status |
|---|---|---|---|
| R-01 | Graph identity must not collide with V4 semantics | Dedicated graph identity domain + deterministic rebuild tests are present; graph remains non-authoritative. | VERIFIED |
| R-02 | Analytical transitions must not become V4 transitions | Separate Formation/Hypothesis/Validation domains and transition validation are implemented and tested. | VERIFIED |
| R-03 | DISSOLVED semantics too broad | MVP intentionally excludes DISSOLVED; no false terminal predicate is introduced. | DEFERRED_WITH_ACCEPTED_RISK |
| R-04 | L4/L5 ambiguity | Executable L4/L5 implementation and negative vectors exist; relation-specific direct-proof boundary is enforced. | VERIFIED |
| R-05 | Source independence under-specified | Source-lineage/I0-I4 enforcement and runtime boundary were merged; exact-head CI passed. | VERIFIED |
| R-06 | One RPC cannot prove omission resistance | Robinhood Mainnet remains a single-RPC MVP observation boundary; omission resistance is explicitly limited. | DEFERRED_WITH_ACCEPTED_RISK |
| R-07 | MVP must not claim V4 production authority | Authority lifecycle exists, but production V4 remains INACTIVE and activation prerequisites are not all proven. | BLOCKED |
| R-08 | Formation expiry vs incomplete acquisition | Acquisition completeness vocabulary and negative-evidence guard are implemented and covered by tests. | VERIFIED |
| R-09 | Validation vocabulary | Validation v2 separates terminal result from criterion status and rejects future formation evidence; exact-head CI passed. | VERIFIED |
| R-10 | Descriptive metrics must not become hidden score | Descriptive measurement boundary is implemented; no predictive/trading score authority is granted. | CONDITIONALLY_SATISFIED |
| R-11 | Token/narrative thresholds need versioning | Social/narrative threshold layer is outside the current MVP authority surface. | DEFERRED_WITH_ACCEPTED_RISK |
| R-12 | Social snapshot provenance | Snapshot provenance and publication-origin separation are implemented/tested, but authoritative social input is outside current MVP. | DEFERRED_WITH_ACCEPTED_RISK |
| R-13 | Formation/Hypothesis/Validation chains separate | State machines are separate, but full end-to-end analytical transition-chain integration remains incomplete. | NOT_VERIFIED |
| R-14 | Claim promotion/provenance | Claim-promotion artifact boundary exists, but full EQC/query-to-publication provenance integration remains incomplete. | NOT_VERIFIED |

## 13.1 Closure classification

Verified:
- R-01
- R-02 primitive (full end-to-end chain pending PR #738)
- R-04
- R-05
- R-08
- R-09

Conditionally satisfied:
- R-10

Deferred with accepted risk:
- R-03
- R-06
- R-11
- R-12

Implemented but verification incomplete:
- R-13 (PR #738 runtime gate pending)
- R-14 (full EQC→publication provenance chain incomplete)

Blocked:
- R-07

Therefore:

R-01…R-14 fully closed = NO
Architecture Gate = BLOCKED
Implementation Freeze = BLOCKED.