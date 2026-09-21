# STEP 74 — Normative JCS Implementation Boundary

Status: REFERENCE / DESIGN BOUNDARY
Gate 2: NOT PASSED
Production V4 activation: NOT AUTHORIZED

## Decision
The current `src/reference/v4/jcs.js` is retained as a reference serializer only.
It MUST NOT be described or promoted as full RFC 8785 conformance.

## Frozen protocol requirement
V4 integrity-critical canonical serialization requires RFC 8785 JCS over UTF-8.
The implementation boundary must therefore be tested against independent conformance vectors before any fixture is promoted to NORMATIVE_VERIFIED.

## Required conformance areas
- object member ordering
- string escaping and Unicode handling
- surrogate validation
- JSON number serialization, including exponent and negative-zero cases
- arrays and nested values
- rejection of unsupported/non-JSON values
- exact UTF-8 bytes
- deterministic output across clean runs

## Current dependency state
`package.json` currently has `ethers` and `sql.js` dependencies and does not declare an RFC 8785 implementation.

Therefore no dependency or implementation is silently introduced by this boundary document.

## Promotion gate
The future normative serializer may replace or supersede the reference serializer only after:
1. implementation is isolated under the V4 reference/protocol boundary;
2. independent RFC 8785 conformance vectors pass;
3. existing HAHAWEEK golden vectors are re-derived from the normative serializer;
4. negative vectors reject malformed/non-conformant inputs;
5. domain-separated hashes are reproduced from exact canonical UTF-8 bytes;
6. CI reproduces the results from a clean checkout.

## Safety rule
Do not modify production evidence, production cursors, legacy state, or production V4 activation while this gate is open.