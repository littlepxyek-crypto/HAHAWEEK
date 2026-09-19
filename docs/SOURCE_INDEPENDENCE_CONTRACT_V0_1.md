# HAHAWEEK — SOURCE INDEPENDENCE CONTRACT v0.1

Status: Draft
Scope: Define when evidence sources are independent enough to support corroboration, especially L4 identity resolution.
Dependencies: Evidence Graph v0.1, Temporal & Validation v0.1, Identity Resolution v0.1, Identity Resolution L4/L5 Contract v0.1, Threat Model v0.1, Cross-Spec Reconciliation Audit v0.1.

## 1. PURPOSE

Source count is not source independence.

This contract defines source lineage, independence classes, correlation rules, and publication boundaries so that duplicated or causally dependent evidence cannot masquerade as independent corroboration.

The contract is analytical metadata. It never changes V4 evidence authority.

## 2. CORE RULE

Two evidence items count as independent only when they have materially independent provenance for the specific claim being tested.

Different URLs, APIs, mirrors, aggregators, RPC endpoints, or accounts do not automatically mean different sources.

## 3. SOURCE LINEAGE

Every source-backed evidence item must identify a lineage record containing:

- source_id
- source_type
- parent_source_id, if derived
- acquisition_id
- publisher/operator where known
- first_seen
- content/evidence digest
- derivation_method
- temporal scope

A source with parent_source_id inherits the parent's lineage unless a documented independent transformation creates a genuinely new observation.

## 4. INDEPENDENCE CLASSES

I0 — UNKNOWN
- lineage cannot be established.
- cannot support L4.

I1 — DERIVED/SAME-LINEAGE
- repost, mirror, quote, scraper, aggregator, cached copy, translated copy, or derivative dataset from the same origin.
- counts as one lineage.

I2 — CORRELATED
- apparently separate sources but materially dependent on the same upstream dataset, provider, publisher, API, oracle, or event feed.
- does not count as independent corroboration.

I3 — INDEPENDENT
- independently acquired observation with distinct provenance and no known material dependency for the claim.
- may contribute one independent evidence line.

I4 — DIRECTLY INDEPENDENT
- independent source plus direct observation of the claimed relation, with provenance sufficient to reproduce the observation.
- strongest source class for corroboration.

I3/I4 are source independence classes, not identity resolution levels.

## 5. SAME-LINEAGE RULES

The following normally count as one lineage:

- original post and repost;
- article and syndicated copy;
- search result and the page it indexes;
- aggregator and its upstream API;
- multiple URLs serving the same dataset;
- translated or paraphrased copies of the same source;
- screenshots of the same original source;
- multiple dashboards reading the same provider feed;
- cached versions of the same response.

Counting these separately is prohibited.

## 6. RPC / ON-CHAIN SOURCES

Multiple RPC providers do not automatically create independent blockchain evidence.

For the same chain event:

- providers returning the same underlying canonical block/event are multiple acquisition paths to one underlying evidence fact;
- provider disagreement is valuable as a consistency test;
- provider count must not be used as source_diversity for the underlying event unless the providers contribute materially independent observations beyond the same canonical chain state.

A provider-specific acquisition record remains useful for reliability and provenance even when it is not an independent evidence line.

## 7. SOCIAL SOURCES

For social evidence:

- original author post = one lineage;
- reposts/quotes that reproduce the same claim = same lineage unless they add a new independently observed fact;
- independent accounts repeating a claim are not automatically independent if they clearly copy the same source;
- an account's own direct observation can be independent from a report that merely cites it;
- deleted/edited content must retain its original evidence snapshot and lineage where available.

Follower relationships do not establish lineage.

## 8. API / AGGREGATOR SOURCES

A downstream API, dashboard, analytics platform, or data vendor is not independent from the upstream dataset it republishes.

A source may become an independent observation only when it performs a materially distinct acquisition/measurement process and that process is documented.

Undocumented claims of independence are I0, not I3.

## 9. CROSS-DOMAIN CORROBORATION

Different source types can provide independent evidence for a relation:

Example:

SOCIAL_DECLARED
+
DIRECT_ONCHAIN_CONTROL

can be independent if their provenance is genuinely separate.

But:

SOCIAL_POST
+
an analytics dashboard that copied the same post

is not independent.

Independence is claim-specific and provenance-specific.

## 10. L4 CORROBORATION GATE

Under the Identity L4/L5 Contract, L4 requires at least two materially independent evidence lines.

