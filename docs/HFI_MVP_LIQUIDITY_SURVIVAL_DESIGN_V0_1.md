# HFI-MVP-E2E-V0_1 — LIQUIDITY_SURVIVAL Design v0.1

## Status

DESIGN — AUTHORIZED / READY FOR IMPLEMENTATION

## Design decision

The MVP will implement `LIQUIDITY_SURVIVAL` as a versioned, descriptive historical criterion over **observed active liquidity reported by Swap events**, not as a claim about total pool TVL, economic health, or future price performance.

This distinction is mandatory.

## Version

`liquidity-survival-v1`

## Observation window

- Duration: 7 * 24 hours.
- Start: `formation_end`, the verified First Swap event time.
- End: start + 7 days.
- No validation may evaluate before the window closes.

## Reference liquidity

Reference liquidity is the `liquidity` value decoded from the verified First Swap event that closes the Pool Bootstrap formation.

Reference liquidity MUST be a positive integer string.

No later observation may redefine the reference.

## Survival threshold

Experimental configuration:

`minimum_fraction = 0.50`

Criterion:

`observed active liquidity >= 50% of reference active liquidity`

The 50% threshold is an explicit **experimental configuration for this MVP**, not a universal definition of liquidity quality or market health.

Changing this value MUST create a distinct configuration/evaluation identity.

## Observation source

Qualifying observations are verified Swap events for the same chain and pool whose event_time is within:

`[formation_end, formation_end + 7 days]`

Each observation MUST contain:

- evidence_id
- event_time
- active liquidity value
- pool identity
- source/provenance linkage.

The existing Swap decoder already exposes the `liquidity` field.

## Coverage

A result can be COMPLETE only when the acquisition/evidence layer demonstrates complete coverage of the required observation window.

For the first evaluator implementation, COMPLETE coverage additionally requires:

- at least one qualifying Swap observation in each of the seven 24-hour buckets beginning at formation_end;
- the acquisition interval covering the full seven-day window without known provider gaps;
- no unresolved contradiction/reorg invalidating required observations.

If these conditions are not established, the evaluator returns INCONCLUSIVE rather than treating missing observations as survival or failure.

This is intentionally conservative: a pool with no observed swaps cannot be declared to have survived merely because no negative event was observed.

## Result semantics

### PASS

All seven coverage buckets are populated and every qualifying active-liquidity observation is at least the configured threshold.

### FAIL

Coverage is COMPLETE and at least one qualifying observation is below the threshold.

### INCONCLUSIVE

Coverage is PARTIAL/UNKNOWN, a bucket is missing, evidence is unavailable, or required evidence is contradictory/inconclusive.

No missing-data state becomes FAIL.

## No-look-ahead

The reference is fixed at formation_end.

The evaluation window begins at formation_end and ends exactly seven days later.

No event after the evaluation window may influence the result.

Formation detection itself MUST NOT consume observations from the validation window.

## Evidence / provenance

The criterion evidence set contains:

- reference First Swap evidence
- all qualifying Swap observations used in evaluation
- coverage evidence/reference where available.

The evaluator is derived and non-authoritative.

## Limitations

This criterion measures observed active liquidity on swaps. It does not establish:

- total token reserves
- total TVL
- USD liquidity
- price stability
- profitability
- market quality
- causal success
- future performance.

The Research Report MUST preserve this limitation when making a material claim.

## Test vectors

Required:

1. deterministic PASS with complete seven-bucket coverage.
2. deterministic FAIL with complete coverage and one below-threshold observation.
3. INCONCLUSIVE for missing bucket.
4. INCONCLUSIVE for partial/unknown coverage.
5. threshold boundary exactly 50% passes.
6. observation outside window rejected/ignored according to explicit input validation.
7. reference liquidity cannot be zero.
8. observations from another pool cannot be admitted.
9. future observation cannot affect the result.
10. repeated evaluation is deterministic.
