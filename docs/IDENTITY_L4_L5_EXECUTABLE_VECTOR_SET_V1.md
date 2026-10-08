# HAHAWEEK — IDENTITY L4/L5 EXECUTABLE VECTOR SET V1

Status: IMPLEMENTED / VERIFIED PENDING CI RUNTIME
Contract ID: IDENTITY_L4_L5_EXECUTABLE_VECTOR_SET_V1
Implementation: `src/core/identity-l4-l5.js`
Test suite: `tests/identity-l4-l5.test.js`
Parent semantic contract: `docs/IDENTITY_RESOLUTION_L4_L5_CONTRACT_V0_1.md`

## Purpose

Freeze the executable negative/positive boundary for relation-specific identity resolution without promoting heuristic or third-party observations to authoritative identity.

## L4 vectors

L4 MUST reject:
1. fewer than two evidence lines;
2. same-lineage observations presented as independent;
3. unknown independence;
4. correlated evidence;
5. missing falsifier;
6. temporally incompatible evidence;
7. direct contradiction.

L4 MAY accept only when the applicable evidence lines concern the same declared relation, have materially independent assessed lineages, have complete source/acquisition identifiers, are temporally compatible, have no direct contradiction, and include a falsifier.

## L5 vectors

L5 MUST reject:
1. behavioral similarity;
2. same-token purchase similarity;
3. username/profile similarity;
4. cross-chain same-address string matching alone;
5. transitive composition;
6. replayed signature semantics without accepted direct proof;
7. relation mismatch;
8. incomplete provenance;
9. temporal incompatibility.

L5 MAY accept only relation-specific direct cryptographic or direct-control proof with complete provenance and temporal compatibility.

## Authority boundary

These vectors verify an analytical identity-resolution boundary only.

They do NOT establish a human's legal identity, authorize social-account ownership inference, promote vendor labels, mutate canonical evidence, mutate V4 identity/cursor/checkpoint/manifest/authority, authorize publication of personal information, or activate production V4 authority.

## Source independence

L4 independence remains governed by `SOURCE_INDEPENDENCE_EXECUTION_CONTRACT_V1`. Provider/source declarations alone do not establish independence.

## Parent-contract dependencies

The parent identity contract retains explicit open dependencies for Social Identity Verification, relation-specific cryptographic challenge semantics, and broader identity analytical-transition closure. Those dependencies are not silently converted to VERIFIED.

## Completion criterion

CONTRACT → IMPLEMENTATION → TEST → NEGATIVE TEST → CI/RUNTIME VERIFICATION → RECONCILIATION
