# HAHAWEEK Project State

> Durable engineering checkpoint for HAHAWEEK.
> This file is the continuity source for the project across ChatGPT sessions.
> Update it at every material engineering milestone and commit/push it with the related code.

## Identity

- Project: HAHAWEEK
- Mission: Early Formation Intelligence
- Primary chain: Robinhood Chain Mainnet
- Chain ID: 4663
- Repository: https://github.com/littlepxyek-crypto/HAHAWEEK
- Foundation mode: read-only
- Trading: disabled in foundation
- Architecture principle: evidence-first, temporal, auditable

## Operating Doctrine

OBSERVE → CONNECT → RECORD → UNDERSTAND → VALIDATE → LEARN

Core rules:

- New token != opportunity.
- Every signal requires evidence.
- No predictive score before historical validation.
- Raw data must remain recoverable.
- No lost work.
- No overwrite.
- No skipped layer.
- Free-first.
- Automation-first.
- Discord is an output/interface adapter, not the intelligence engine.

## Durable Work Rule

For every material engineering change:

1. Implement.
2. Test.
3. Update PROJECT_STATE.md when state or decisions change.
4. Run `git diff --check`.
5. Commit.
6. Push to GitHub.
7. Verify local HEAD == origin/main.

A milestone is not considered complete until it is pushed and synchronized.

## Current Git Checkpoint

- Last verified main milestone: `e39fad24168a6d025b385365adb3e6d5c0a661ae`
- Milestone: PR #33 — Proof-of-Observation Trust Model reconciled with current main and merged.
- PR #31 — durable project-state reconciliation — remains in history.
- README v2: merged to `main` via PR #30.
- PR #33 CI: passed.
- This checkpoint records the latest verified milestone; subsequent documentation commits may advance `main` without invalidating the recorded milestone.
- Main CI for README v2 commit: passed.
- Working tree state is governed by the GitHub remote checkpoint; no production runtime state is included in this documentation update.

### Continuity Reconciliation — 2026-09-20

- PR #30 (README v2): MERGED.
- PR #33 (Proof-of-Observation Trust Model v0.1 reconciled): MERGED to current `main` at `e39fad24168a6d025b385365adb3e6d5c0a661ae` after CI and final whole-document audit.
- PR #29 remains OPEN as the historical/stale-base audit trail; do not merge it.
- PR #28 (V4 Offline Recovery Verifier): OPEN; current head `afabffd4cab8fa1d4924cdf38c3122465117b8fa`; branch requires reconciliation with current `main` before relying on it as a merge candidate.
- Design Gate 2: OPEN.
- Production V4 cutover: NOT AUTHORIZED.
- No raw evidence, SQLite production state, cursor reset, legacy migration, token/contract implementation, or production chain cutover is authorized by this checkpoint.

### Immediate Safe Sequence

1. Reconcile PR #29 with current `main`, then run the final whole-document trust-model audit on its actual head.
2. Reconcile PR #28 with current `main`, then re-run its complete CI/recovery audit.
3. Record each result in the durable project state before advancing.
4. Continue remaining Gate 2 work only after the two open PRs are independently validated.
5. Do not perform production V4 cutover or legacy migration before Gate 2 exit criteria are satisfied.

## Implemented Foundation

- Node.js runtime
- ethers.js 6.17.0
- Configuration layer
- Persistent runtime state
- Raw event JSONL store
- Deterministic event identity
- Block cursor
- Safe-head / confirmation handling
- Sequential ingestion
- Overlap protection
- Processor failure recovery
- RPC retry/backoff
- RPC abstraction
- RPC timeout configuration
- RPC chain ID validation
- Provider batching disabled
- Automated test suite

## Core Runtime Files

- `src/core/config.js`
- `src/core/state.js`
- `src/core/raw-store.js`
- `src/core/block-cursor.js`
- `src/core/confirmation.js`
- `src/core/retry.js`
- `src/core/rpc-call.js`
- `src/core/rpc.js`
- `src/core/ingestion.js`
- `src/health.js`

## Test Coverage

Current tests cover:

- Block cursor initialization
- Cursor persistence
- Cursor regression protection
- Confirmation depth
- Zero confirmations
- Invalid block heads
- State persistence
- Processor failure recovery
- Ingestion overlap protection
- RPC retry
- Retry backoff
- Sequential processing
- Restart recovery
- No-op when caught up
- Dependency validation
- RPC configuration
- RPC timeout
- Provider creation

