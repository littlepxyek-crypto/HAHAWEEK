# STEP 603 — Production Authority Establishment Source Analysis v0.1

- Phase: ANALYSIS
- Baseline: `13a9e02d79b571417c072475c2e2e63baf54a2ce`
- STEP 602: VERIFIED / RECONCILED
- Gate 2: PASS
- V4 production authority: INACTIVE / BLOCKED

## Findings

1. `src/index.js` already has the correct injection seam: `authorityFactory` is distinct from `expectedAuthorityFactory`, and absence fails closed with `AUTHORITY_SOURCE_REQUIRED`.
2. `createAuthorityGate()` validates VERIFIED processing context, exact range, generation/cursor compatibility, expected-authority distinction, production authority, existing binding, and writer-fence ownership.
3. `createVerifiedProcessingContext()` already supplies the authoritative provenance needed by STEP 602: VERIFIED status, exact range, processing result/execution identity, lineage ID, transition, generation, evidence-set digest, canonical decision snapshot identity, and committed timestamp.
4. F-03 expected authority is durably readable from the existing database.
5. Database schema is versioned at 7 and uses explicit transactional migrations plus atomic export/rename durability.
6. Existing writer-fence is the sole writer authority and can be asserted before establishment.
7. No lifecycle table currently exists. This is the remaining implementation gap.
8. Existing `IngestionEngine` calls the authority gate before cursor advance; the source therefore must perform durable lifecycle establishment inside the authority factory boundary. It must fail before returning on any durability/integrity failure.
9. The existing production authority record schema contains only the frozen commitment fields. STEP 603 must not add lifecycle metadata to that record.
10. The existing binding digest formula is frozen and must be reused exactly.

## Required implementation boundary

Implement a separate lifecycle persistence module and schema migration, then replace the default `AUTHORITY_SOURCE_REQUIRED` production factory with a repository-owned establishment adapter that:

- consumes the VERIFIED processing context;
- reads the exact expected-authority chain;
- verifies the expected commitment;
- constructs only the frozen production-authority commitment;
- deterministically derives lifecycle identity from a versioned domain-separated canonical establishment input;
- persists an immutable lifecycle record;
- saves the database before returning;
- returns the frozen production-authority record to the existing gate.

No cursor write occurs inside the source.

## Risk controls

- lifecycle identity conflict => fail closed;
- duplicate identical establishment => deterministic reuse;
- lifecycle state other than DURABLY_ESTABLISHED => rejected by source;
- generation/range/cursor/evidence/provenance mismatch => fail closed;
- writer-fence missing/stale => fail closed;
- schema migration failure => fail closed;
- reorg replacement must create a new lifecycle identity and never overwrite an existing lifecycle record;
- no Surveillance input is permitted.

## Operator Acceptance

The source will expose repository-grounded status through a read-only lifecycle reader. Exact CLI commands remain documentation work after implementation; no command is invented here.

## Decision

Analysis is concrete. Proceed to Design within STEP 603.

No production activation is authorized by this analysis.
