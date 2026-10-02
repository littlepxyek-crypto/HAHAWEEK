# HAHAWEEK — A8 Acquisition Boundary Design v0.1

## Architectural rule

HAHAWEEK remains the Evidence Authority. Acquisition systems are replaceable observation backends.

```
Agent / Human
    |
    v
Acquisition Manager
    |
    +--> HTTP/API
    +--> Scrapling adapter
    +--> Agent-Reach adapter
    +--> Patchright adapter
    |
    v
AcquisitionResult
    |
    v
RAW EVIDENCE boundary
    |
    v
Canonical / Identity / Integrity / Graph / Formation / Outcome / Validation
```

## Patterns adopted

### From Agent-Reach

- explicit backend routing;
- per-source health;
- safe configuration boundary;
- capability declaration;
- honest failure reporting;
- no assumption that an installed backend is healthy.

### From Scrapling

- acquisition/extraction is separated from evidence authority;
- throttling and retry belong to acquisition policy;
- pause/resume/checkpoint state must not become canonical evidence;
- adaptive extraction metadata must be preserved as provenance.

### From Patchright

- browser execution is an adapter, not the truth layer;
- browser execution is bounded and explicitly selected;
- anti-detection/bypass behavior is not a HAHAWEEK objective;
- blocked sources remain UNAVAILABLE rather than becoming a challenge to defeat.

## AcquisitionResult

The boundary records:

- acquisition_id;
- source_id;
- source_type;
- backend;
- target;
- started_at/completed_at;
- status;
- content_type;
- content_hash;
- raw_reference;
- backend/runtime/network provenance.

The boundary does not create evidence IDs.

## Health state

`UNKNOWN → PROBING → AVAILABLE`

Failure states:

`DEGRADED`, `FAILED`.

Health is evidence about the acquisition backend, not evidence about the target.

## Adapter hierarchy

Preferred order is policy-driven:

1. HTTP/API;
2. Scrapling/fetcher;
3. dynamic browser;
4. Patchright browser;
5. UNAVAILABLE / human review.

No adapter may silently escalate to another backend.

## Security

- credentials are metadata, never content;
- target URLs must be supplied by the caller;
- no implicit private-network access;
- no arbitrary shell execution;
- no automatic publication;
- no canonical mutation;
- acquisition failure is fail-closed.

## Future separation

A8 foundation does not activate continuous discovery. A future live-discovery contract must separately define acquisition cursors, temporal boundaries, reorg handling, rate limits, retry semantics, and reconciliation.
\n## A8 Security Boundary\n\nsrc/acquisition/target-policy.js defines a pure, deny-by-default target validation boundary. It does not perform DNS, HTTP, browser, proxy, or redirect operations. A future network adapter must supply observed DNS resolution results and revalidate every redirect/final destination before connecting.\n\nThe policy rejects credentials embedded in URLs, disallows localhost/private/special-use addresses by default, and requires explicit protocol and host allowlists. Timeouts, response limits, concurrency, retries, and proxy settings are represented as policy data rather than implicit adapter behavior.\n\n## Strict Health FSM\n\nThe health state machine is explicit and closed. Recovery from FAILED requires PROBING; no direct FAILED -> AVAILABLE transition is permitted. Health snapshots remain immutable.\n\n## Acceptance Evidence\n\nA8 implementation tests include nested provenance mutation, authority escalation, invalid health transitions, malformed target input, URL credential rejection, localhost/private-address rejection, DNS rebinding to prohibited addresses, and default-deny behavior.