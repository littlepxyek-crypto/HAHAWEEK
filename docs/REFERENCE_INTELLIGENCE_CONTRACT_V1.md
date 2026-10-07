# HAHAWEEK — REFERENCE INTELLIGENCE CONTRACT v1

Status: IMPLEMENTED / VERIFICATION PENDING
Contract ID: REFERENCE_INTELLIGENCE_CONTRACT_V1

Reference Intelligence is a non-authoritative investigation boundary.

REFERENCE PROVIDER → REFERENCE ADAPTER → REFERENCE GATEWAY → REFERENCE OBSERVATION → CORROBORATION / ANALYSIS → VALIDATION

Providers receive no database handle, persistence layer, cursor, checkpoint, manifest, authority state, or canonical mutation API. Provider output never becomes canonical merely because it is returned, repeated, scored, or reported by correlated providers.

Required observation context includes provider_id/type/version, request_id, acquisition_id, subject, observation_time, retrieval_time, as_of_time, source_reference, payload_digest, preserved payload, provenance, limitations, completeness/error status, derivation status, independence class, and lineage.

Independence classes:
I0 UNKNOWN
I1 DERIVED / SAME-LINEAGE
I2 CORRELATED
I3 INDEPENDENT
I4 DIRECTLY INDEPENDENT

Provider count is never source independence. Unknown lineage remains I0.

Temporal fields remain separate. A current provider response is not historical truth for an as-of request unless its temporal state is substantiated.

Reference Intelligence is lazy, demand-driven, timeout-bounded, retry-bounded, and resource-bounded. Provider failure must not mutate V4 authority or become negative analytical evidence.

State model:
REQUESTED → OBSERVED → PROVENANCE_RECORDED → CORROBORATED → ANALYTICALLY_RELEVANT → VALIDATED

Exception states: PARTIAL, UNKNOWN, FAILED, EXPIRED, CONTRADICTED.

Acceptance requires implementation, positive tests, negative tests, runtime verification, documentation, and reconciliation. This contract does not authorize production V4 activation or any specific paid provider.
