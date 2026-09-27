# STEP 614 — Writer Fence Watchdog Runtime Design

## Objective

Prevent false writer-fence expiry when the authorized process is alive but the Node.js main event loop is temporarily blocked.

## Design

Add an event-loop-independent watchdog to the existing `single-writer-fence` implementation.

The watchdog:

1. starts only after the existing writer fence has been acquired and ownership asserted;
2. receives the exact existing fence identity: filename, owner ID, fence number, lease duration;
3. renews the same fence state from a Node.js worker thread;
4. verifies owner ID and fence number before each renewal;
5. refuses to resurrect an already-expired or stale fence;
6. stops when ingestion exits;
7. does not acquire a second fence and cannot become an alternative authority.

The existing main-thread heartbeat and batch-boundary renewals remain in place as additional guards.

## Failure behavior

If the watchdog cannot renew because the fence is missing, stale, or expired, it does not manufacture a new fence. The existing main-thread ownership assertions remain authoritative and fail closed.

## Regression

Add an H-03 test:

- acquire a 200ms lease;
- start watchdog at 50ms;
- block the main thread for 600ms;
- assert the original writer fence is still owned;
- stop watchdog;
- release normally.

This verifies the exact failure mode that the previous timer-only mechanism could not protect against.

## Non-goals

No change to:

- cursor semantics;
- evidence semantics;
- checkpoint semantics;
- authority model;
- V4 activation;
- Surveillance authority;
- trading/signing/execution;
- recovery reset behavior.
