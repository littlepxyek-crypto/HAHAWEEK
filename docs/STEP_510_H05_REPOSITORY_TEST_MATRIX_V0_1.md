# STEP 510 — H-05 Repository Test Matrix v0.1

Status: IMPLEMENTED — PENDING VERIFICATION

This matrix maps Design Gate 2 controls to executable tests and verification commands. It is an inventory only and does not activate V4 production authority.

| Control | Executable evidence | Command | Expected invariant | Disposition |
|---|---|---|---|---|
| F-01 canonicalization/hash | tests/rfc8785-conformance.test.js; tests/reference-v4.test.js; golden-vector scripts | npm test; npm run verify:v4 | deterministic canonical bytes/hash agree with reference/vectors | COVERED |
| F-02 transition/reorg | tests/transition.test.js; tests/f02-reorg-verifier.test.js; F-02 scenario fixture | npm test; npm run verify:v4 | valid transitions; gaps/forks/conflicts/recovery fail closed; replay deterministic | COVERED |
| F-03 checkpoint/cursor | tests/checkpoint-cursor-recovery-golden.test.js; tests/block-cursor.test.js; tests/ingestion-recovery.test.js | npm test | cursor cannot silently regress or outrun persisted recovery boundary | COVERED |
| F-04 legacy migration | no dedicated migration authority is included in the current verified boundary | npm test | migration is not inferred or activated without dedicated evidence | CONDITIONAL / NOT ACTIVATED |
| F-05 RPC acquisition | tests/rpc.test.js; tests/rpc-call.test.js; tests/raw-log-ingestion.test.js | npm test | RPC failure is preserved; tested acquisition/chunking behavior is deterministic | CONDITIONAL |
| H-01 legacy write freeze | tests/legacy-write-freeze.test.js; tests/database-write-boundary.test.js | npm test | LEGACY_FROZEN rejects covered legacy writes; DB bypass is blocked | VERIFIED |
| H-02 duplicate/collision | tests/h02-duplicate-collision.test.js; tests/raw-event-store.test.js | npm test | same identity+same digest idempotent; different digest integrity conflict | VERIFIED |
| H-03 single writer/fencing | tests/h03-single-writer-fence.test.js | npm test | stale/expired/malformed authority fails closed; one valid writer | VERIFIED |
| H-04 durability/recovery | tests/h04-durability-recovery.test.js; tests/database-persistence.test.js | npm test | evidence persistence precedes cursor advancement; replay is deterministic/idempotent | VERIFIED |
| H-05 offline verification | scripts/verify-golden-vectors.js; scripts/verify-golden-vector-coverage.js | npm test; npm run verify:v4; npm run verify:v4:coverage | invalid artifacts fail verification; evidence boundary preserved | COVERED |

## Negative/fail-closed coverage

The matrix requires executable negative behavior for malformed canonical/transition input, missing predecessors/gaps, competing histories/collisions, stale/expired/malformed writer authority, evidence persistence failure, cursor regression, conflicting digests, and RPC failure without silent normalization.

F-04 and F-05 remain conditional; missing evidence is not manufactured. H-01 through H-04 retain their reconciled authority.

A matrix entry is closed only when its executable path passes CI or its conditional disposition is explicitly preserved.

No V4 production activation, RPC change, cursor/checkpoint semantic change, SQLite migration, historical rewrite/deletion, or predictive/trading/signing/publication behavior is introduced.
