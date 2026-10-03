# HAHAWEEK — Agent Read Boundary V1

Status: Implemented on branch `architecture/agent-read-boundary-v1`

## Purpose

This boundary is the official read path for a future Agent.

The Agent does not receive direct access to HAHAWEEK persistence. It receives a small, explicit read interface:

```
Agent
  ↓
createAgentReadInterface()
  ↓
Evidence Query Contract
  ↓
fixed read-only queries
  ↓
HAHAWEEK evidence
```

## Current implementation

Files:

- `src/query/evidence-query-contract.js`
- `src/query/read-only-query-service.js`
- `src/query/index.js`
- `tests/evidence-query-contract.test.js`

Current implemented operations:

- `get_evidence`
- `get_evidence_lineage`
- `get_block_context`
- `get_transaction_context`
- `get_wallet_activity`
- `get_pool_context`

The remaining EQC operations are deliberately declared but return `QUERY_OPERATION_NOT_IMPLEMENTED` until their authority contracts and repository data sources are ready.

## Security boundary

The Agent interface exposes:

```
execute(operation, input)
```

It does not expose:

- database handle;
- SQL execution;
- `run()`;
- `save()`;
- cursor mutation;
- checkpoint mutation;
- V4 transition mutation;
- evidence insertion;
- evidence deletion.

The query implementation also rejects any internal query that is not a `SELECT`, `PRAGMA`, or `EXPLAIN` statement.

The Agent never receives arbitrary SQL capability.

## Important limitation

The current HAHAWEEK database schema does not yet expose a dedicated canonicality join for every evidence query. Therefore the implementation returns explicit limitations instead of inventing canonicality.

Likewise:

- wallet activity currently exposes observed liquidity-event activity;
- swap-sender activity is not silently inferred;
- graph/formation/hypothesis/validation/research/claim queries are not activated until their authoritative repository contracts are available.

## Authority principle

```
HAHAWEEK owns evidence.
EQC exposes evidence.
Agent reasons over evidence.
Agent cannot rewrite evidence.
```

This implementation therefore creates the **road**, not the Agent itself.
