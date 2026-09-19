# HAHAWEEK V4 — Normative Lexical Forms

Status: **NORMATIVE — STEP 3C-D**

Protocol: `HAHAWEEK-EVIDENCE-V4`

Effective base: `98e7fd439126f18cc62dcf1851e00a14ab30089d`

## 1. Scope

This document freezes the lexical representation of the eight-field V4 event identity.

It is deliberately limited to lexical representation. It does not change event semantics, ingestion, storage, migration, cursor behavior, or legacy identity.

## 2. Canonical lexical principle

For every V4 event-identity field, the stored/input representation MUST already be in the canonical lexical form defined below.

V4 identity validation MUST reject non-canonical alternatives rather than silently normalize them.

No case folding, prefix insertion, whitespace trimming, numeric coercion, or alternate encoding conversion is permitted during validation.

## 3. Protocol unsigned-64 decimal strings

The following fields are protocol unsigned-64 integers:

- `chain_id`
- `block_number`
- `transaction_index`
- `log_index`

Their canonical lexical form is:

`0 | [1-9][0-9]*`

subject to numeric range:

`0 <= value <= 18446744073709551615`

Therefore:

- `"0"` is valid;
- `"1"` is valid;
- `"4663"` is valid;
- `"18446744073709551615"` is valid;
- `"00"` is invalid;
- `"01"` is invalid;
- `"+1"` is invalid;
- `"-1"` is invalid;
- `"1.0"` is invalid;
- scientific notation is invalid;
- empty string is invalid;
- values above `2^64 - 1` are invalid.

JSON numbers are not accepted for these fields. They MUST be JSON strings.

## 4. Hash lexical form

The following fields are 32-byte hash values:

- `block_hash`
- `transaction_hash`

Canonical lexical form:

`0x[0-9a-f]{64}`

Requirements:

- exactly one lowercase `0x` prefix;
- exactly 64 lowercase hexadecimal characters;
- total lexical length 66;
- uppercase hexadecimal is invalid;
- missing prefix is invalid;
- alternate prefixes are invalid;
- whitespace is invalid;
- alternate encodings are invalid.

The value is validated as supplied. V4 MUST NOT lowercase an uppercase value and then accept it.

## 5. Contract address lexical form

`contract_address` is a 20-byte EVM contract address.

Canonical lexical form:

`0x[0-9a-f]{40}`

Requirements:

- exactly one lowercase `0x` prefix;
- exactly 40 lowercase hexadecimal characters;
- total lexical length 42;
- uppercase hexadecimal is invalid;
- mixed-case checksum representation is not the V4 canonical form;
- missing prefix is invalid;
- whitespace is invalid;
- alternate encodings are invalid.

This freezes the canonical representation already evidenced by the repository's existing lowercase Ethereum-style address validation, while making the rule explicit for V4.

## 6. topic0 lexical form

`topic0` is a 32-byte event topic.

Canonical lexical form:

`0x[0-9a-f]{64}`

Requirements:

- exactly one lowercase `0x` prefix;
- exactly 64 lowercase hexadecimal characters;
- total lexical length 66;
- uppercase or mixed-case hexadecimal is invalid;
- missing prefix is invalid;
- whitespace is invalid;
- alternate encodings are invalid.

## 7. Complete event identity lexical contract

The V4 event identity MUST contain exactly these keys:

`chain_id`
`block_hash`
`block_number`
`transaction_hash`
`transaction_index`
`log_index`
`contract_address`
`topic0`

Every value MUST be a string and MUST satisfy the corresponding lexical rule in this document.

No unknown keys are permitted.

## 8. Relationship to RFC 8785

Lexical validation occurs before canonicalization.

After validation, the event identity object is canonicalized with RFC 8785 JCS and hashed using the V4 PAYLOAD domain:

`SHA256(UTF8("HAHAWEEK-EVIDENCE-V4-PAYLOAD") || 0x00 || canonical_utf8(event_identity))`

RFC 8785 does not define the blockchain-specific lexical rules in this document; this document supplies those V4 application-level constraints.

## 9. Legacy compatibility boundary

Legacy runtime behavior remains unchanged.

In particular:

- legacy lowercasing is not used as a V4 validator;
- legacy JavaScript Number fields are not accepted as V4 integer identity fields;
- legacy event identity is not substituted for V4 event identity;
- no historical evidence is rewritten by adopting this contract.

Migration, if required later, MUST preserve source provenance and follow the V4 migration protocol.

## 10. Negative requirements

A V4 implementation MUST reject at least:

- integer leading zeroes;
- integer signs;
- integer decimal/scientific notation;
- integer overflow;
- non-string integer values;
- hash/address/topic uppercase or mixed-case variants;
- missing `0x` prefixes;
- incorrect hexadecimal lengths;
- whitespace;
- unknown event-identity keys;
- missing required keys;
- null values.

## 11. Golden-vector gate

An event-identity golden vector MAY be created only after this normative lexical contract is present.

The golden vector MUST use canonical lexical values and MUST be accompanied by negative mutations covering each rejection class that materially affects identity.

## 12. Safety boundary

This specification:

- changes documentation only;
- does not modify production ingestion;
- does not modify SQLite/runtime state;
- does not modify cursors;
- does not migrate evidence;
- does not rewrite historical records;
- does not change legacy identity behavior.

Design Gate 2 remains OPEN until the executable validator, golden vectors, negative vectors, and remaining Gate 2 controls are independently validated.
