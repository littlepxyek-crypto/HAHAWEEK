# HAHAWEEK — THREAT MODEL SPEC v0.1

Status: Draft
Scope: Adversarial analysis of evidence, graph, temporal, identity, formation, validation, and output layers.
Dependencies: V4 Evidence Integrity, Evidence Graph Spec v0.1, Temporal & Validation State Machine Spec v0.1, Identity Resolution Spec v0.1.

## 1. Purpose
Define how HAHAWEEK can be deceived, corrupted, biased, or caused to produce unsupported interpretation. The goal is not perfect truth; it is explicit attacks, preserved uncertainty, retained contradictions, deterministic recovery, and fail-closed authority boundaries.

## 2. Principles
1. Raw evidence is authoritative only through the applicable V4 authority chain.
2. Graph projections are rebuildable and never evidence authority.
3. Providers, social sources, wallets, contracts, liquidity, deployers, APIs, and derived labels are untrusted inputs until verified.
4. Correlation is not identity. Activity is not organic demand. Mention is not narrative membership. Repetition is not independence.
5. Absence of evidence is not evidence of absence unless acquisition completeness is established.
6. Validation must not leak future information into formation detection.
7. Reorgs create transitions; they do not delete history.
8. Security failure, evidence failure, and model uncertainty remain distinguishable.

## 3. Trust Boundaries
UNTRUSTED: RPC/provider responses, social posts/accounts, token metadata, wallet behavior, liquidity providers, deployers, third-party APIs, heuristic identity links, generated interpretations.
VERIFIED: canonical V4 evidence, validated acquisitions, sealed segments, verified manifests, checkpoints, and cursor projections.
DERIVED: graph, formation, hypothesis, validation, radar, report, publication.
Derived objects must never silently become higher-authority objects.

## 4. Threat Catalogue

### T1 RPC lie / corrupt provider
Incorrect, stale, incomplete, duplicated, fabricated, wrong-chain, or paginated responses.
Controls: chain verification, schema validation, block/parent checks where applicable, completeness contract, deterministic acquisition identity, failure classification, no cursor advance on unverified acquisition.
Fail closed when completeness or chain identity is unverified.

### T2 Reorg / canonicality abuse
A formation appears on a fork and later becomes non-canonical.
Controls: explicit transitions, preserve orphaned evidence, affected-window re-evaluation, no deletion.

### T3 Wash trading
Coordinated actors manufacture swaps, volume, wallet count, or activity.
Controls: funding analysis, circular-flow detection, repeated counterparties, temporal clustering, contradiction evidence. Transaction count is not organic demand.

### T4 Sybil
One actor controls many addresses.
Controls: distinguish address diversity from actor diversity; identity resolution remains uncertain unless verified; funding/behavioral links are hypotheses.

### T5 Funding obfuscation
Funds route through intermediaries, bridges, exchanges, or multiple wallets.
Controls: bounded provenance, path depth, intermediary classification, ambiguity amplification, no ownership claim from funding alone.

### T6 Narrative injection
Coordinated accounts manufacture apparent social attention.
Controls: source diversity and lineage, temporal persistence, snapshots/hashes, context classification. Repeated coordinated mentions are not independent corroboration.

### T7 Social takeover / impersonation
Account compromise, rename, spoofing, or misleading wallet claims.
Controls: acquisition snapshots, account history where available, signatures, freshness/nonce, no profile metadata as identity proof.

### T8 Fake signature / replay
Valid signature reused outside intended context.
Controls: domain-separated message, nonce, validity window, exact signed bytes, signer address, verification record, replay detection.

### T9 Identity spoofing / false correlation
Attacker deliberately mimics another entity's behavior.
Controls: evidence-class separation, falsifier, no automatic transitivity, independent-source requirement.

### T10 Graph poisoning
False nodes or edges enter the graph.
Controls: evidence_ref required, deterministic IDs, provenance, immutable versions, rebuildability, reject orphan references.

### T11 Temporal manipulation
Clock differences, delayed observation, timestamp assumptions, or temporal ambiguity.
Controls: separate event/observation/processing time, record observation lag, formation uses event_time by default, explicit retrospective labeling.

### T12 Validation leakage
Future outcome information influences earlier formation detection.
Critical invariant: at formation time t, no evidence with effective event_time > t may influence formation detection.
Controls: strict cutoffs, validation-window references, dataset separation, full input provenance.

### T13 Data availability failure
Provider outage, deleted social content, API failure, incomplete indexing, local corruption.
Controls: preserve failure records, distinguish UNKNOWN from negative, retry without rewriting history, explicit missing evidence.
“No data” must never silently become “negative evidence.”

### T14 Provider censorship / selective omission
A provider omits selected transactions, addresses, or blocks.
Controls: completeness metadata, alternate-provider comparison when required, expected-range checks, provider identity.

