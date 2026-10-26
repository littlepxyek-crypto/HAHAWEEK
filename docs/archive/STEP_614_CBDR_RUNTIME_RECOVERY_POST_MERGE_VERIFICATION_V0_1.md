# STEP 614 — CBDR Runtime Recovery Post-Merge Verification v0.1

## Status

POST-MERGE VERIFICATION — VERIFIED for repository state.

- Implementation PR: #582
- Implementation head: `ad68eb8e17b203547323042c3035d29b422992de`
- Merge commit: `695df52cdebfe962aec23c5f0dd8983b2b4a73c4`
- Main is verified at the merge commit.
- PR #582 is merged.
- PR-head HAHAWEEK Tests: SUCCESS.
- PR-head HAHAWEEK Security and Regression: SUCCESS.
- PR-head CodeQL workflow: SUCCESS.

## Changed capability

The runtime processing-context path now attempts durable exact-range recovery before constructing a new temporal CBDR.

The implementation verifies the durable lineage/snapshot and current provider block identities before reuse.

If identities differ, the existing canonical/reorg path remains responsible for the new observation.

## Preserved capability

The merge does not change:

- CBDR digest rules;
- snapshot digest rules;
- evidence identity;
- authority validation;
- cursor advancement;
- reorg generation semantics;
- Surveillance authority;
- V4 production authority;
- trading/signing/execution.

## Regression evidence

The implementation adds tests for:

- restart/retry with a later provider head;
- current identity mismatch and existing reorg path;
- conflicting durable exact lineages.

The tests assert that recovery happens before raw ingestion on the durable-recovery path.

## Remaining runtime verification

Repository verification does not replace the actual Termux environment.

The original runtime blocker remains to be exercised against the updated main:

`CBDR_INTEGRITY_CONFLICT` must be re-tested through the repository-supported `./bin/hahaweek scan` command.

The cursor must remain fail-closed if F03 authority is still unavailable.

Global LIVE-READINESS remains NOT READY until actual operator recovery is observed.
