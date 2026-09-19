# HAHAWEEK V4 — Event Identity Input Contract

Status: **STEP 3C-A — NORMATIVE INPUT CONTRACT**

Protocol: `HAHAWEEK-EVIDENCE-V4`

## 1. Purpose

This document freezes the currently specified V4 event-identity input shape before executable event-identity golden vectors are generated.

It is intentionally limited to constraints already established by the V4 Canonical Reference Model. It does **not** invent additional fields, lexical rules, normalization rules, or production behavior.

## 2. Event identity object

The V4 event identity object contains **exactly** these eight keys:

| Key | Required | Type | Established constraint |
|---|---|---|---|
| `chain_id` | yes | string | Protocol integer represented as an unsigned 64-bit decimal string. |
| `block_hash` | yes | string | Exact V4 hash lexical form. Mandatory. |
| `block_number` | yes | string | Protocol integer represented as an unsigned 64-bit decimal string. |
| `transaction_hash` | yes | string | Exact V4 hash lexical form. |
| `transaction_index` | yes | string | Protocol integer represented as an unsigned 64-bit decimal string. |
| `log_index` | yes | string | Protocol integer represented as an unsigned 64-bit decimal string. |
| `contract_address` | yes | string | Exact V4 address lexical form. |
| `topic0` | yes | string | Exact V4 topic lexical form. |

No additional keys are permitted in the integrity-critical event identity object.

No field above may be replaced with a number, null, array, or object.

## 3. Identity computation

The event identity is hashed under the PAYLOAD domain:

```text
event_id = hash(
  HAHAWEEK-EVIDENCE-V4-PAYLOAD,
  event_identity
)
```

where:

```text
canonical_bytes(O) = UTF8(RFC8785_JCS(O))

hash(D,O) = SHA256(
  UTF8(D) || 0x00 || canonical_bytes(O)
)
```

The block hash is part of identity and is mandatory. Block number alone is never sufficient.

## 4. Key-set contract

The exact key set is:

```text
chain_id
block_hash
block_number
transaction_hash
transaction_index
log_index
contract_address
topic0
```

Key omission, addition, renaming, or replacement is an integrity-contract mutation.

Because canonicalization sorts object keys independently of source insertion order, the stored/input key order is not itself semantic. The canonical representation is determined by RFC 8785 JCS.

## 5. Integer representation

The V4 model establishes protocol integers as unsigned 64-bit decimal strings.

Therefore these fields are strings, not JSON numbers:

- `chain_id`
- `block_number`
- `transaction_index`
- `log_index`

This document does not add a new lexical grammar beyond the existing V4 model. The exact acceptance/rejection rules for leading zeroes, maximum-value enforcement, and other lexical edge cases must be explicitly specified before an executable schema validator claims to enforce them.

## 6. Hash/address/topic lexical forms

The V4 model requires exact lexical forms for:

- `block_hash`
- `transaction_hash`
- `contract_address`
- `topic0`

This contract therefore does not invent regexes, case rules, byte lengths, prefixes, or normalization behavior.

Those rules must be promoted from an authoritative V4 specification before they are encoded into the executable schema.

Until then, a vector may not silently normalize these fields.

## 7. Identity mutation requirements

The following mutations must change the event identity digest or be rejected by validation, as applicable:

- block hash mutation;
- transaction hash mutation;
- block number mutation;
- transaction index mutation;
- log index mutation;
- chain ID mutation;
- contract address mutation;
- topic0 mutation;
- field type mutation;
- missing required key;
- additional key;
- invalid lexical form once the authoritative lexical rule exists.

A verifier must never silently coerce a mutated value into the original identity.

## 8. Duplicate/collision relationship

V4 duplicate handling is based on identity plus digest:

```text
same identity + same digest
    -> idempotent

same identity + different digest
    -> INTEGRITY_CONFLICT
    -> fail closed
```

`INSERT OR IGNORE` is not a V4 integrity policy.

## 9. Golden-vector boundary

This contract does **not** create an event-identity golden vector yet.

An executable event-identity vector may be added only after the unresolved lexical contracts identified above are made authoritative.

The first PAYLOAD vector already merged in STEP 3B-A remains valid and unchanged.

## 10. Independence requirement

The event-identity contract and future vectors must remain independent of:

- production ingestion;
- legacy raw storage;
- SQLite runtime state;
- production cursor state;
- production acquisition code.

Required eventual equivalence:

```text
production implementation
        ==
V4 reference model
        ==
golden vectors
        ==
offline verifier
```

## 11. Gate 2 status

STEP 3C-A freezes the currently known event-identity shape.

It does **not** pass Design Gate 2.

Remaining work includes exact lexical specifications, executable event-identity vectors, negative vectors, RFC 8785 conformance coverage, transition/reorg verification, acquisition, segment, manifest/checkpoint/cursor, lease/fencing, durability, migration, and backup verification.
