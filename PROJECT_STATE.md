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

- Commit: `5f2308c`
- Message: `test: make health check testable`
- Local HEAD: `5f2308cf6f136fa2313e1b8a75c2a298887fbe18`
- origin/main: `5f2308cf6f136fa2313e1b8a75c2a298887fbe18`
- Working tree: clean
- Latest test result: 35/35 passing

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

`32 tests passed, 0 failed`

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

### Raw Data

`data/*.jsonl` is currently ignored by Git.

Raw data retention and backup strategy must be addressed before production deployment.

### State

`data/state.json` is currently not ignored.

Do not change this casually; review persistence requirements first.

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

**Phase 1 — Reliable Ingestion / Foundation Hardening**

Latest completed milestone:
- Health layer made testable without live RPC.
- `runHealth()` supports dependency injection.
- Health success and failure behavior covered by unit tests.
- Live RPC remains a separate integration concern.

## Immediate Next Engineering Steps

1. Validate the RPC provider boundary independently from deterministic unit tests.
2. Keep live RPC integration tests separate from unit tests.
3. Validate ingestion against a reachable RPC provider when credentials/configuration are available.
4. Audit the existing pool-discovery design before implementation.
5. Proceed to Phase 2 pool discovery.
6. Use verified Uniswap v4 ABI/interface decoding.
7. Add persistent event deduplication.
8. Add restart/replay validation.
9. Preserve raw evidence before derived interpretation.

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












































