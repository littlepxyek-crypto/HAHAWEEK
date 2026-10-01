# HFI-MVP-E2E-V0_1 — RPC Error Diagnostic Design v0.1

## Authority
A0-A5 under HFI-MVP-E2E-V0_1.

## Problem
The exact-main E5 artifact on merge commit 37c3249 records only `could not coalesce error` for the candidate acquisition failure. The underlying provider response is not preserved.

## Design
Extend the existing error formatting helper to retain nested provider error code/message fields already present on the caught exception. Do not retry differently, change block ranges, change candidate selection, or alter formation/outcome/validation semantics.

## Safety
No new network source, credentials, write methods, cursor, writer-fence, evidence identity, or authority. The output remains failure evidence only.

## Acceptance
Tests and Security/Regression must pass. A subsequent exact-main E5 artifact must expose the provider's actual error classification if acquisition fails again.
