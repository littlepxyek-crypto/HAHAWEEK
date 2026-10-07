# HAHAWEEK — INVESTIGATION EXECUTION STATE MACHINE V1

Status: IMPLEMENTED / VERIFICATION REQUIRED

State model:
REQUESTED -> OBSERVED -> PROVENANCE_RECORDED -> CORROBORATED -> ANALYTICALLY_RELEVANT -> VALIDATED

Alternative terminal states:
PARTIAL / UNKNOWN / FAILED / EXPIRED / CONTRADICTED

Provider execution may only produce REQUESTED-origin terminal/observed states. CORROBORATED, ANALYTICALLY_RELEVANT, and VALIDATED require explicit analytical transitions.

A provider failure never maps to FALSE, FAIL, NEGATIVE, or REJECTED.

Provider labels and confidence values remain Reference Observations until an applicable HAHAWEEK analytical contract validates them.

Investigation is bounded by timeout, retry, concurrency, request budget, and response-size limits.

The controlled fixture provider verifies only the abstraction; no external provider is a V4 dependency.


The provenance-recording transition is explicit; provider output cannot enter analytical promotion before provenance is recorded.
