# HAHAWEEK — DEPLOYMENT ARCHITECTURE V1

Status: VERIFIED / RECONCILED — exact current-main CI 37604140439
Contract ID: DEPLOYMENT_ARCHITECTURE_V1
Network: Robinhood Mainnet
Chain ID: 4663

## Purpose
Define the executable deployment boundary for HAHAWEEK without activating production V4 authority.

## Deployment domains

### Local development
- Node.js CommonJS application.
- npm test is the canonical local test command.
- npm run verify:v4 verifies V4 golden vectors.
- npm run verify:v4:coverage verifies golden-vector fixture coverage.
- SQLite/SQL.js state is file-backed where a database path is supplied.
- Local execution MUST NOT imply production authority activation.

### CI
GitHub Actions is the repository CI execution environment.
Required controls currently include HAHAWEEK Tests, HAHAWEEK Security and Regression, bounded A9 runtime verification, HFI-MVP runtime verification, and HFI-RADAR operational runtime verification.
CI workflows use read-only repository permissions. Runtime workflows preserve runtime artifacts when verification commands fail so failure remains observable rather than converted to absence.

### Free-first infrastructure
The current repository uses GitHub Actions and public/read-only RPC endpoints for verified runtime paths. Free-first is an infrastructure preference, not an authority rule.
No provider becomes authoritative merely because it is free.

### Persistent storage
HAHAWEEK durable application state is SQLite/SQL.js-backed.
Schema migrations are versioned and additive. Current branch schema is v9.
V4 authority remains ordered as SEGMENTS → MANIFEST → CHECKPOINT → CURSOR.
Derived lifecycle state is separate from V4 authority.

### RPC
Robinhood Mainnet uses chain ID 4663.
Runtime RPC endpoints are supplied through explicit environment configuration in CI/runtime workflows. The repository must not embed private credentials in source.
RPC failure, timeout, rate limit, malformed response, or unavailable provider is classified as an external acquisition/runtime failure unless application evidence establishes an HAHAWEEK defect.

### Secrets and credentials
.env.example is tracked; environment-specific secret material is not.
CI security checks reject tracked private-key and common credential patterns and reject tracked .env files other than .env.example.
No private key, wallet signing, transaction submission, or custody is part of the deployment architecture.

### Runtime evidence and observability
Runtime verification produces explicit artifacts containing commit/provenance and verification state where the corresponding workflow requires them.
Runtime evidence remains distinguishable from canonical evidence and MUST NOT mutate V4 authority.
Operational telemetry should preserve execution state, exact commit, source/RPC context, chain ID, verification class, failure state, recovery state, and artifact identity.

### Recovery and replay
Recovery remains bounded and fail-closed.
A runtime failure must preserve failure evidence and MUST NOT silently advance the V4 cursor.
Replay must use the same authoritative evidence, contract versions, rule versions, and configuration to reproduce deterministic derived identities.

### Migration
Database migrations are explicit, versioned, additive, and tested.
The current schema migration to v9 adds the durable analytical reorg lifecycle without rewriting canonical evidence.
Production migration MUST remain behind the applicable authority/activation gate.

### Authority activation
Deployment does not activate V4 authority.
The authoritative distinction is: IMPLEMENTED → VERIFIED → AUTHORIZED → ACTIVE.
Production V4 remains INACTIVE until the explicit activation state machine and production gate are satisfied.

### Production deployment
A production deployment is not equivalent to production authority activation.
Current repository state has verified CI/runtime infrastructure, but production V4 authority is not active and full production end-to-end activation is not authorized.
No deployment mechanism may bypass writer fence, authority gate, checkpoint/cursor integrity, recovery requirements, negative security vectors, or explicit activation state.

## Security and failure boundaries
The deployment layer MUST fail closed on missing required runtime configuration, invalid authority state, failed verification, failed security/regression checks, corrupted or unverifiable runtime artifact, and unsafe migration state.
External dependency failure MUST remain distinguishable from application failure.

## Acceptance
This contract is satisfied only when CONTRACT → IMPLEMENTATION → TEST → NEGATIVE TEST → RUNTIME VERIFICATION → RECONCILIATION agree.
This contract does not authorize production V4 activation, external publication, trading, signing, or autonomous action.


## Reconciliation Overlay — 2026-10-07

### Persistent worker baseline

The repository now contains a concrete persistent-worker deployment baseline:
- root Dockerfile with non-root runtime user, read-only root filesystem, writable durable data volume, and healthcheck;
- deploy/docker-compose.yml with one worker instance, durable volume, resource configuration, dropped Linux capabilities, and no-new-privileges;
- deploy/systemd/hahaweek.service with persistent WorkingDirectory, explicit writable data path, restart policy, and hardened systemd filesystem protections.

These artifacts are deployment IMPLEMENTATION, not proof of a live production deployment.

### Runtime/resource reconciliation

The current hardening head has executable bounds for MAX_RUNTIME_MS and MAX_RPC_CALLS_PER_RUN in the ingestion path, bounded RPC retry/backoff, and adaptive eth_getLogs splitting for retryable transport/rate-limit/range pressure. HFI-RADAR derived state is bounded by event count and serialized byte size. Limits fail closed and do not delete raw/canonical evidence.

HFI-MVP runtime verification for hardening head 34d867ffd4602ebc0909b0f712f5c372890dd572 reached VERIFIED. Its preserved artifact records acquisition COMPLETE, formation VALID, validation CONFIRMED, replay equivalent=true, 8,664 raw evidence items, 8,664 canonical evidence items, and manifest 653bef88df94ee30998d491788d99465b64ac0962abc8c8d9eb56082aeb61239. Artifact digest: sha256:386a67d03ac0b86f39fabaef1e8ab813360e7727a1206f22dfbe6b7587ac261e.

HFI-RADAR operational runtime also reached VERIFIED with provenance and replay checks passing. Its artifact digest is sha256:b4b875ff7366a2f08b8bd0eeef5d3fba151c57dd8d84755303cc3693054818ad.

### RPC limitation

The hardening does NOT implement automatic multi-provider failover. This is intentional: silent mid-batch provider switching would risk mixed-source provenance. Production requires a pinned source per processing context and explicit reconciliation when a different source is used. A production-grade primary archive-capable provider plus independent secondary source remains an operational prerequisite.

### Live deployment status

A real production host, persistent-volume restart drill, backup/restore drill, writer-fence contention drill, RPC degradation drill, and live recovery/replay drill have NOT been executed in this repository session. Therefore the deployment contract remains IMPLEMENTED / VERIFICATION PENDING, V4 authority remains INACTIVE, and production readiness remains NOT READY.


Current-head verification evidence (2026-10-07): commit 0659876e682657afacbc080a78bc8ce3a1f44f0a ran HAHAWEEK Tests successfully. The test workflow executes npm test, verify:v4, verify:v4:coverage, and verify:source-independence. The exact-head Security and Regression workflow also completed successfully.