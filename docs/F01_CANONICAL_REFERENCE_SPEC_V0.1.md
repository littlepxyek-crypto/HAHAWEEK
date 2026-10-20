# HAHAWEEK — F-01 Canonical Reference Specification v0.1

Status: DRAFT — DESIGN GATE 2

## Purpose

Define the reference boundary for deterministic V4 canonicalization and identity.
This document does not authorize production V4 activation.

## Normative pipeline

Input object
→ schema validation
→ RFC 8785 JSON Canonicalization Scheme (JCS)
→ UTF-8 canonical bytes
→ domain-separated hash preimage
→ SHA-256
→ deterministic identity.

## Locked protocol requirements

1. Canonical JSON serialization MUST use RFC 8785 JCS.
2. Canonical bytes MUST be the UTF-8 encoding of the JCS result.
3. SHA-256 MUST be the digest algorithm for V4 identity.
4. Identity calculation MUST be deterministic and reproducible.
5. Invalid or ambiguous input MUST fail closed.
6. Reordering object keys MUST NOT change canonical identity.
7. Changing a semantically relevant value MUST change canonical identity.
8. Canonicalization MUST NOT silently normalize or discard unknown protocol fields.
9. The canonical preimage and domain-separation rule MUST be explicit before F-01 PASS.
10. Golden vectors MUST independently verify the reference implementation.

## Required exact decisions before F-01 PASS

The following values are intentionally NOT invented in this draft:

- canonical field schemas for each V4 artifact;
- exact domain-separation string(s);
- exact identity preimage construction;
- artifact-specific identity scope;
- treatment of any protocol extension fields;
- complete golden-vector corpus.

These values must be derived from the existing V4 protocol specification/reference artifacts and then frozen.

## Golden-vector requirements

At minimum the F-01 vector set MUST cover:

- valid canonical object;
- reordered keys;
- nested object;
- arrays;
- Unicode;
- escaped characters;
- numeric edge cases permitted by JCS;
- missing required field;
- unknown field;
- malformed value;
- domain-separation mutation;
- semantically relevant value mutation;
- expected canonical bytes;
- expected SHA-256 identity.

## Compatibility rule

Existing test/reference implementations that use JSON.stringify MUST NOT be treated as final V4 canonical identity implementations until reconciled with this specification.

In particular, the current F-04 legacy-migration and F-05 RPC-acquisition reference implementations remain test-boundary artifacts.

## Gate status

F-01 remains CONDITIONAL.

Design Gate 2 remains OPEN / NOT PASSED.

Production V4 activation remains NOT AUTHORIZED.

## Next action

Resolve the exact V4 domain-separation and identity-preimage rules from the canonical protocol artifacts, then generate F-01 golden vectors before changing F-04/F-05 hashing implementations.
