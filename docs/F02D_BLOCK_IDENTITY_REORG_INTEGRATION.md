# F-02D Block Identity → ReorgDetector Integration Contract

This test boundary verifies that committed block identity data can be supplied to the deterministic reorg detector without granting the detector authority over cursor or evidence state.

## Authority boundary

Block Identity Authority owns identity validation/conflict classification.

ReorgDetector owns only the classification of the observed adjacent block relationship:
- CONTINUOUS
- REORG_DETECTED
- INVALID_INPUT

Neither component may mutate cursor state, delete evidence, assign canonical/orphaned state, or perform rollback.

## Exit criteria

All integration vectors pass, including continuous, parent mismatch, gap, same-height hash conflict, and side-effect checks.

Runtime integration remains deferred until this contract is verified.
