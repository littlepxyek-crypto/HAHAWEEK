# STEP 566 — Durable Processing-Result / Generation Persistence Analysis v0.1

Repository state inspected at main commit c98d396802146bdaaa9c3eba40f7aa8ba28d5d33.

Findings:
- Current schema version is 4.
- canonical_evidence is durable and linked to raw_events.
- F-03 segments/manifests/checkpoints are durable.
- ingestion_state stores runtime cursor state.
- No processing-result table or durable processing-result/evidence membership relation exists.
- No generation lineage record exists outside F-03 authority persistence.
- ingestion processorRange currently returns no first-class processing-result context.

Conclusion: the STEP 565 gap is real. Existing structures cannot safely be repurposed because cursor and expected authority have different semantics.

The smallest explicit persistence boundary is an immutable accepted processing-result record plus an immutable evidence-membership relation. This represents exact range, generation lineage, canonicality, replay, recovery, and reorg replacement without mutating historical evidence.

No production code or schema change is made in STEP 566 contract stage.