### T15 Adversarial token / contract mechanics
Temporary liquidity, deceptive transfers, mint/admin privileges, blacklist/pause, proxies, upgradeability, fake metadata, controlled trading windows.
Controls: contract/risk evidence, proxy/admin analysis, liquidity history, explicit risk signals. No single indicator is conclusive.

### T16 Validation-target manipulation
Actors optimize activity specifically for known validation windows/metrics.
Controls: multiple outcomes/windows, outcome definitions versioned before evaluation, no adaptive outcome definitions after observing results, historical robustness testing.

### T17 Selection / survivorship bias
Failed formations disappear from the dataset.
Controls: preserve all detections including failed/unknown/dissolved outcomes; maintain valid denominator; document exclusions.

### T18 Confirmation bias
Researchers select supporting evidence and ignore contradictions.
Controls: explicit CONTRADICTS edges, required falsifier, missing_evidence, support/contradiction shown separately, claim provenance includes relevant contradiction.

### T19 Fake source independence
Multiple sources repeat one upstream claim.
Controls: source lineage and syndication/repost detection; URL count is not source independence.
Invariant: N mentions from one source lineage do not equal N independent sources.

### T20 Derivative output poisoning
Radar/report/X content becomes detached from evidence.
Controls: claim/research/evidence provenance, publication traceability, versioned edits that preserve lineage.

## 5. Layer Mapping
Evidence Integrity: T1, T2, T8, T10, T13, T14.
Evidence Graph: T3, T4, T5, T6, T9, T10, T19.
Temporal/Validation: T11, T12, T16, T17.
Identity Resolution: T4, T5, T7, T8, T9.
Formation/Intelligence: T3, T6, T15, T18, T20.

## 6. Critical Invariants
I-01 Every authoritative evidence object has deterministic identity.
I-02 Every graph node/edge traces to evidence.
I-03 Provider output is never trusted solely because it was returned.
I-04 Acquisition failure is not negative evidence.
I-05 Address diversity is not actor diversity.
I-06 Mention is not identity.
I-07 Correlation is not ownership.
I-08 Repetition is not independent corroboration.
I-09 Future evidence cannot influence past formation detection.
I-10 Closed validation windows are immutable.
I-11 Reorg never deletes historical evidence.
I-12 Contradictory evidence remains accessible.
I-13 Failed/dissolved formations remain in the historical denominator.
I-14 Outcome definitions are fixed before evaluation.
I-15 Graph projections can be rebuilt without loss of authoritative evidence.
I-16 Public claims require traceable provenance.
I-17 Ambiguous authority or integrity fails closed.

## 7. Adversarial Test Matrix
Minimum future tests:
1. Wrong-chain RPC → reject.
2. Missing range page → incomplete acquisition; cursor unchanged.
3. Same acquisition + same digest → idempotent.
4. Same acquisition + different digest → integrity conflict.
5. Reorged block → orphan transition; no deletion.
6. Wash-trading cluster → remains uncertain.
7. Shared exchange funding → no common-control claim.
8. Reposts of one source → not independent sources.
9. Deleted social post after acquisition → snapshot remains.
10. Replayed signature → reject.
11. Future validation event supplied to formation detector → reject.
12. Outcome definition changed after results → invalid lineage.
13. Failed formation omitted → denominator violation.
14. Contradiction omitted from report → provenance review failure.
15. Edge without evidence_ref → reject.
16. Claim without validation provenance → reject.
17. Cursor ahead of checkpoint → recovery failure.
18. Checkpoint/manifest mismatch → recovery failure.

## 8. Failure Classification
EVIDENCE_INVALID
EVIDENCE_INCOMPLETE
EVIDENCE_UNAVAILABLE
CANONICALITY_AMBIGUOUS
IDENTITY_UNRESOLVED
IDENTITY_CONTRADICTED
TEMPORAL_INVALID
VALIDATION_INVALID
OUTCOME_UNAVAILABLE
GRAPH_INTEGRITY_FAILURE
PROVENANCE_FAILURE
UNKNOWN

These must not collapse into a generic ERROR.

## 9. Security Posture
HAHAWEEK is evidence-first, fail-closed at authority boundaries, append-only for historical evidence, deterministic where integrity requires it, explicit about uncertainty, adversarial toward its own hypotheses, rebuildable from authoritative evidence, and read-only at the foundation.

HAHAWEEK does not promise perfect truth. It promises traceable reasoning under explicit evidence and uncertainty.

## 10. Design Gate
Gate remains OPEN until A, B, and F are reconciled against this threat model; critical invariants have executable tests; adversarial scenarios have golden/negative vectors where applicable; validation leakage and identity spoofing are tested; recovery remains fail-closed; and this work makes no production ingestion/runtime changes.

Next candidate: C — MVP Scope, after adversarial review.
