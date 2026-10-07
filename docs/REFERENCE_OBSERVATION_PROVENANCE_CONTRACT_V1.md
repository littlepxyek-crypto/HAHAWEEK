# HAHAWEEK — REFERENCE OBSERVATION PROVENANCE CONTRACT v1

Status: VERIFIED / RECONCILED

Contract ID: REFERENCE_OBSERVATION_PROVENANCE_CONTRACT_V1

Each Reference Observation preserves:
schema_version, observation_id, provider_id, provider_type, provider_version, request_id, acquisition_id, subject, observation_time, retrieval_time, processing_time, as_of_time, source_reference, payload_digest, payload, provenance, limitations, completeness_status, error_status, derivation_status, independence_class, lineage, and status.

Rules:
1. Provider payload remains non-authoritative.
2. Provider labels/confidence are descriptive unless an explicit versioned HAHAWEEK contract maps them.
3. Unknown lineage means I0 UNKNOWN.
4. I1/I2 lineage classes are not independent corroboration.
5. Derived provider output is not direct evidence.
6. Historical observations are preserved even when provider current state changes.
7. Contradictions create new analytical state; prior observations are not overwritten.
8. Reference Observations never mutate V4 authority.
9. VALIDATED requires explicit validation provenance; the observation cannot self-authorize.

Observation identity is deterministic when the caller does not provide an observation_id. Payload digest is retained separately.

Temporal semantics keep provider observation time, retrieval time, requested as-of time, and HAHAWEEK processing time distinct. A current-only response is temporally invalid/incomplete for a historical request and is represented as UNKNOWN rather than historical truth.

Provider provenance is mandatory at the adapter envelope. Gateway provenance records the boundary without discarding provider provenance.

Acceptance evidence: exact PR #760 head `00b41118744376a498d0d09c748be46cc7834db2` passed HAHAWEEK Tests, Security and Regression, A9 Runtime, Analytical Reorg Runtime, and HFI-MVP Runtime. PR #760 was merged to main as `0c999b6941fad1cd3de7ae8328819b6ca2a1da5e`. The implementation remains non-authoritative and live external-provider integration remains deferred.
