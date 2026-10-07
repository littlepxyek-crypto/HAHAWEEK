# HAHAWEEK — REFERENCE PROVIDER RESOURCE BOUNDARY v1

Status: IMPLEMENTED / VERIFIED
Contract ID: REFERENCE_PROVIDER_RESOURCE_BOUNDARY_V1

Every provider execution has explicit:
- timeout_ms
- retry_limit
- concurrency
- request_budget
- response_bytes
- pagination_limit

The Reference Gateway selects only registered adapters, counts requests against a bounded budget, bounds execution time and response size, exposes only the request/observation interface, and never exposes database handles or V4 authority mutation.

Failure behavior:
- timeout → FAILED provider operation
- budget exhaustion → FAILED provider operation
- oversized response → FAILED provider operation
- unavailable provider → FAILED provider operation
- incomplete pagination → PARTIAL or UNKNOWN

A provider failure must not fail the canonical V4 authority path merely because investigation was requested.

Provider SDKs and vendor assumptions stay behind adapters. Core ingestion must not depend on a vendor SDK or vendor label.

The first provider implementation is a controlled adapter test, not an architectural commitment to a vendor.

Acceptance evidence: executable negative vectors, provider timeout/budget/concurrency/pagination boundary tests, and CI execution are verified on the current PR head.
