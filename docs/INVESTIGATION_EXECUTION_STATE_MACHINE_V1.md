# HAHAWEEK — INVESTIGATION EXECUTION STATE MACHINE v1

Status: VERIFIED / RECONCILED

Contract ID: INVESTIGATION_EXECUTION_STATE_MACHINE_V1

Execution path:
PRIMARY EVIDENCE → CANDIDATE → CHEAP CORROBORATION → REFERENCE INTELLIGENCE → TARGETED INVESTIGATION → HYPOTHESIS → VALIDATION → CLAIM

Reference Intelligence is demand-driven and is not a prerequisite for canonical ingestion.

Request lifecycle:
REQUESTED → OBSERVED → PROVENANCE_RECORDED → CORROBORATED → ANALYTICALLY_RELEVANT → VALIDATED

Exception/terminal states:
PARTIAL, UNKNOWN, FAILED, EXPIRED, CONTRADICTED.

Each request should carry request_id, acquisition_id, subject, requested as-of time, processing time, provider selection/policy, resource limits, retry budget, temporal scope, and provenance context.

Provider adapters return an explicit result envelope. Gateway processing preserves provider payload, provenance, lineage, temporal metadata, completeness, and derivation status.

Provider selection considers evidentiary value, independence value, accessibility, reliability, reproducibility, resource cost, and architectural fit. Provider count is not source independence. I1/I2 lineage does not satisfy independent corroboration.

Contradictory observations are retained and surfaced to validation. They do not overwrite earlier observations.

If canonical evidence changes through reorg or temporal invalidation, affected derived investigations must be marked and recomputed under the applicable analytical contract. Historical Reference Observations remain preserved.

Investigation execution is not validation. Validation remains a separate analytical authority boundary and requires explicit validation provenance. The controlled fixture provider and bounded gateway tests verify the execution boundary. Exact PR #760 CI also passed the repository/runtime gates; live external-provider integration remains deferred.
