# HAHAWEEK — REFERENCE INTELLIGENCE CONTRACT v1

Status: IMPLEMENTED / VERIFICATION PENDING

Verification gate: CI/runtime evidence for the latest correction commit must pass before this status may be promoted to VERIFIED.
Contract ID: REFERENCE_INTELLIGENCE_CONTRACT_V1

Reference Intelligence is a non-authoritative investigation boundary.

REFERENCE PROVIDER → REFERENCE ADAPTER → REFERENCE GATEWAY → REFERENCE OBSERVATION → CORROBORATION / ANALYSIS → VALIDATION

Providers receive no database handle, persistence layer, cursor, checkpoint, manifest, authority state, or canonical mutation API. Provider output never becomes canonical merely because it is returned, repeated, scored, or reported by correlated providers.

The adapter result MUST use an explicit envelope containing payload plus provider provenance. The gateway preserves provider-specific payload and provenance rather than silently normalizing it away.

Required observation context includes provider_id/type/version, request_id, acquisition_id, subject, observation_time, retrieval_time, processing_time, as_of_time, source_reference, payload_digest, preserved payload, provenance, limitations, completeness/error status, derivation status, independence class, and lineage.

Independence classes:
I0 UNKNOWN
I1 DERIVED / SAME-LINEAGE
I2 CORRELATED
I3 INDEPENDENT
I4 DIRECTLY INDEPENDENT

Provider count is never source independence. Unknown lineage remains I0. I1/I2 are not sufficient for corroboration; corroboration requires I3 or I4.

Temporal fields remain separate. A current provider response is not historical truth for an as-of request unless its temporal state is substantiated. An as-of mismatch is explicitly represented as UNKNOWN with an AS_OF_UNVERIFIED limitation.

Reference Intelligence is lazy, demand-driven, timeout-bounded, retry-bounded, and resource-bounded. Provider failure must not mutate V4 authority or become negative analytical evidence.

State model:
REQUESTED → OBSERVED → PROVENANCE_RECORDED → CORROBORATED → ANALYTICALLY_RELEVANT → VALIDATED

Exception states: PARTIAL, UNKNOWN, FAILED, EXPIRED, CONTRADICTED.

VALIDATED is not self-authorized by the provider or observation. Promotion requires explicit validation_ref and validation_rule_version from the separate validation authority boundary.

Acceptance evidence: implementation, positive/negative tests, CI runtime execution of the reference test suite, documentation, and reconciliation are verified on the current PR head. This contract does not authorize production V4 activation or any specific paid provider.
