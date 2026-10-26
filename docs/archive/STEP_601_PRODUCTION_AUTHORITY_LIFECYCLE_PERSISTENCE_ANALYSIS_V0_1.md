# STEP 601 — Production Authority Lifecycle Persistence Analysis v0.1

- Status: ANALYSIS
- Step: 601
- Predecessor: STEP 600 — Production Authority Lifecycle Persistence Contract
- Baseline: `fe217df2f2f4572cc17fe29d1da4f84858534eb0`
- Gate 2: PASS
- V4 production authority: INACTIVE / BLOCKED

## 1. Objective

Determine whether the repository now contains a concrete, repository-owned source and integration seam for the STEP 600 lifecycle record that can be implemented without inventing authority semantics.

## 2. Repository inspection

Inspected:
- `src/index.js`
- `src/core/ingestion.js`
- `src/core/database.js`
- `src/core/f03-production-authority-record.js`
- `src/core/f03-authority-binding.js`
- `src/core/f03-authoritative-chain-persistence.js`
- `src/core/f03-ingestion-authority-integration.js`
- `src/core/runtime-processing-context.js`
- `src/core/single-writer-fence.js`
- existing F-03, database, recovery, and migration tests.

## 3. Concrete persistence seam

The repository has a deterministic implementation seam for a new lifecycle record:

- SQLite schema versioning is explicit and currently at version 7.
- Existing migrations use transactional DDL plus schema-version update.
- Database durability uses export → temporary file → atomic rename.
- Database snapshots already support rollback before durable completion.
- The existing writer fence is explicit and testable.
- `IngestionEngine` advances the cursor only after the authority gate returns.
- Existing F-03 authority validation and binding are reusable without changing their formulas.

Therefore the STEP 600 lifecycle record can be implemented as a separate schema-owned record using the existing database/migration/writer-fence model.

## 4. Critical production-source gap

The repository still does not provide the upstream producer required to create a valid production authority record in the live runtime.

`src/index.js` currently supplies:

- an explicit `authorityFactory` from the caller; otherwise
- a fail-closed `AUTHORITY_SOURCE_REQUIRED` function.

The durable expected-authority reader is built from `readF03AuthorityChain()`, but the inspected runtime path does not establish an F-03 expected-authority chain before the authority gate.

The F-03 persistence module can commit an expected chain when supplied with validated segment/manifest/checkpoint inputs, but no repository-owned live runtime component inspected here supplies those inputs and then establishes the distinct production lifecycle record.

Consequently, implementing only the STEP 600 lifecycle table/factory would create persistence for a record whose authoritative producer is still undefined. That would not satisfy the production-authority source requirement.

## 5. Authority boundary

The existing authority gate remains the correct final boundary:

processing context → authority source → expected authority → validation/binding → cursor advance.

The cursor barrier must remain unchanged.

No implementation may turn:
- expected authority into production authority;
- processing context into authority;
- cursor position into authority;
- writer-fence state into authority;
- Surveillance output into authority.

## 6. Recovery/reorg

The existing processing context already supplies VERIFIED status, exact range, generation, lineage identity, evidence-set digest, transition type, and canonical decision snapshot identity.

This is sufficient provenance input for lifecycle persistence.

However, production-authority establishment still lacks a repository-owned authoritative input event/source that says which validated authority record is being established. Reorg replacement cannot safely be implemented until that source/establishment boundary is explicit.

## 7. Operator Acceptance

Existing operator procedures remain repository-grounded. No new command is invented.

The repository can expose lifecycle state only after a real lifecycle record exists. It still cannot truthfully provide an operator procedure to select/establish the production authority source in live runtime because that source is not defined.

## 8. Surveillance

Surveillance remains derived, evidence-linked, versioned, reproducible, and non-authoritative.

It cannot fill the missing production source boundary.

**ADDRESS != ACTOR.**

## 9. Decision

**BLOCKED FOR PRODUCTION AUTHORITY IMPLEMENTATION.**

STEP 600's persistence boundary is concrete, but the upstream production-authority establishment source remains undefined.

No Code step is authorized from this analysis.

## 10. Required next boundary

A new explicit contract is required for the **Production Authority Establishment Input/Source Boundary**.

That contract must define, without inventing semantics:

- who/what owns production authority establishment;
- the exact authoritative input record/event;
- how the supplied authority record is created from VERIFIED processing context plus the verified expected-authority chain;
- how its lifecycle identity is deterministically derived;
- how bindingDigest is established;
- when establishment is durably committed;
- how the runtime obtains the source;
- how recovery/reorg replacement consumes the source;
- operator-visible source configuration/status;
- fail-closed behavior;
- preservation of all existing authority/cursor/evidence/lineage/writer owners.

Until that contract is merged and its Analysis/Design are concrete, V4 production authority remains INACTIVE/BLOCKED.
