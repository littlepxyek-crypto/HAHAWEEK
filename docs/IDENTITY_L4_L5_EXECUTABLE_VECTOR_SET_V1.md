# HAHAWEEK — IDENTITY L4/L5 EXECUTABLE VECTOR SET V1

Status: IMPLEMENTED / VERIFICATION PENDING CI

## L4 — CORROBORATED
L4 is relation-specific corroboration requiring at least two evidence lines from at least two materially independent source lineages, complete source/acquisition provenance, temporal compatibility, no direct contradiction, and an explicit falsifier.

## L5 — VERIFIED
L5 is relation-specific direct cryptographic or direct-control proof. The proof must be scoped to the exact relation, temporally compatible, and provenance-complete.

A wallet signature proves control of a signing key for its exact message context. It does not by itself prove a real-world identity relation.

## Negative vectors
The executable tests reject same-lineage L4 evidence, direct contradiction, missing L4 falsifier, wallet-signature-only L5, relation-scope mismatch, and missing L5 temporal/provenance requirements.

## Non-authority
This validator does not mutate V4 evidence, identity, cursor, checkpoint, manifest, canonicality, or production authority.

## Remaining risk
Runtime integration with the broader identity-resolution pipeline and executable source-independence classification remain open.
