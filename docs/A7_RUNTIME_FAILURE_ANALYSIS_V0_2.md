# A7 Runtime Failure Analysis v0.2

**Contract:** `HAHAWEEK-HFI-RADAR-OPERATIONALIZATION-V0_2`  
**Failed runtime:** workflow `36992125496`  
**Exact main:** `02d331d4ccc3b2d7eba94b0f25e61eb9e22e2d9e`  
**Artifact:** `11220506318`

## Classification

The runtime reached the HFI-MVP upstream runtime successfully.

The HFI-MVP artifact was terminal `VERIFIED` on Robinhood Mainnet chain 4663 and contained real raw/canonical evidence, VALID Formation, COMPLETE Historical Outcome, and CONFIRMED Validation.

The A7 bridge then failed with:

`EVIDENCE_IDS_DUPLICATE`

## Root cause

The frozen Intelligence Projection helper rejects duplicate evidence IDs across the concatenated Formation + Outcome + Validation arrays.

The actual Validation Result legitimately reuses the same evidence references already present in Outcome. This is duplicate **reference membership**, not duplicate evidence identity.

No authoritative evidence was duplicated or mutated.

## Corrective boundary

A7 now performs an explicit adapter-only set normalization:

- authoritative Formation evidence is unchanged;
- authoritative Outcome evidence is unchanged;
- authoritative Validation evidence is unchanged;
- only Validation references already represented by Formation/Outcome are omitted from the adapter copy;
- the downstream Intelligence evidence set remains the complete deterministic union.

Duplicate references inside the Validation Result itself remain a failure.

This is documented as adapter-level reference deduplication, not evidence normalization.

## Historical preservation

The failed A7 runtime remains preserved as a failure observation and is not reclassified as success.

## Status

**Root cause identified.**

**Minimal corrective change authorized by A7.**

A new runtime is required before A7 can be marked VERIFIED.