Latest result:

`35 tests passed, 0 failed` (last recorded foundation test result; current main CI is the authoritative regression gate)

## RPC Configuration

Official Robinhood Chain Mainnet RPC:

`https://rpc.mainnet.chain.robinhood.com`

Expected chain:

`4663`

Current situation:

- Public RPC has been unreliable/unreachable from the Android/Termux network.
- TLS/certificate problems and request timeouts were observed.
- Alchemy Robinhood Chain endpoint was reachable from the network.
- Alchemy requires authentication.
- Provider abstraction exists so another RPC provider can be configured without redesigning ingestion.

Security rules:

- Never disable TLS verification.
- Never use `curl -k`.
- Never use `NODE_TLS_REJECT_UNAUTHORIZED=0`.
- Never commit API keys.
- Never paste API keys or GitHub PATs into chat.

## Data Architecture

HAHAWEEK follows layered data architecture:

1. Raw
2. Normalized
3. Derived
4. Evidence
5. Historical outcomes
6. Intelligence

Raw blockchain evidence must remain recoverable.

Event identity:

`chainId + blockNumber + transactionHash + logIndex`

## Master Intelligence Direction

HAHAWEEK is designed to study EARLY FORMATION rather than merely scan current token metrics.

Important temporal sequence:

Pool creation
→ first liquidity
→ first swaps
→ first buyers
→ wallet clustering
→ liquidity changes
→ volume acceleration
→ holder distribution
→ social/narrative activity
→ later outcome

The system must preserve timestamps and evidence so relationships can be tested historically.

## Planned Intelligence Layers

### Pool Discovery

- Uniswap v4 pool discovery
- Verified ABI/event decoding
- Native ETH/WETH handling
- DEX adapter architecture
- Deterministic deduplication

### Market / Liquidity

Track time-series observations:

- T+5m
- T+15m
- T+30m
- T+1h
- T+6h
- T+24h
- T+7d

### Wallet Intelligence

- First buyers
- Repeated buyers
- Wallet clusters
- Funding relationships
- Early wallet behavior

### Developer Intelligence

- Creator/deployer
- Contract relationships
- Deployment history
- Related addresses
- Historical behavior where evidence exists

### Contract / Risk

- Contract verification
- Ownership
- Permissions
- Upgradeability
- Mint/burn controls
- Transfer restrictions
- Honeypot-related evidence where technically available

### Social / Narrative

- Narrative emergence
- Social mentions
- Temporal relationship between narrative and on-chain formation
- Evidence provenance

### Historical Outcome Engine

Measure what happened AFTER formation.

Do not assume early formation means success.

Historical outcomes must be used before introducing predictive scores.

### Radar

Planned radar categories:

- New Pool
- Early Formation
- Liquidity
- Momentum
- Wallet
- Risk
- Narrative

Every radar alert must include evidence.

## Discord

Initial integration:

- Discord Webhook

Potential channels:

- `#new-pools`
- `#early-events`
- `#liquidity`
- `#wallet`
- `#risk`
- `#narrative`
- `#system`
- `#errors`

Discord remains an interface/output layer.

Intelligence must remain independent from Discord.

## Security Boundary

Foundation must remain:

- Read-only
- No private-key signing
- No auto-buy
- No auto-sell
- No private-key trading
- No secrets committed to GitHub

Trading functionality is outside the foundation until explicitly designed and separately secured.

## Automation-First Requirement

HAHAWEEK should eventually operate with minimal manual intervention.

Target runtime behavior:

- Automatic polling
- Persistent cursor
- Retry on transient RPC failure
- Recovery after processor failure
- No overlapping ingestion
- Deduplication
- Health monitoring
- Discord alerts
- Historical persistence
- Automatic restart/recovery where the host permits it

Android/Termux may stop background processes, so true 24/7 uptime is not guaranteed on the phone alone.

## Repository / Git Rules

GitHub is the durable project source of truth.

Every completed engineering milestone must be:

`CODE → TEST → STATE → COMMIT → PUSH → VERIFY`

Never claim a milestone is complete if:

- Tests are failing.
- Changes are uncommitted.
- Changes are not pushed.
- Local and remote HEAD differ.

## Important Historical Commits

