# STEP 484 — V4 Transition Golden-Vector Contract Resolution v0.1

Status: **CONTRACT RESOLUTION CANDIDATE**

## Purpose

Resolve the representation mismatch discovered when STEP 484 coverage applied the frozen independent STEP 483 verifier to the complete committed V4 golden-vector corpus.

## Finding

`docs/golden-vectors/transition.json` is historically valid for the V4 transition validator, which represents transition hashes as `0x` plus 64 lowercase hexadecimal characters.

The generic V4 golden-vector contract, however, defines the `expected_hash` fixture field as exactly 64 lowercase hexadecimal characters without `0x`.

Historical evidence is preserved in commit `41cf16ec7dc836cd3382fa14ecaca53bcff81a35`.

## Decision

The `expected_hash` field in the generic V4 golden-vector fixture format is a serialized digest value, not the transition domain's application-level hash identifier.

Therefore:

- `expected_hash` uses the generic representation: 64 lowercase hexadecimal characters, without `0x`.
- The underlying SHA-256 digest bytes and domain-separated preimage are unchanged.
- Transition application-level fields such as `evidence_id` and `previous_transition_hash` retain their established `0x`-prefixed representation.
- The transition validator continues to return an application-level transition hash with `0x` prefix.
- The golden-vector fixture records the same digest without the presentation prefix so it is compatible with the frozen generic independent verifier.
- No digest is regenerated from a different input, and no canonical input bytes are changed.

This is an explicit contract repair, not silent normalization.

## Compatibility proof obligation

`domainSeparatedHash(domain, input_object).hash === expected_hash`

and:

`hashTransition(input_object) === "0x" + expected_hash`

The two expressions must therefore identify the same 32-byte SHA-256 digest.

## Scope

This resolution changes only the representation of the `expected_hash` fixture field in `transition.json` and the corresponding transition golden-vector test assertions.

It does not change:

- RFC 8785/JCS canonicalization;
- domain separation;
- SHA-256;
- transition input schema;
- transition state semantics;
- transition application-level hash representation;
- production authority;
- raw evidence;
- cursor/checkpoint/manifest state;
- runtime/network behavior;
- STEP 483 verifier implementation or freeze;
- STEP 484 corpus inventory semantics.

## Historical preservation

The pre-resolution representation remains recoverable through Git history, including commit `41cf16ec7dc836cd3382fa14ecaca53bcff81a35`.

No historical commit is rewritten.

## Acceptance gates

1. The transition fixture contains no `0x` prefix in `expected_hash`.
2. Canonical input bytes remain byte-for-byte unchanged.
3. The SHA-256 digest bytes remain identical.
4. Existing transition validator tests continue to prove `0x` application-level output.
5. Generic STEP 483 independent verification accepts `transition.json`.
6. STEP 484 coverage verifies the complete in-scope V4 fixture corpus.
7. Security/regression checks pass.
8. STEP 483 remains unchanged and frozen.

## Relationship to STEP 484

This document resolves the contract mismatch exposed by STEP 484. It does not itself claim STEP 484 implementation, freeze, or state finalization.

STEP 484 implementation may resume only after this resolution is merged and its acceptance gates pass.