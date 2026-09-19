# HAHAWEEK V4 Golden Vector Schema

Status: **STEP 3B-A — REFERENCE IMPLEMENTATION + FIRST ACTUAL VECTORS**

Protocol: `HAHAWEEK-EVIDENCE-V4`

This document defines the storage contract for executable V4 golden vectors. It does **not** implement canonicalization, generate production evidence, or change production state.

## 1. Purpose

Golden vectors are the deterministic reference fixtures for Design Gate 2. A vector binds:

1. a stable `vector_id`;
2. a V4 `domain`;
3. an `input_object`;
4. the exact UTF-8 bytes produced by RFC 8785 JSON Canonicalization Scheme (JCS), represented as lowercase hexadecimal; and
5. the expected domain-separated SHA-256 digest.

No expected hash is to be invented or copied from a language-native JSON serializer.

## 2. Canonical computation contract

For an input object `O` and domain `D`:

```text
canonical_bytes(O) = UTF8(RFC8785_JCS(O))
hash(D,O) = SHA256( UTF8(D) || 0x00 || canonical_bytes(O) )
```

The fixture stores `canonical_utf8_hex` and `expected_hash` so an independent verifier can reproduce and compare both artifacts.

The single-byte `0x00` separator is part of the hash preimage. It is not represented as a character in the domain string.

## 3. Vector object — exact keys

Every vector object has exactly these five keys:

| Key | Type | Constraint |
|---|---|---|
| `vector_id` | string | Stable, unique identifier within the vector set |
| `domain` | string | One value from the V4 domain registry |
| `input_object` | object | Integrity-critical V4 input; domain-specific validation applies |
| `canonical_utf8_hex` | string | Lowercase hex; even number of hex characters |
| `expected_hash` | string | Lowercase 64-character SHA-256 hex |

Vector objects MUST NOT contain additional keys.

## 4. Domain registry

The schema accepts exactly these V4 domains:

- `HAHAWEEK-EVIDENCE-V4-PAYLOAD`
- `HAHAWEEK-EVIDENCE-V4-TRANSITION`
- `HAHAWEEK-EVIDENCE-V4-ACQUISITION`
- `HAHAWEEK-EVIDENCE-V4-SEGMENT`
- `HAHAWEEK-EVIDENCE-V4-MANIFEST`
- `HAHAWEEK-EVIDENCE-V4-CHECKPOINT`
- `HAHAWEEK-EVIDENCE-V4-CURSOR`
- `HAHAWEEK-EVIDENCE-V4-LEASE`
- `HAHAWEEK-EVIDENCE-V4-MIGRATION`
- `HAHAWEEK-EVIDENCE-V4-BACKUP`

## 5. Vector-set wrapper

A vector fixture file is a JSON object containing:

- `format`: `HAHAWEEK-EVIDENCE-V4-GOLDEN-VECTORS-1`
- `protocol`: `HAHAWEEK-EVIDENCE-V4`
- `canonicalization`: `RFC8785-JCS-UTF8-SHA256-DOMAIN-SEPARATOR`
- `vectors`: an array of vector objects conforming to this contract

The wrapper is fixture metadata. It is not itself a V4 evidence object and is not hashed as a protocol object.

## 6. Required vector families

The complete Gate 2 fixture set must eventually cover:

- event identity;
- event payload;
- transition;
- reorg observation;
- acquisition;
- segment identity;
- segment body;
- segment seal;
- manifest;
- checkpoint;
- cursor;
- lease;
- migration;
- migration manifest;
- backup.

This schema step defines the container contract only. Domain-specific input schemas and executable vectors are subsequent steps.

## 7. Negative-vector policy

Negative fixtures must be explicit mutations of valid vectors and must record the expected rejection reason in the verifier test layer, not by adding non-contract keys to the production vector object.

Required mutation families include:

- value mutation;
- type mutation;
- key-set mutation;
- address/hash casing mutation;
- block-hash mutation;
- transaction/log index mutation;
- transition predecessor mutation;
- transition gap/fork;
- acquisition response mutation;
- segment body mutation;
- manifest inventory mutation;
- checkpoint linkage mutation;
- cursor-authority violation;
- conflicting duplicate identity.

## 8. Determinism and immutability

Golden vectors are reference evidence for the protocol contract.

Rules:

- Do not regenerate vectors merely to make tests pass.
- A changed expected digest is a protocol change and requires explicit review.
- Do not derive vectors from production runtime state.
- Do not import legacy ingestion, SQLite state, cursor code, or production acquisition code to define the reference values.
- Vector generation must be reproducible offline.
- The reference implementation, executable verifier, and production implementation must eventually agree with the same vectors.

## 9. File location

The normative JSON Schema is:

`docs/golden-vectors.schema.json`

Future fixture files should live under:

`docs/golden-vectors/`

Production raw evidence and runtime state remain outside GitHub.

## 10. Gate 2 relationship

Completing STEP 3A does **not** pass Design Gate 2.

Gate 2 remains open until executable canonicalization, golden hashes, offline verification, transition/reorg tests, checkpoint/cursor recovery, collision handling, lease/fencing, durability/crash behavior, and deterministic migration tests are demonstrated.
