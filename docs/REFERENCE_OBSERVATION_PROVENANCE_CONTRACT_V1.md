# HAHAWEEK — REFERENCE OBSERVATION PROVENANCE CONTRACT v1

Status: IMPLEMENTED / VERIFIED
Contract ID: REFERENCE_OBSERVATION_PROVENANCE_CONTRACT_V1

Each Reference Observation preserves:
schema_version, observation_id, provider_id, provider_type, provider_version, request_id, acquisition_id, subject, observation_time, retrieval_time, as_of_time, source_reference, payload_digest, payload, provenance, limitations, completeness_status, error_status, derivation_status, independence_class, lineage, and status.

Rules:
1. Provider payload remains non-authoritative.
2. Provider labels/confidence are descriptive unless an explicit versioned HAHAWEEK contract maps them.
3. Unknown lineage means I0 UNKNOWN.
4. Derived provider output is not direct evidence.
5. Historical observations are preserved even when provider current state changes.
6. Contradictions create new analytical state; prior observations are not overwritten.
7. Reference Observations never mutate V4 authority.

Observation identity is deterministic when the caller does not provide an observation_id. Payload digest is retained separately.

Temporal semantics keep provider observation time, retrieval time, requested as-of time, and HAHAWEEK processing time distinct. A current-only response is temporally invalid/incomplete for a historical request.

Acceptance evidence: implementation, positive/negative tests, CI execution, and reconciliation are verified on the current PR head.
