# STEP 567 — Durable Processing-Result / Generation Persistence Implementation Design v0.1

## Flow

caller supplies canonical processing context
→ validate result/lineage/generation
→ validate exact canonical evidence membership
→ acquire/verify existing writer ownership
→ snapshot database
→ BEGIN transaction
→ insert immutable processing result
→ insert deterministic membership
→ verify persisted linkage/digest
→ COMMIT
→ save database
→ return immutable context

## Failure boundary

Any validation or SQL failure rolls back.

Filesystem save failure after COMMIT restores the pre-transaction snapshot and propagates the failure. No cursor advancement occurs.

## Reader

readProcessingResult(resultId) loads the result and membership, verifies:
- exact range;
- generation format;
- status/canonicality;
- evidence linkage;
- raw linkage;
- ordering;
- duplicate-key absence;
- evidence_set_digest.

Only VERIFIED context is returned.

## Schema migration

v4→v5 creates only processing_results and processing_result_evidence inside one transaction, then updates schema_meta. Fresh databases create the complete v5 schema. Existing v4 F-03 definitions are not rewritten.
