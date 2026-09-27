# STEP 614 — Writer-Fence Watchdog Contention Analysis v0.1

## Runtime finding

Fresh operator runtime on main `4273964106d57e8276b3273f1f48959a5330dc49` failed with:

`WRITER_FENCE_BUSY`

The operator read-only probe immediately afterward showed:

- no Node/HAHAWEEK process remained;
- `data/writer-fence-state.json` was `ownerId=NONE`, `fence=56`, `expiresAt=0`;
- `data/writer-fence-state.json.lock` did not exist.

Therefore the evidence does not support a lingering process or orphaned lock as the durable cause.

## Repository-level cause

The current ingestion path starts the worker-thread watchdog and also retains the main-thread timer heartbeat and explicit main-thread `renew()` calls. All renewal paths use the same exclusive `.lock` file.

The watchdog and main thread can therefore contend transiently for the same fence lock. `fs.openSync(lockFile, 'wx')` is intentionally exclusive; an existing lock returns `EEXIST`, which HAHAWEEK maps to `WRITER_FENCE_BUSY`.

Node's worker_threads documentation confirms that workers execute JavaScript in parallel, making this concurrent access possible. The runtime evidence matches this failure mode: ingestion fetched and inserted 51 blocks, then the scan failed with `WRITER_FENCE_BUSY`, while the lock was gone after shutdown.

## Contract assessment

This is a defect in the implementation of the existing STEP 614 writer-fence liveness mechanism. It does not require a Contract Amendment.

No change is proposed to:

- writer ownership or fence identity;
- expiry semantics;
- cursor authority;
- CBDR identity;
- evidence preservation;
- authority lifecycle;
- V4 production authority;
- Surveillance authority;
- trading/signing/execution.

## Required invariant

When the worker-thread watchdog is active, it is the sole periodic renewal mechanism. The main-thread timer heartbeat and batch-boundary `renew()` calls must not compete with it.

The main thread continues to call `assertOwned()` at safety boundaries. If the watchdog cannot maintain ownership, the existing fail-closed behavior remains authoritative.
