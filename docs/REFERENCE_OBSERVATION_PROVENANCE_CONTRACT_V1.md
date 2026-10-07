# HAHAWEEK — REFERENCE OBSERVATION PROVENANCE CONTRACT V1

Status: IMPLEMENTED / VERIFICATION REQUIRED

Every Reference Observation preserves provider_id, provider_type, provider_version, request_id, acquisition_id, subject, observation_time, retrieval_time, as_of_time, source_reference, payload_digest, provenance, limitations, completeness status, error status, derivation status, independence classification, and provider payload.

Unknown provider fields remain in provider_payload.

Unknown lineage maps to I0_UNKNOWN and never becomes independent by default.

Reference Observation is not canonical evidence. A provider result cannot promote itself to VALIDATED. Analytical promotion requires an explicit transition outside the provider adapter.

Historical/as-of semantics preserve requested as-of time separately from provider observation and retrieval times.
