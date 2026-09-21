# F-01 V4 Reorg Observation Golden Vector

fixture_id: f01-reorg-observation-v4-001
protocol: HAHAWEEK-EVIDENCE-V4
domain: HAHAWEEK-EVIDENCE-V4-TRANSITION

input_object:
{"chain_id":"4663","block_number":"64986596","previous_block_hash":"0x1111111111111111111111111111111111111111111111111111111111111111","replacement_block_hash":"0x5555555555555555555555555555555555555555555555555555555555555555","detected_by_acquisition_id":"6666666666666666666666666666666666666666666666666666666666666666"}

canonical_jcs_utf8:
{"block_number":"64986596","chain_id":"4663","detected_by_acquisition_id":"6666666666666666666666666666666666666666666666666666666666666666","previous_block_hash":"0x1111111111111111111111111111111111111111111111111111111111111111","replacement_block_hash":"0x5555555555555555555555555555555555555555555555555555555555555555"}

expected_reorg_observation_id:
9c4cb8a6a5fcdcd0f5bce3dfb92dd1c3c97e6d4f83ad2d8bb0f7ecb66e70f31d

## Required invariants

- Original event evidence remains immutable.
- Reorg observation is append-only evidence.
- A replaced block hash is not silently rewritten.
- Only an event whose prior state is CANONICAL may transition to ORPHANED.
- Replacement-block events receive independent event identities.
- A changed replacement block hash MUST change the observation identity.

## Scope

This vector establishes the reorg-observation identity primitive only. Runtime reorg handling remains separately verified and Gate 2 remains open.
