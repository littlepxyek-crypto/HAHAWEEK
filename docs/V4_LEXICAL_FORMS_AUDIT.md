# HAHAWEEK V4 — Lexical Forms Audit

Status: **STEP 3C-C — AUDIT COMPLETE / NORMATIVE LEXICAL RULES NOT YET FROZEN**

Protocol: `HAHAWEEK-EVIDENCE-V4`

Base commit audited: `4ee0e132df5a10cb8ada8a85c0d245ef1d2c6f17`

## 1. Purpose

This artifact records the repository audit required before an executable V4 event-identity golden vector is created.

It separates:

- rules already established by the V4 reference model;
- repository implementation behavior;
- unresolved normative lexical decisions.

This document does **not** change production behavior and does not declare unresolved lexical rules authoritative.

## 2. V4 event identity fields

The normative event identity shape is already frozen by `docs/V4_EVENT_IDENTITY_INPUT_CONTRACT.md`:

| Field | Current V4 status | Current repository observation |
|---|---|---|
| `chain_id` | uint64 decimal string required | Legacy runtime commonly uses JavaScript Number |
| `block_hash` | exact V4 hash form required | No authoritative V4 lexical validator found |
| `block_number` | uint64 decimal string required | Legacy runtime commonly uses JavaScript Number |
| `transaction_hash` | exact V4 hash form required | Legacy event code only checks non-empty string in places and lowercases |
| `transaction_index` | uint64 decimal string required | No V4 validator found |
| `log_index` | uint64 decimal string required | Legacy runtime commonly uses Number |
| `contract_address` | exact V4 address form required | Existing pool identity has an Ethereum-style `0x` + 40 hex validator |
| `topic0` | exact V4 topic form required | Existing event decoders compare topic0 case-insensitively after lowercasing |

## 3. Established V4 rules

The following are already authoritative from the V4 reference model:

1. Integrity-critical event identity contains exactly eight fields.
2. All eight fields are required.
3. All eight values are JSON strings.
4. Protocol integer fields are unsigned 64-bit decimal strings.
5. `block_hash` is mandatory.
6. No silent normalization may be introduced for unresolved lexical fields.
7. Event identity uses the PAYLOAD domain.
8. RFC 8785 JCS is the canonical representation.
9. SHA-256 with the V4 domain separator is the identity digest.

These rules are not changed by this audit.

## 4. Integer lexical contract — unresolved details

The V4 model establishes **unsigned 64-bit decimal strings**, but the repository currently lacks a normative lexical grammar defining every edge case.

Still unresolved and therefore **not yet authoritative**:

- whether leading zeroes are forbidden except the value `0`;
- whether an empty string is rejected explicitly by lexical validation;
- exact maximum-value enforcement at the lexical validator boundary;
- whether any additional canonical decimal restrictions are required.

Until these are frozen, no executable V4 validator should claim complete uint64 lexical conformance.

## 5. Hash lexical contract — unresolved

The V4 model requires exact lexical forms for:

- `block_hash`;
- `transaction_hash`.

The repository contains legacy Ethereum-oriented behavior, but it is not yet a V4 normative contract.

Observed legacy behavior includes lowercasing and, in some locations, string/non-empty checks.

The audit therefore does **not** promote legacy behavior into V4.

Unresolved:

- required prefix;
- exact byte length;
- hexadecimal character set;
- case policy;
- whether canonical V4 representation is lowercase;
- rejection behavior for alternate encodings.

## 6. Address lexical contract — partially evidenced, not yet V4-authoritative

`src/core/pool-identity.js` currently validates addresses using:

`^0x[0-9a-f]{40}$`

after lowercasing the supplied string.

This is useful repository evidence for the existing Ethereum-style address representation.

However, it is a **legacy/runtime implementation rule**, not yet an explicit V4 lexical specification for `contract_address`.

Therefore:

- do not copy the rule into V4 silently;
- do not infer checksum/case semantics from the legacy normalizer;
- do not use legacy normalization as proof of V4 canonical input.

## 7. Topic0 lexical contract — unresolved

Existing event decoders compare topic0 values after lowercasing.

That demonstrates current implementation behavior but does not freeze a V4 topic lexical form.

Unresolved:

- exact byte length;
- required hexadecimal representation;
- prefix;
- case policy;
- normalization rules.

## 8. Legacy identity conflict identified

The legacy raw event identity is effectively based on:

`chainId + blockNumber + transactionHash + logIndex`

The V4 event identity explicitly adds:

- `block_hash`;
- `transaction_index`;
- `contract_address`;
- `topic0`;

and requires all protocol integers as decimal strings.

Therefore the legacy identity must **not** be treated as equivalent to V4 identity.

No migration or rewrite is performed by this audit.

## 9. Chain ID evidence

`PROJECT_STATE.md` records Robinhood Chain Mainnet as chain ID `4663`.

That is repository project configuration evidence.

For V4, the value must be represented in the event identity as a protocol integer decimal string:

`"4663"`

This does not by itself freeze the complete uint64 lexical grammar.

## 10. Classification

### DEFINED / AUTHORITATIVE

- eight-field event identity shape;
- required fields;
- all values are strings;
- uint64 semantic type;
- mandatory block hash;
- PAYLOAD domain;
- RFC 8785 JCS;
- SHA-256 domain-separated hashing;
- exact-key-set requirement;
- no silent coercion.

### EVIDENCED BUT NOT V4-AUTHORITATIVE

- Ethereum-style 20-byte address representation in `pool-identity.js`;
- lowercasing in legacy address/hash/topic handling;
- chain ID `4663` for the project's Robinhood Chain configuration;
- legacy event identity composition.

### UNRESOLVED

- complete uint64 lexical grammar;
- block hash lexical form;
- transaction hash lexical form;
- V4 contract-address lexical form;
- V4 topic0 lexical form;
- exact case/normalization policy for those fields.

### PROHIBITED FOR NOW

- creating a V4 event-identity golden vector with invented lexical rules;
- silently importing legacy normalization into V4;
- changing production identity/storage code during this design step;
- migrating legacy identities into V4;
- declaring Design Gate 2 passed.

## 11. Required next artifact

The next artifact should be a **normative V4 lexical-form specification** that explicitly freezes only rules supported by project requirements and verified evidence.

It must identify every rule as either:

- normative;
- compatibility/evidence-only;
- unresolved.

Only after that contract is merged should the event-identity golden vector be generated.

## 12. Safety boundary

This audit:

- changes documentation only;
- does not modify production ingestion;
- does not modify SQLite/runtime state;
- does not modify cursors;
- does not migrate evidence;
- does not rewrite historical records;
- does not change legacy identity behavior.

Design Gate 2 remains **OPEN**.
