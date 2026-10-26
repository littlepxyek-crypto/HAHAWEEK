# STEP 614 — Partial Durable Processing Context Recovery Design v0.1

## Contract
Existing STEP 614 Contract; no semantic amendment.

## Recovery sequence
1. Look for an exact canonical lineage.
2. If absent, query exact ACCEPTED/CANONICAL processing results.
3. Require exactly one candidate; multiple candidates fail closed.
4. Reconstruct the processing result and require a valid `canonical_decision_snapshot_id` in provenance.
5. Reconstruct and integrity-check the snapshot.
6. Verify provider network and every stored block hash/parent hash.
7. Verify transition, parent result, generation, range, and evidence-set digest through the existing processing-result reader.
8. Derive the deterministic lineage ID from the existing result.
9. Insert only the missing lineage row inside an atomic snapshot/restore boundary.
10. Reconstruct the lineage and return the existing VERIFIED context.

Successful recovery must not call canonical CBDR reconstruction or raw ingestion. Existing lineage behavior remains unchanged. Provider identity mismatch returns to the normal non-reuse path so existing reorg semantics remain authoritative.

## Tests
Cover successful missing-lineage recovery, duplicate exact results, invalid snapshot provenance, snapshot corruption, provider identity change, existing lineage, and preservation of CBDR/result identities.

## Operator acceptance
Repository tests are necessary but not sufficient. A fresh Termux runtime must later prove recovery and restart continuity before LIVE can be declared.
