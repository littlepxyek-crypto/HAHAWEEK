# HAHAWEEK — Canonical Blueprint

## Status

**Canonical project blueprint.**

This document defines the project-level direction of HAHAWEEK. Technical architecture is an implementation of this blueprint, not a replacement for it.

## 1. Project Identity

HAHAWEEK is an evidence-first blockchain intelligence infrastructure.

Its purpose is to observe, collect, map, verify, form evidence, operate a radar layer, and document blockchain activity without losing historical evidence or hiding uncertainty.

## 2. Canonical Project Flow

```
OBSERVE
   ↓
COLLECT
   ↓
MAP
   ↓
VERIFY
   ↓
FORM
   ↓
RADAR
   ↓
DOCUMENT
```

### OBSERVE
Identify activity and signals from available blockchain and related data sources.

### COLLECT
Acquire raw on-chain evidence while preserving source data and acquisition state.

### MAP
Connect blocks, transactions, wallets, contracts, events, entities, and relationships.

### VERIFY
Validate evidence, provenance, chronology, consistency, and chain state.

### FORM
Form evidence-backed structures, patterns, timelines, and relationships. Interpretation must remain distinguishable from fact.

### RADAR
Expose validated activity and evidence through monitoring and discovery workflows.

### DOCUMENT
Preserve evidence, provenance, state, findings, and reproducible outputs.

## 3. Technical Architecture

The technical architecture answers **HOW** the canonical project flow is implemented:

```
Blockchain / RPC
      ↓
Ingestion
      ↓
State / Cursor
      ↓
Raw Evidence
      ↓
Validation
      ↓
Evidence Graph
      ↓
Identity Resolution
      ↓
Temporal Layer
      ↓
Trust / Provenance
      ↓
Integrity Layer
      ↓
Verified Data
```

This technical architecture is subordinate to and implements the canonical project blueprint.

## 4. Non-Negotiable Principles

- No silent normalization.
- No silent cursor reset.
- No predictive score without validation.
- No loss or overwrite of historical raw evidence.
- Preserve provenance.
- Preserve failure state.
- Reorg-aware processing.
- Distinguish facts, evidence, inference, and prediction.
- Prefer reproducibility and auditability over opaque conclusions.

## 5. Integrity Direction

The integrity layer is designed around:

```
Canonical Data
    ↓
RFC 8785 JCS
    ↓
SHA-256
    ↓
Manifest
    ↓
Checkpoint
    ↓
Cursor
    ↓
Recovery
```

The exact implementation may evolve, but the requirement to preserve verifiable history remains.

## 6. Relationship to Other Projects

HAHAWEEK is a **standalone project**.

Other systems may consume HAHAWEEK outputs, but they must not silently redefine or overwrite the HAHAWEEK core.

ASTRA is not part of the HAHAWEEK core.

## 7. Source-of-Truth Rule

When future work proposes a new architecture, feature, layer, or integration:

1. Keep this canonical blueprint intact.
2. Determine which canonical stage it supports.
3. Add or refine the technical implementation under that stage.
4. Do not replace the project direction without an explicit architectural decision.
5. Preserve previous evidence and historical artifacts.

## 8. Short Definition

> **HAHAWEEK is an evidence-first blockchain intelligence infrastructure that transforms raw blockchain activity into structured, validated, traceable, and auditable evidence.**

---

**Canonical rule:** one HAHAWEEK project blueprint; technical architecture explains how that blueprint is implemented.
