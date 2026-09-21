# RFC 8785 Boundary Evidence — Local Reproducibility

Status: REFERENCE EVIDENCE
Gate 2: NOT PASSED

This record defines the exact local command used to exercise the isolated RFC 8785 boundary:

```
npm ci
npm run verify:rfc8785
```

The command executes only:
`tests/rfc8785-conformance-boundary.test.js`

## Evidence policy

A PASS may only be recorded after the command has actually executed and returned exit code 0.

A FAIL must preserve the failing test name and assertion output.

This document intentionally contains no fabricated PASS result.

## Current repository limitation

The GitHub workflow has been configured to execute the same boundary runner, but no workflow execution result is currently attached to the relevant commit.

Therefore this document is a reproducibility contract, not a claim of conformance.

## Promotion rule

Do not mark RFC 8785 compliance, promote golden vectors to NORMATIVE_VERIFIED, or activate production V4 based on this document alone.
