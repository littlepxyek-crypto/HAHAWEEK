# HAHAWEEK — Observability Contract v0.1

Status: **PROPOSED — REVIEW REQUIRED**

Scope: read-only runtime observability for HAHAWEEK. This contract does not authorize production activation, V4 authority cutover, changes to evidence history, cursor advancement, checkpoint mutation, migration, deployment, or external publication.

## 1. Purpose

Provide a truthful, auditable view of HAHAWEEK runtime behavior: what is running, what was observed, what was verified, what failed, and what remains unknown.

The dashboard is a projection of authoritative runtime state and recorded events. It is not an authority source and must not become a second writer.

## 2. Non-negotiable invariants

- **Read-only by default:** observability must not mutate ingestion state, evidence, operational state, cursor, checkpoint, manifest, migration state, or writer-fence ownership.
- **No fabricated status:** absent, stale, malformed, or unverified inputs must be displayed as UNKNOWN, STALE, or an explicit unavailable condition—not inferred as healthy.
- **No authority promotion:** a dashboard status, AI opinion, log line, or successful visualization cannot authorize cursor progress or production V4 activation.
- **Preserve history:** recorded evidence and historical events must not be silently rewritten or deleted.
- **Fail closed on integrity ambiguity:** integrity or authority conflicts must remain visible and must not be normalized away.
- **Standalone:** the observability layer remains part of HAHAWEEK and must not introduce ASTRA as a dependency.
- **Free-first and vendor-neutral:** core observability should use local/open tooling and provider-agnostic interfaces wherever practical.
- **No external publication:** dashboard output and AI-generated reports are not published externally unless a separately reviewed workflow explicitly authorizes it.

## 3. Truth and authority boundaries

The implementation must distinguish these separate concepts:

1. **Runtime operational state** — the state recorded by HAHAWEEK's operational-state contract.
2. **Process liveness** — whether the process and its monitoring loop are responding.
3. **Ingestion progress** — the last observed and last processed block/range, with provenance and verification status.
4. **Evidence integrity** — the result of applicable validators and integrity checks.
5. **Architecture readiness** — the separately documented production-readiness gate.
6. **V4 production authority** — whether production authority is active; this must come from its authoritative source, never from UI inference.
7. **Historical CI/runtime evidence** — a result bound to an exact commit/run/artifact, not proof of the present live process.

These states must not be collapsed into one green/red “health” indicator.

## 4. Runtime status vocabulary

Where the existing operational-state source supplies a value, preserve its vocabulary:

- INITIALIZING
- HEALTHY
- DEGRADED
- PARTIAL
- RECOVERING
- BLOCKED
- FAILED
- UNKNOWN

Do not create a competing operational-state machine in the dashboard. UI-only states such as STALE or UNAVAILABLE may describe the observability sample itself, but must not overwrite the underlying runtime state.

Failure class and retryability must be displayed from the canonical failure classification where available. The UI must not independently decide that an error is retryable.

## 5. Minimum read model

The first implementation may expose only fields that can be sourced safely and consistently:

- sample timestamp and source;
- process/liveness result, including the time of last successful sample;
- chain ID and provider identity/status, if available from the existing runtime source;
- operational state and failure classification;
- last processed cursor and last verified cursor, clearly distinguished;
- latest known safe head and observation timestamp, if supplied by the runtime;
- ingestion batch/range outcome and counters, if recorded;
- recovery state and required/active indicators, if supplied;
- evidence validation/integrity outcome and a reference to the underlying record;
- source commit SHA for build/runtime identity where available.

If a field is not available, the read model must omit it or mark it unavailable. Do not synthesize evidence, timestamps, counters, validation outcomes, or production status.

## 6. Event model

The event stream should be append-only for the observability record and include, where available:

- event timestamp;
- component/source;
- event type;
- outcome;
- correlation/execution identifier;
- block or range reference;
- failure code/class and retry disposition;
- evidence or artifact reference;
- source commit/build identifier.

Events must retain provenance. Redaction may remove secrets from display, but must not mutate source evidence or disguise that a field was redacted. Never log secrets, tokens, private keys, seed phrases, or credentials.

A UI projection may be rebuilt from source records. Rebuilding a projection must not rewrite the underlying evidence history.

## 7. Agent Tree and worker isolation

The Agent Tree is a view of explicitly registered tasks and their dependencies—not a claim that every node is an autonomous AI agent.

Each node should identify:

- component/worker name and role;
- task or input scope;
- lifecycle state (QUEUED, RUNNING, SUCCEEDED, FAILED, BLOCKED, UNKNOWN) when a task runner actually supports those transitions;
- start/end timestamps when recorded;
- output/evidence references;
- validation/reviewer outcome where applicable;
- resource limits and retry policy where configured.

