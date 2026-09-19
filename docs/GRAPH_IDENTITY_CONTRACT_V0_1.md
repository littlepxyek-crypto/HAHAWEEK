# HAHAWEEK — GRAPH IDENTITY CONTRACT v0.1

Status: Draft
Scope: Deterministic identity for Evidence Graph nodes and edges.
Dependencies: V4 canonicalization/hash model, Evidence Graph Spec v0.1, Cross-Spec Reconciliation Audit v0.1.

## 1. PURPOSE

This contract defines analytical Graph identity without creating a second authority system.

Graph identity is a projection identity:
- it identifies a graph entity or relationship deterministically;
- it is derived from canonical graph identity input;
- it never replaces V4 evidence identity;
- it never becomes source-of-truth for raw evidence;
- graph objects remain rebuildable from authoritative evidence.

## 2. AUTHORITY BOUNDARY

V4 remains authoritative for evidence integrity.

Graph identity is lower in the authority hierarchy:

V4 evidence
→ verified authority artifacts
→ Graph identity
→ Graph projection
→ Formation / Hypothesis / Validation
→ Research / Report / Publication

A graph identity collision, missing graph object, or projection corruption must not alter authoritative evidence.

## 3. DOMAIN-SEPARATED HASHING

The previous informal formula:

SHA256(node_type || canonical_key || scope)

is NOT normative.

Graph identity uses the same canonicalization discipline as V4 but a dedicated domain:

Node:
HAHAWEEK-EVIDENCE-V4-GRAPH-NODE

Edge:
HAHAWEEK-EVIDENCE-V4-GRAPH-EDGE

For a graph identity input object O:

graph_hash(D,O) =
SHA256( UTF8(D) || 0x00 || UTF8(RFC8785_JCS(O)) )

The exact JCS object is the identity contract below.

No alternate concatenation, normalization, coercion, or encoding is permitted.

## 4. NODE IDENTITY INPUT

The canonical node identity input object is exactly:

{
  "node_type": "...",
  "scope": "...",
  "canonical_key": "..."
}

Rules:
- exact three keys;
- all values are strings;
- unknown or missing keys are rejected;
- no defaulting;
- no silent normalization;
- node_type is a defined enum;
- scope is an explicit namespace;
- canonical_key must be deterministic for that node type and scope.

node_id = graph_hash(HAHAWEEK-EVIDENCE-V4-GRAPH-NODE, node_identity_input)

The node_id is immutable.

A changed descriptive state does not change node identity. Versioned state belongs to a separate graph version object.

## 5. NODE CANONICAL KEY RULES

The canonical key must identify the intended entity without relying on mutable metadata.

Examples:

BLOCK:
chain_id + block_hash

TRANSACTION:
chain_id + transaction_hash

EVENT:
V4 event identity / event_id reference

CONTRACT:
chain_id + contract_address

TOKEN:
chain_id + contract_address

POOL:
chain_id + pool_address

WALLET:
chain_id + address

SOCIAL_ACCOUNT:
platform + platform_user_id

SOCIAL_POST:
platform + post_id + content_hash

NARRATIVE:
namespace + narrative_slug + definition_version

FORMATION:
formation identity contract, defined by the Formation Identity Specification.

HYPOTHESIS:
hypothesis identity contract, defined by the Hypothesis Identity Specification.

VALIDATION:
validation identity contract, defined by the Validation Identity Specification.

The examples above are not permission to invent concatenated string encodings. Each composite key must have its own canonical object-to-key rule before executable implementation.

## 6. EVENT IDENTITY BOUNDARY

EVENT nodes must reference the already-defined V4 event identity.

The Graph must not calculate an alternative event hash.

Therefore:

V4 event identity
→ EVENT node canonical key
→ Graph node identity

If V4 event identity is invalid or unavailable, the corresponding EVENT graph node cannot become authoritative.

## 7. EDGE IDENTITY INPUT

The canonical edge identity input object is exactly:

{
  "edge_type": "...",
  "source_node_id": "0x...",
  "target_node_id": "0x...",
  "scope": "..."
}

Rules:
- exact four keys;
- all strings;
- source and target are canonical Graph node IDs;
- edge_type is a defined enum;
- scope is explicit;
- unknown/missing keys rejected;
- no normalization or coercion.

