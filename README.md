# HAHAWEEK

## Early Formation Intelligence

> **Observe what is forming. Connect the evidence. Validate before believing.**

HAHAWEEK is an evidence-first research and engineering system for reconstructing how early on-chain formations emerge.

It connects acquisition, raw evidence, provenance, relationships, temporal formation, validation, and research output into one auditable chain.

**Others detect signals. HAHAWEEK reconstructs how a formation becomes evidence.**

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
INTERNET / RPC
      ↓
  ACQUISITION
      ↓
 RAW EVIDENCE
      ↓
 EVIDENCE GRAPH
      ↓
   FORMATION
      ↓
  VALIDATION
      ↓
 INTELLIGENCE
      ↓
RADAR / RESEARCH / REPORT
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
EVIDENCE GRAPH
      ↓
VALIDATION
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

## Architecture

```text
                    HAHAWEEK
                       │
        ┌──────────────┼──────────────┐
        ↓              ↓              ↓
    INTERNET          RPC           WALLET
        │              │              │
        └──────────────┼──────────────┘
                       ↓
                  ACQUISITION
                       ↓
                  RAW EVIDENCE
                       ↓
                 EVIDENCE GRAPH
                       ↓
                 FORMATION ENGINE
                       ↓
                    VALIDATION
                       ↓
                 INTELLIGENCE
                  /          \
               RADAR       RESEARCH
                              ↓
                           REPORT
```

The Evidence Graph is a projection and must remain rebuildable from authoritative evidence.

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

V4 production implementation and V4 production authority activation remain distinct. **Production V4 authority remains INACTIVE/BLOCKED unless a separate authorized production-boundary contract explicitly permits activation.**

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

## Research & Publication

Research is a first-class output.

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
Architecture                 DEFINED
V4 Integrity                 IN DEVELOPMENT
Design Gate 2                PASS
Production V4                BLOCKED / INACTIVE
MVP                          DESIGN / VALIDATION
Automated Trading            NOT PART OF THE FOUNDATION
```

---

## License

See the repository license and individual project artifacts for applicable terms.