Do not display worker counts, model names, token usage, fork counts, or completion percentages unless measured by a real source. An AI worker may inspect or recommend, but cannot independently change authoritative runtime state.

## 8. Read-only transport and security

- Prefer a read-only adapter over existing state and structured events.
- Do not expose unrestricted database handles, write methods, cursor controls, or authority-changing operations to the dashboard.
- Bind any local listener to loopback by default unless a separately reviewed deployment contract specifies authenticated access.
- Do not expose the dashboard publicly without authentication, authorization, transport protection, and a security review.
- Apply bounded output sizes and avoid leaking RPC credentials or environment variables.
- If the read model cannot be obtained safely, report it as unavailable; never fall back to an unsafe write-capable path.

The exact transport, event bus, storage schema, and endpoint names remain implementation decisions and must be reviewed before being frozen.

## 9. Staleness and failure behavior

Every live panel must distinguish the value from the freshness of the sample. If sampling stops, retain the last known value only when visibly marked with its timestamp and stale/unavailable status.

For the initial state-file reader, freshness is computed separately from operational state using `updatedAt` and the sample timestamp. The default stale threshold is 60,000 ms and may be configured with `HAHAWEEK_OBSERVE_STALE_AFTER_MS` between 1,000 and 3,600,000 ms. Age strictly greater than the threshold is `STALE`; age at or below it is `FRESH`. Missing or invalid timestamps, a future `updatedAt`, or invalid threshold configuration yield freshness `UNKNOWN`; they do not change or promote the underlying operational state. This threshold measures state-file update age only and is not proof of process liveness.

On malformed operational state, provider identity mismatch, integrity conflict, or authority ambiguity:

- show the underlying failure classification and source reference;
- do not present the system as healthy;
- do not initiate automatic repair or reset;
- do not advance cursor or checkpoint;
- leave recovery decisions to the existing authorized runtime path.

A dashboard failure must not stop or alter ingestion. Conversely, a dashboard that remains responsive must not imply ingestion is healthy.

## 10. AI advisory boundary

AI-assisted inspection is optional and must be isolated from the deterministic core.

Allowed advisory tasks include summarizing logs, explaining failure classifications, identifying code locations for review, comparing independent evidence, and proposing a patch for human review.

AI must not be the source of truth for operational state, evidence validity, chain canonicality, checkpoint authority, cursor advancement, or production readiness. Every factual claim in an AI-generated explanation should link to the source record or be explicitly marked as an unverified hypothesis.

AI-generated changes require diff review, tests, security checks, and the repository's normal commit/PR process.

## 11. Minimum acceptance tests

Before the dashboard is treated as usable, tests must prove:

1. Reading observability data does not mutate state, cursor, evidence, checkpoint, manifest, or writer-fence state.
2. Missing or malformed state is shown as unknown/unavailable, never healthy.
3. Stale samples are visibly stale and preserve their sample timestamp.
4. Operational states and failure classes are displayed without reinterpretation.
5. Historical CI/runtime results are tied to their exact commit/run and are not labelled as current liveness.
6. Cursor and verified-cursor values remain distinct.
7. Integrity/authority conflicts remain visible and fail closed.
8. Dashboard exceptions do not alter or terminate ingestion.
9. No secret or credential is emitted in logs or UI output.
10. AI advisory output cannot call state-mutating or authority-changing operations.
11. UI projection rebuilds do not modify source evidence or historical records.
12. Tests run without activating production V4 authority or modifying production evidence.

## 12. Implementation sequence

1. Reconcile the canonical source for operational state, runtime identity, progress, recovery, and authority.
2. Implement and test a read-only adapter with no write-capable dependencies.
3. Add terminal Agent Tree and event stream using only verified fields.
4. Add stale-data handling and evidence/source drill-down.
5. Add optional AI advisory workers behind explicit capability boundaries.
6. Review exact diff, run tests and security checks, and record results before merge.

## 13. Explicit non-goals

This contract does not:

- activate V4 production authority;
- close the Architecture Gate;
- claim production readiness;
- implement or alter checkpoint/cursor/recovery semantics;
- change production ingestion or data migration;
- add trading, prediction guarantees, or external publication;
- mandate a particular model provider, UI framework, web server, or paid service.

## 14. Open decisions before implementation

The following must be resolved from current code and verified runtime contracts rather than guessed:

- canonical source and freshness rules for live liveness and progress;
- whether structured runtime events already exist or need a non-invasive adapter;
- supported deployment target and authentication requirements;
- whether the first deliverable is terminal-only or includes a local web UI;
- exact test commands and required CI checks for the new read-only boundary.

**Acceptance principle:** the dashboard is correct only when it accurately represents the limits of what HAHAWEEK can prove—including when the answer is unknown.
