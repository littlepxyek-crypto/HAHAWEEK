# HAHAWEEK Canonical Migration Boundary v0.1

Status: REFERENCE / DESIGN BOUNDARY

This document defines how the existing HAHAWEEK implementation maps onto the
canonical MVP pipeline without deleting historical work or creating a second
competing architecture.

## 1. Canonical MVP pipeline

BLOCKCHAIN
→ ACQUISITION
→ RAW EVIDENCE
→ CANONICAL EVIDENCE
→ EVIDENCE IDENTITY
→ EVIDENCE REPOSITORY
→ EVIDENCE GRAPH
→ FORMATION
→ VALIDATION
→ REPORT

The canonical semantic formation remains:

POOL_CREATED
→ LIQUIDITY_ADDED
→ FIRST_SWAP
→ POOL_BOOTSTRAP

The implementation may use protocol-specific events internally, but those
events must be translated at an explicit adapter boundary.

## 2. Existing implementation classification

### Canonical foundation

These existing modules are retained as implementation foundations:

- `src/core/rpc.js` — RPC provider construction and chain verification.
- `src/core/rpc-call.js` — retry wrapper for RPC operations.
- `src/core/ingestion.js` — block acquisition loop and checkpoint ordering.
- `src/core/state.js` — persisted runtime state.
- `src/core/raw-event-store.js` — database raw-event persistence.
- `src/core/raw-store.js` — append-oriented raw event persistence.

They are infrastructure. They do not define the canonical formation meaning.

### Protocol/domain adapter candidates

The current V4-oriented implementation is retained as protocol-specific
knowledge and adapter material:

- `src/core/pool-discovery.js`
- `src/core/initialize-decoder.js`
- `src/core/pool-identity.js`
- `src/core/liquidity-event.js`
- `src/core/swap-event.js`
- `src/core/pool-formation.js`
- `src/core/formation-event.js`
- `src/core/formation-timeline.js`

Current semantics observed in these modules are based on:

Initialize
→ ModifyLiquidity
→ Swap

and include `POOL_INITIALIZED`.

These modules MUST NOT silently redefine the canonical MVP semantics.
Their protocol-specific interpretation belongs behind an explicit adapter
boundary.

### Existing cryptographic/reference foundation

The following V4 reference modules are retained as reference foundations:

- `src/reference/v4/event-identity.js`
- `src/reference/v4/hash.js`
- `src/reference/v4/jcs.js`

The event identity reference already requires:

- chain_id
- block_hash
- block_number
- transaction_hash
- transaction_index
- log_index
- contract_address
- topic0

Any canonical runtime identity implementation must preserve this evidence
identity requirement rather than introducing a weaker parallel identity model.

## 3. Canonical layers still requiring runtime implementation

The following canonical layers are not considered implemented merely because
related legacy/reference code exists:

1. CANONICAL EVIDENCE
2. EVIDENCE IDENTITY runtime integration
3. EVIDENCE REPOSITORY as the authoritative repository boundary
4. EVIDENCE GRAPH
5. FORMATION RESULT
6. HISTORICAL OUTCOME
7. VALIDATION runtime boundary
8. EVIDENCE-BACKED REPORT

Each layer must be implemented and verified independently.

## 4. Raw evidence schema gap

The current `raw_events` SQLite table does not yet contain all fields required
by the canonical raw evidence contract. In particular, the current schema
does not contain:

- block_hash
- transaction_index

Therefore the existing table MUST NOT be declared canonical-complete.

Migration must preserve existing rows and history. No destructive reset,
silent overwrite, or cursor reset is permitted.

## 5. Adapter boundary

The target boundary is:

BLOCKCHAIN
→ ACQUISITION
→ RAW RESPONSE
→ CANONICAL EVIDENCE
→ PROTOCOL ADAPTER
→ SEMANTIC FORMATION EVENTS
→ FORMATION ENGINE

The adapter may:

- decode protocol-specific topics and data;
- interpret verified protocol event declarations;
- map protocol events to canonical semantic events;
- attach protocol-specific interpretation metadata.

The adapter may NOT:

- mutate raw evidence;
- change evidence identity;
- change provenance;
- advance the acquisition cursor;
- perform historical validation;
- make predictions;
- silently discard unknown or invalid evidence.

## 6. Preservation rule

Existing implementation is not deleted solely because it does not yet match
the canonical boundary.

Instead:

- reusable infrastructure becomes foundation;
- protocol-specific logic becomes adapter material;
- reference implementations remain reference material;
- canonical runtime layers are added explicitly;
- incompatible semantics are migrated through tests and explicit boundaries.

This prevents two competing HAHAWEEK architectures from emerging.

## 7. Verification gate

No layer is considered COMPLETE or FROZEN until all of the following are
true:

- implementation exists in the repository;
- tests cover the canonical contract;
- tests execute successfully;
- the implementation is traceable to authoritative evidence;
- no prohibited silent normalization or deletion is present;
- the resulting commit is verified on the target branch.

Status vocabulary remains:

DESIGNED ≠ EXECUTED ≠ VERIFIED ≠ FROZEN

## 8. Step 418 decision

STEP 418 establishes the migration boundary only.

It does NOT yet:

- migrate the V4 implementation;
- modify raw evidence schema;
- implement the Evidence Graph;
- implement Formation Result;
- implement Validation;
- implement Report;
- declare the MVP complete.

The next implementation step must begin from this boundary and modify one
canonical layer at a time.
