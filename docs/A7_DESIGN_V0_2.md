# HAHAWEEK — A7 Design v0.2

**Contract:** `HAHAWEEK-HFI-RADAR-OPERATIONALIZATION-V0_2`

## Architecture

`Robinhood Mainnet RPC`
→ `HFI-MVP E5 runtime`
→ `raw/canonical evidence + Formation + Outcome + Validation`
→ `HFI-RADAR Candidate`
→ `HFI-RADAR Formation`
→ `Intelligence Projection`
→ `Evidence Summary`
→ `Validated Radar`
→ `HFI-RADAR Validated Projection`

The operational Radar layer is read-only and derived.

## Candidate boundary

Candidate input contains exactly the earliest verified:

- `POOL_CREATED`
- `LIQUIDITY_ADDED`

evidence.

It does not contain `FIRST_SWAP`, Outcome, or Validation evidence.

Therefore Candidate identity is bounded at the liquidity-addition observation boundary and does not use later knowledge.

## Formation boundary

Formation Radar is created only from the verified Formation Result produced by the frozen HFI-MVP Formation adapter.

No Formation semantics are reimplemented.

## Validation boundary

Validated Radar is created only after:

`Formation → Outcome → Validation(CONFIRMED) → Intelligence → Evidence Summary → Validated Radar`

No validation state is manufactured by A7.

## Integrity and provenance

The A7 artifact records:

- exact implementation commit;
- chain ID;
- RPC provenance;
- upstream HFI runtime lineage;
- Candidate/Formation/Validated Radar IDs;
- deterministic Radar digest;
- upstream integrity manifest;
- replay results;
- external-action boundary.

## Failure behavior

Any failed upstream runtime, missing artifact, commit mismatch, chain mismatch, missing evidence, non-confirmed validation, or replay mismatch causes terminal `FAILED`.

No partial result is promoted to `VERIFIED`.

## Runtime boundary

A7 invokes the existing read-only HFI-MVP runtime. It does not invoke `eth_sendRawTransaction`, signing, publication, trading, or external mutation.

## Design conclusion

**DESIGN = VERIFIED**

Implementation is limited to the operational bridge and workflow/provenance changes required to prove the A7 acceptance criteria.


## Post-runtime corrective design

The first exact-main A7 runtime reached verified HFI-MVP evidence but exposed an integration boundary: Validation legitimately reused Outcome evidence IDs, while the frozen Intelligence Projection helper rejects cross-layer duplicate references.

The corrective adapter removes only those repeated Validation references from the adapter copy. Authoritative Formation, Outcome, and Validation records are not mutated. The resulting Intelligence evidence set remains the deterministic union of all three sources.

Duplicate evidence IDs within one authoritative source remain invalid.

**Corrective design = VERIFIED.**
