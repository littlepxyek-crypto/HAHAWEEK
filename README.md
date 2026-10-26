# HAHAWEEK

## Early Formation Intelligence

> **Observe what is forming. Connect the evidence. Validate before believing.**

HAHAWEEK is an evidence-first research and engineering system for reconstructing how early on-chain formations emerge.

It connects acquisition, raw evidence, provenance, relationships, temporal formation, validation, and research output into one auditable chain.

**Others detect signals. HAHAWEEK reconstructs how a formation becomes evidence.**

> **Status at a glance (see [ARCHITECTURE.md](ARCHITECTURE.md)):** the live runtime ingests Uniswap v4 PoolManager events on Robinhood Chain (chain ID 4663) through RPC → raw evidence → canonical evidence → V4/F-03 authority gate → cursor. Formation, validation, intelligence, radar, research report and X content are implemented and unit-tested but **not wired into the live runtime yet** (they run only in CI verification scripts). INTERNET and WALLET sources are planned. The diagrams below show the target design.

[![Security & Regression](https://github.com/littlepxyek-crypto/HAHAWEEK/actions/workflows/security.yml/badge.svg)](https://github.com/littlepxyek-crypto/HAHAWEEK/actions/workflows/security.yml)

---

## What is HAHAWEEK?

HAHAWEEK is designed around one question:

> **What is forming, what evidence supports it, what contradicts it, and can the conclusion be reproduced from preserved evidence?**

The core model is:

```text
OBSERVE
   ↓
CONNECT
   ↓
RECORD
   ↓
UNDERSTAND
   ↓
VALIDATE
   ↓
LEARN
```

And the evidence pipeline is:

```text
RPC  (INTERNET: planned)
      ↓
  ACQUISITION
      ↓
 RAW EVIDENCE RECORD
      ↓
 CANONICAL EVIDENCE RECORD
      ↓
 V4 INTEGRITY AUTHORITY
      │
      +-----------------------+------------------------+
      │                                                │
      v                                                v
 EVIDENCE GRAPH                                 FORMATION
 (parallel, rebuildable)                              ↓
                                                HYPOTHESIS
                                                     ↓
                                                VALIDATION
                                                     ↓
                                                INTELLIGENCE
                         /          \\
                      RADAR       RESEARCH
                                      ↓
                                   REPORT
```

---

## The Core Idea

HAHAWEEK does not treat a single transaction, mention, wallet, or metric as a formation by default.

A formation is reconstructed from connected evidence across time.

For an on-chain pool formation, the conceptual sequence can look like:

```text
POOL CREATED
      ↓
LIQUIDITY ADDED
      ↓
FIRST SWAP
      ↓
WALLET ACTIVITY
      ↓
FORMATION WINDOW
      ↓
FORMATION / VALIDATION
      │
      └──→ EVIDENCE GRAPH (parallel rebuildable projection)
```

Every downstream conclusion should remain traceable to the evidence that supports it.

---

## Evidence First

The authority model is intentionally layered:

```text
RAW EVIDENCE
     ↓
CANONICAL BYTES
     ↓
DETERMINISTIC IDENTITY / HASH
     ↓
IMMUTABLE SEGMENT
     ↓
MANIFEST
     ↓
CHECKPOINT
     ↓
CURSOR
```

The higher-level research layer is derived from this evidence chain.

### Important distinctions

HAHAWEEK explicitly distinguishes:

- observed fact
- derived measurement
- inference
- uncertainty
- contradiction
- validation
- provenance

**Unknown does not mean false.**

**Missing data does not automatically mean negative evidence.**

**Repeated mentions do not automatically mean independent sources.**

**Address diversity does not automatically mean actor diversity.**

---

## Architecture (target design)

Stages marked `*` are implemented but not yet wired into the live runtime; `(planned)` has no implementation yet.

```text
                    HAHAWEEK
                       │
        ┌──────────────┼──────────────┐
        ↓              ↓              ↓
  INTERNET*          RPC        WALLET (planned)
        │              │              │
        └──────────────┼──────────────┘
                       ↓
                  ACQUISITION
                       ↓
                  RAW EVIDENCE
                       ↓
               CANONICAL EVIDENCE
                       ↓
                  V4 AUTHORITY
                    /       \
                   /         \
                  ↓           ↓
       EVIDENCE GRAPH*     FORMATION*
       (rebuildable)           ↓
                           HYPOTHESIS*
                               ↓
                           VALIDATION*
                               ↓
                          INTELLIGENCE*
                           /       \
                        RADAR*    RESEARCH*
                                    ↓
                                  REPORT*
```

The Evidence Graph is a projection and must remain rebuildable from authoritative evidence.

**V4 integrity authority protects the identity, ordering, and integrity of HAHAWEEK records; it does not by itself establish external truth.**

**Graph is a parallel projection, not a prerequisite for Formation.**


---

## What HAHAWEEK Is Not

HAHAWEEK is not:

- a trading bot;
- a price-prediction engine;
- an automatic BUY/SELL system;
- a private-key or signing system;
- a token-shilling system;
- a substitute for preserved evidence.

The foundation is **read-only, evidence-first, reproducible, and fail-closed at authority boundaries**.

---

## Integrity & Provenance

HAHAWEEK's V4 engineering layer defines deterministic integrity primitives including:

- RFC 8785 JSON Canonicalization Scheme;
- SHA-256 domain-separated hashing;
- deterministic event identity;
- transition-chain integrity;
- explicit reorg handling;
- acquisition provenance;
- segment, manifest, checkpoint, and cursor authority;
- duplicate/collision handling;
- single-writer lease semantics;
- migration and backup integrity boundaries;
- executable golden-vector verification.

V4 remains an engineering/integrity layer. It does not replace the conceptual HAHAWEEK architecture.

---

## Formation Model

The system is built around the idea that formation is a process rather than a single signal.

Conceptually:

```text
BLOCK
  ↓
TRANSACTION
  ↓
CONTRACT / EVENT
  ↓
POOL
  ↓
LIQUIDITY
  ↓
SWAP
  ↓
WALLET
  ↓
FORMATION
```

Social and narrative observations can later be connected to the evidence graph, but they do not become authoritative merely because they are published.

---

## Validation

Validation is separated from formation detection.

The intended research flow is:

```text
OBSERVATION
    ↓
HYPOTHESIS
    ↓
HISTORICAL OUTCOME
    ↓
EVALUATION
    ↓
CONFIRMED / REJECTED / INCONCLUSIVE
```

Validation definitions and thresholds must be versioned before evaluation.

Future evidence must not leak backward into formation detection.

---

## Current Engineering Status

**Design Gate 2: PASS**

The current Design Gate 2 state records F-01..F-05 and H-01..H-05 as VERIFIED / FROZEN, with the acceptance evidence documented in [Design Gate 2 State](docs/DESIGN_GATE_2_STATE.md).

**Gate 2 PASS is a design/provenance acceptance state. It does not itself activate V4 production authority.**

**What runs today:** `src/index.js` builds the V4/F-03 production-authority gate and lifecycle for every ingested batch; the cursor advances only when that gate returns `AUTHORIZED`. Older documents that call V4 authority "INACTIVE" describe the governance label, not the code: the activation state machine (`src/core/authority-activation-state.js`) exists but the live gate does not consult it. No production host deployment is recorded in this repository.

---

## MVP Scope

The current MVP design deliberately stays small:

```text
ONE CHAIN
ONE FORMATION TYPE
ONE VALIDATION FAMILY
ONE COMPLETE EVIDENCE CHAIN
```

The MVP scope is designed around a bounded on-chain `POOL_BOOTSTRAP` formation:

```text
Pool Created
     ↓
Liquidity Added
     ↓
First Swap
     ↓
Validation
     ↓
Evidence-backed Research Report
```

The MVP explicitly excludes automated trading, private keys/signing, predictive price models, production V4 cutover, legacy migration, and autonomous claim publication.

See [MVP Scope](docs/MVP_SCOPE_SPEC_V0_1.md).

---

## Research & Publication (planned output)

Research is designed as a first-class output. Today the report and X-content modules run only inside CI verification scripts; their results are CI artifacts and **nothing is published**.

```text
DATA
 ↓
EVIDENCE
 ↓
ANALYSIS
 ↓
REPORT
 ↓
X CONTENT
```

A publishable claim should remain traceable:

```text
X POST
  ↓
CLAIM
  ↓
RESEARCH
  ↓
EVIDENCE
  ↓
SOURCE / TRANSACTION / BLOCK
```

X can be an input and publication channel.

**X is not the source of truth.**

---

## Documentation

### Architecture

- [ARCHITECTURE.md](ARCHITECTURE.md) — as-built status (source of truth)
- [ROADMAP.md](ROADMAP.md) · [DATA_SCHEMA.md](DATA_SCHEMA.md) · [EVENT_SCHEMA.md](EVENT_SCHEMA.md) · [EVIDENCE_MODEL.md](EVIDENCE_MODEL.md) · [TEST_PLAN.md](TEST_PLAN.md)
- Historical STEP records: [docs/archive/](docs/archive/)
- [Canonical Blueprint](docs/BLUEPRINT_CANONICAL.md)
- [MVP Scope](docs/MVP_SCOPE_SPEC_V0_1.md)
- [Threat Model](docs/THREAT_MODEL_SPEC_V0_1.md)

### V4 Evidence Integrity

- [V4 Canonical Reference Model](docs/V4_CANONICAL_REFERENCE_MODEL.md)
- [V4 Normative Lexical Forms](docs/V4_NORMATIVE_LEXICAL_FORMS.md)
- [V4 Event Identity Contract](docs/V4_EVENT_IDENTITY_INPUT_CONTRACT.md)
- [V4 Transition Contract](docs/V4_NORMATIVE_TRANSITION_INPUT_CONTRACT.md)
- [V4 Checkpoint Contract](docs/V4_NORMATIVE_CHECKPOINT_INPUT_CONTRACT.md)
- [V4 Cursor Contract](docs/V4_NORMATIVE_CURSOR_INPUT_CONTRACT.md)
- [Checkpoint / Recovery Boundary Audit](docs/V4_CHECKPOINT_RECOVERY_BOUNDARY_AUDIT.md)

### Trust, Identity & Cross-Spec

- [Identity Resolution L4/L5](docs/IDENTITY_RESOLUTION_L4_L5_CONTRACT_V0_1.md)
- [Source Independence](docs/SOURCE_INDEPENDENCE_CONTRACT_V0_1.md)
- [Cross-Spec L4 Validation](docs/CROSS_SPEC_L4_VALIDATION_CONTRACT_V0.1.md)
- [Cross-Spec Reconciliation Audit](docs/CROSS_SPEC_RECONCILIATION_AUDIT_V0_1.md)

### Reference Intelligence

- [Reference Intelligence Contract](docs/REFERENCE_INTELLIGENCE_CONTRACT_V1.md)
- [Reference Observation Provenance](docs/REFERENCE_OBSERVATION_PROVENANCE_CONTRACT_V1.md)
- [Reference Provider Resource Boundary](docs/REFERENCE_PROVIDER_RESOURCE_BOUNDARY_V1.md)
- [Investigation Execution State Machine](docs/INVESTIGATION_EXECUTION_STATE_MACHINE_V1.md)

Reference Intelligence is non-authoritative, provenance-preserving, temporally explicit, and resource-bounded. It cannot mutate V4 authority or become canonical evidence automatically.

### Engineering & Continuity

- [Design Gate 2 State](docs/DESIGN_GATE_2_STATE.md)
- [GitHub Continuity Protocol](docs/GITHUB_CONTINUITY_PROTOCOL.md)
- [GitHub Hardening Checklist](docs/GITHUB_HARDENING_CHECKLIST.md)
- [Decisions](docs/DECISIONS.md)

---

## Development

The repository uses a PR-based engineering workflow.

```text
WORK RESULT
    ↓
DOCUMENT
    ↓
DIFF REVIEW
    ↓
TEST
    ↓
SECURITY CHECK
    ↓
COMMIT
    ↓
PUSH / PR
    ↓
RECORD RESULT
```

Core rules:

- preserve historical evidence;
- do not rewrite raw history;
- fail closed at authority boundaries;
- keep derived projections rebuildable;
- do not bypass repository protections;
- do not introduce production V4 changes before the applicable production-boundary authorization.

Run the test suite with:

```bash
npm test
```

Run ingestion (configuration: [.env.example](.env.example), details in [ARCHITECTURE.md](ARCHITECTURE.md)):

```bash
npm install
export HAHAWEEK_RPC_URL='https://<your keyed Robinhood Chain RPC>'   # optional; public RPC by default
export HAHAWEEK_START_BLOCK=59281988                                 # optional backfill start, only used with no cursor
node src/index.js      # one ingestion pass, then exit
node src/runner.js     # continuous: health -> ingestion pass -> sleep; fail-closed STOP exits 78
node src/status.js     # print persisted operational state
```

Docker: `docker compose -f deploy/docker-compose.yml up -d` (requires `RPC_URL`). The container runs `src/runner.js` and stays idle instead of restarting after a fail-closed STOP.

---

## Design Principles

```text
FREE-FIRST
EVIDENCE-FIRST
NO DATA LOSS
NO OVERWRITE OF RAW HISTORY
NO SKIPPED LAYER
NO SIGNAL WITHOUT EVIDENCE
NO PREDICTIVE SCORE WITHOUT VALIDATION
ONE EVIDENCE CHAIN, MULTIPLE OUTPUTS
```

---

## Project Status

HAHAWEEK is an active research and engineering project.

Current status is intentionally conservative:

```text
RPC ingestion (raw → canonical)   LIVE
V4 / F-03 authority gate          LIVE (runs on every batch)
Formation → report                IMPLEMENTED, NOT WIRED (CI scripts only)
Radar / X content output          IMPLEMENTED, NOT WIRED; nothing published
INTERNET / WALLET sources         PLANNED
Production host deployment        NOT RECORDED
Automated Trading                 NOT PART OF THE FOUNDATION
```

---

## License

See the repository license and individual project artifacts for applicable terms.
