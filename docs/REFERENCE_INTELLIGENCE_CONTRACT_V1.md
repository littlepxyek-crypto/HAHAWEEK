# HAHAWEEK — REFERENCE INTELLIGENCE CONTRACT V1

Status: IMPLEMENTED / VERIFICATION REQUIRED

Reference Intelligence is a non-authoritative parallel path:
REFERENCE PROVIDER -> ADAPTER -> GATEWAY -> REFERENCE OBSERVATION -> CORROBORATION / ANALYSIS -> VALIDATION

It is never a prerequisite for canonical ingestion, V4 authority acceptance, cursor advancement, checkpoint, manifest, or canonicality.

Providers implement only a read-only observe(request) adapter contract. Provider-specific fields remain inside provider_payload and are not silently discarded.

The first implementation is a controlled fixture provider. It is an adapter test, not a commitment to any external vendor.

Provider count is not source independence. Unknown lineage is I0_UNKNOWN.

Provider observation time, retrieval time, requested as-of time, and HAHAWEEK processing time are separate concepts. A provider response is not historical proof merely because it accepts an as-of parameter.

Provider timeout, rate limit, schema error, or unavailability becomes explicit Reference Observation failure/uncertainty. It does not become negative evidence and does not corrupt canonical authority.

Acceptance:
CONTRACT -> IMPLEMENTATION -> POSITIVE TEST -> NEGATIVE TEST -> RUNTIME VERIFICATION -> DOCUMENTATION -> RECONCILIATION.
