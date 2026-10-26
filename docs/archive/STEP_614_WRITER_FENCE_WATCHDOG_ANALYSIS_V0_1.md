# STEP 614 — Writer Fence Watchdog Runtime Failure Analysis

## Runtime evidence

Fresh operator restart on main `a93bee5c39b73fa08f7675937343ea19bdd8b4e7` loaded durable state:

- cursor: `64988666`
- last verified cursor: `64988666`
- failure: NONE
- recovery: NOT_REQUIRED

The runtime then successfully processed range `64988557–64988666` with:

- processing context: VERIFIED
- authority: AUTHORIZED
- cursor outcome: `64988666`
- duplicates: 0 on displayed ranges
- runner cycle: OK
- health: OK

On the next runtime cycle, range `64988667–64988676` began processing and the runtime failed with:

`WRITER_FENCE_EXPIRED`

The runner then stopped fail-closed.

## Classification

This is a regression/insufficiency of PR #594's timer-plus-boundary renewal design, not an authority or evidence conflict.

The current writer fence has a 30-second default lease. Ingestion uses a main-thread `setInterval` heartbeat plus explicit renewals at batch boundaries.

Node.js documents that timer callbacks are scheduled by the event loop and may be delayed by other work. Therefore a synchronous runtime section longer than the lease can prevent the timer heartbeat from executing before the lease expires.

The observed failure after a sequence of successful batches is consistent with that failure mode.

## Boundary check

The existing writer fence remains the sole writer authority. The remediation must not:

- create fallback authority;
- reset or advance cursor without proof;
- rewrite/delete evidence;
- change V4 authority;
- grant Surveillance authority;
- add trading/signing/execution.

The required improvement is only the mechanism used to keep the already-acquired writer fence alive while the same process performs long-running synchronous work.

## Root cause

Main-thread timer heartbeat is not sufficient as the sole lease-renewal backstop when event-loop execution is blocked.

## Contract conclusion

No Contract Amendment is required. The change preserves the existing writer-fence authority model and only strengthens liveness of the already-authorized lease holder.

## Required validation

The regression test must demonstrate that a writer fence remains owned while the main event loop is intentionally blocked longer than the lease, using an independent worker-thread watchdog.

Unknown/stale/malformed fence state must still fail closed.