- `639f687` — chore: initialize HAHAWEEK foundation
- `d123ddb` — docs: add HAHAWEEK engineering foundation
- `c177b78` — feat: add runtime foundation and persistence
- `547f9b8` — feat: add RPC call retry wrapper
- `244c733` — feat: integrate RPC retry with ingestion
- `1042cb0` — feat: prevent overlapping ingestion runs
- `3381659` — feat: recover ingestion after processor failure
- `114cb0a` — fix: isolate block cursor state persistence
- `5c85940` — feat: harden RPC provider configuration

## Known Limitations

### RPC

The public Robinhood Chain RPC is currently unreliable from the current Android/Termux network.

Do not bypass TLS security to solve this.

### Runtime

Android may terminate long-running Termux processes.

### Repository continuity

The repository hardening baseline is now active and verified. Main is protected by `HAHAWEEK-main-protection`, with required `test-and-security`, no bypass actors, force-push protection, branch-deletion protection, up-to-date branch enforcement, and conversation-resolution enforcement.

### Raw Data

`data/*.jsonl` is currently ignored by Git.

Raw data retention and backup strategy must be addressed before production deployment.

### State

`data/state.json` is ignored by Git.

Runtime state remains outside GitHub; do not commit production runtime state. Any change to persistence authority must be reviewed against V4.

## Master Specification

The project has a Master Specification covering:

- Early Formation Intelligence
- Evidence / provenance
- Raw / normalized / derived layers
- Pool discovery
- Market / liquidity intelligence
- Wallet intelligence
- Developer intelligence
- Contract risk
- Social / narrative intelligence
- Historical outcomes
- Radar
- Discord
- Security
- Observability
- Testing
- Validation

## Current Phase

**Phase — V4 Design Gate 2 / Integrity & Recovery Validation**

Foundation Phase 1 remains historical context; it is not the current execution phase.

Current focus:
- Proof-of-Observation Trust Model final audit.
- Offline Recovery Verifier reconciliation and validation.
- Remaining V4 executable vectors and adversarial recovery tests.
- Legacy write-freeze and collision-isolation evidence.
- Design Gate 2 exit criteria.

## Immediate Next Engineering Steps

1. Reconcile PR #28 against current `main`, then re-run its complete CI/recovery audit.
2. Compare the recovery verifier against the current V4 trust boundaries and ensure no production activation is implied.
3. Complete remaining Gate 2 executable families and durability/fencing tests.
4. Update the durable project state after each material milestone.
5. Re-audit Gate 2 before any V4 production activation or legacy migration.

Historical foundation work remains preserved above and in Git history.

## Do Not Repeat

- Do not bypass actual chain validation with static network configuration.
- Do not use overlapping async polling intervals.
- Do not manually decode events when a verified ABI/interface decoder is available.
- Do not add private-key trading to the foundation.
- Do not treat scanner labels as proven intelligence.
- Do not create signals without evidence.
- Do not create predictive scores before historical validation.
- Do not skip raw/normalized/derived layers.
- Do not commit secrets.
- Do not overwrite historical evidence.
- Do not declare completion before GitHub synchronization.

## Recovery Procedure

If ChatGPT context is lost or a new chat is started:

```bash
cd ~/HAHAWEEK
git status --short
git log --oneline -10
cat PROJECT_STATE.md
npm test
git rev-parse HEAD
git rev-parse origin/main














































## V4 Design Continuity Checkpoint — STEP 3C-C

- Audited V4 lexical requirements against the current repository at main merge commit `4ee0e132df5a10cb8ada8a85c0d245ef1d2c6f17`.
- Added `docs/V4_LEXICAL_FORMS_AUDIT.md` on branch `v4/lexical-forms-audit-3c-c-2026-09-19`.
- Confirmed the eight-field V4 event identity shape is already normative.
- Confirmed protocol integer semantic type is unsigned 64-bit decimal string.
- Confirmed complete lexical grammar for uint64, hashes, addresses, and topic0 is not yet authoritative.
- Identified legacy event identity as non-equivalent to V4 because legacy identity omits block hash, transaction index, contract address, and topic0.
- No production code, runtime state, SQLite, cursor, evidence, or migration artifacts were changed.
- Design Gate 2 remains OPEN.
- Next required artifact: normative V4 lexical-form specification, followed only afterward by an executable event-identity golden vector.