Minimum gate:

1. each evidence line has a source lineage;
2. lineage is known;
3. lineages are not I1 or I2;
4. evidence supports the same narrowly defined relation;
5. temporal scopes are compatible;
6. no direct unresolved contradiction defeats the relation;
7. falsifier is recorded.

If any condition fails, the relation cannot be promoted to L4.

## 11. SOURCE DIVERSITY

source_diversity must not mean raw URL count.

Recommended representation:

{
  "independent_lineage_count": 0,
  "source_classes": [],
  "lineage_refs": [],
  "correlation_flags": []
}

The count is derived only from verified lineage classification.

No overall confidence score is produced from source diversity.

## 12. CONFLICTING SOURCES

Independent sources may disagree.

Disagreement does not cause one source to be discarded.

Instead:

- preserve both evidence lines;
- create contradiction references;
- retain lineage;
- prevent automatic L4 promotion where the contradiction directly affects the claimed relation;
- resolve through a new analytical evaluation.

No latest-source-wins rule is allowed.

## 13. TEMPORAL INDEPENDENCE

Two observations made at different times are not necessarily independent.

Temporal separation alone is insufficient.

Conversely, simultaneous observations may be independent if provenance is independent.

Independence is based on provenance and causal dependence, not timestamp difference.

## 14. ACQUISITION VS EVIDENCE INDEPENDENCE

Acquisition identity answers:
"How did HAHAWEEK obtain this artifact?"

Source independence answers:
"Does this artifact provide an independent observation for this claim?"

They are related but not interchangeable.

Multiple acquisitions of the same underlying artifact remain useful for reliability but do not create multiple independent evidence lines.

## 15. UNKNOWN LINEAGE

If lineage cannot be established:

- classify I0;
- do not count toward L4;
- preserve the evidence;
- record missing provenance;
- allow later reclassification through immutable analytical transition.

Unknown is not independent.

## 16. FALSIFIER

Every independence classification must have a way it could be disproven.

Examples:

- discovery that two publishers share the same upstream source;
- identical content digest/provenance chain;
- API documentation showing common upstream dataset;
- direct attribution to the same original post;
- provider architecture showing common data source.

If independence is disproven, create a new classification/transition. Do not rewrite history.

## 17. PUBLICATION BOUNDARY

Before Source Independence is established:

- raw source count must not be presented as corroboration;
- L4 must not be publication-grade;
- reports must expose lineage uncertainty.

After classification:

- L3 remains a pattern;
- L4 may be described as corroborated only with lineage basis;
- L5 remains governed by relation-specific direct verification.

No source-independence result authorizes personal identification or disclosure.

## 18. REQUIRED RECORD

Minimum lineage record:

{
  "source_lineage_id": "...",
  "source_id": "...",
  "source_type": "...",
  "parent_source_id": null,
  "acquisition_id": "...",
  "publisher": "...",
  "first_seen": "...",
  "digest": "...",
  "derivation_method": "...",
  "independence_class": "I0|I1|I2|I3|I4",
  "correlation_flags": [],
  "falsifier": []
}

Exact identity hashing for lineage records remains a separate contract.

## 19. REQUIRED NEGATIVE VECTORS

At minimum:

1. repost counted as independent → reject;
2. syndicated article counted as independent → reject;
3. aggregator + upstream API counted twice → reject;
4. two dashboards using the same feed counted twice → reject;
5. multiple RPC providers treated as independent facts about one canonical event → reject;
6. unknown lineage counted as independent → reject;
7. source count used without lineage verification → reject;
8. different URLs with identical source lineage counted separately → reject;
9. temporal separation alone used as independence → reject;
10. copied social claims counted as independent → reject;
11. contradictory independent sources silently discarded → reject;
12. I1/I2 evidence used to satisfy L4 → reject;
13. unverified independence claim classified I3 → reject;
14. acquisition count substituted for source independence → reject.

## 20. OPEN DEPENDENCIES

Still required:
- executable source-lineage vectors;
- source-specific adapters;
- social snapshot/provenance contract;
- exact lineage identity contract;
- cross-spec L4 validation vectors.

## 21. DESIGN GATE

Status: OPEN.

This document does not authorize production source clustering, scraping, identity attribution, or publication changes.

## 22. CORE RULE

> Two sources are not two independent witnesses merely because they have two URLs.

HAHAWEEK must count provenance, not copies.