edge_id = graph_hash(HAHAWEEK-EVIDENCE-V4-GRAPH-EDGE, edge_identity_input)

An edge identity identifies a relationship type between two specific graph nodes.

## 8. EDGE VERSION / EVIDENCE

Edge identity does not encode mutable support or provenance.

Evidence, temporal context, contradiction, uncertainty, and provenance are attached through immutable edge-version records.

An edge version must reference:
- edge_id;
- version sequence;
- evidence_ref[];
- temporal context;
- provenance;
- contradiction_ref[];
- uncertainty;
- canonicality projection where applicable.

A changed evidence set creates a new version; it does not overwrite the previous version.

## 9. DIRECTIONALITY

Edges are directional unless the edge type explicitly declares symmetric semantics.

For a directional edge:

A → B

and:

B → A

are different identities.

A symmetric relation must have a canonical ordering rule defined by its edge type before hashing.

No implementation may assume symmetry merely because two nodes are the same type.

## 10. IDENTITY VS STATE

Graph identity answers:

“What graph object is this?”

Graph state answers:

“What is currently known about this graph object?”

Therefore:

node_id != state_hash
edge_id != edge_version_id

State changes never rewrite node_id or edge_id.

## 11. COLLISION POLICY

If the same graph identity input produces the same digest:
- the identity is deterministic and the object is idempotent.

If an identity is presented with a different canonical input:
- this is an integrity conflict;
- it must fail closed;
- the original authoritative evidence is not changed.

Graph identity collision handling must never use “latest wins”.

## 12. PROVENANCE REQUIREMENT

Every Graph node and edge that enters an authoritative projection must have evidence provenance.

Minimum:
- evidence_ref[];
- acquisition/provenance reference where applicable.

An object with no evidence cannot become a supported graph projection.

Pure analytical/meta objects may reference other authoritative graph/evidence objects, but their derivation chain must remain explicit.

## 13. REBUILDABILITY

The Graph must be rebuildable from authoritative evidence and deterministic graph rules.

Given:
- identical authoritative evidence;
- identical graph identity rules;
- identical versioned configuration;

the same node_id and edge_id must be produced.

SQLite or another projection store may be discarded and rebuilt.

## 14. REORG

Graph identity does not change merely because canonicality changes.

For an orphaned event:
- the V4 event identity remains the same;
- the EVENT node remains addressable;
- canonicality changes through the applicable V4 transition chain;
- graph projection reflects the resulting canonicality state.

No graph identity is deleted because of reorg.

## 15. GRAPH IDENTITY IS NOT ENTITY RESOLUTION

A deterministic node_id does not prove that two nodes represent the same real-world actor.

For example:

WALLET(chain A, address X)
and
WALLET(chain B, address X)

are separate scoped identities.

A cross-entity relationship requires Identity Resolution evidence and must not be inferred from string similarity.

## 16. REQUIRED NEGATIVE CASES

Executable vectors must reject:
1. missing node_type;
2. unknown node key;
3. extra node key;
4. non-string node value;
5. alternate encoding of scope;
6. missing edge_type;
7. unknown edge key;
8. extra edge key;
9. non-string source/target;
10. malformed node_id;
11. edge using nonexistent node identity;
12. alternate hash domain;
13. non-JCS canonicalization;
14. silent normalization;
15. collision with different canonical input.

## 17. RELATION TO V4

This contract intentionally does NOT:
- change V4 event identity;
- change V4 transition semantics;
- change manifest/checkpoint/cursor authority;
- modify raw evidence;
- define acquisition cursor positions;
- authorize production graph migration.

It creates a deterministic identity layer for a rebuildable analytical projection.

## 18. OPEN DEPENDENCIES

Before executable implementation:
- freeze node_type registry;
- freeze edge_type registry;
- define composite canonical-key objects;
- define Formation/Hypothesis/Validation identity contracts;
- define symmetric-edge ordering rules;
- add positive/negative golden vectors;
- define separate analytical transition domains.

## 19. DESIGN GATE

Status: OPEN.

No production graph implementation is authorized by this document alone.

## 20. CORE PRINCIPLE

V4 answers:
“Is the evidence identity and integrity valid?”

Graph identity answers:
“What deterministic object does this evidence project into?”

These questions must remain separate.
