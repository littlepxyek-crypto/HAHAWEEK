# HAHAWEEK — GRAPH IDENTITY CONTRACT v1

Status: IMPLEMENTED / TESTED / RUNTIME VERIFICATION REQUIRED

## Purpose

Evidence Graph identity is an analytical/projection identity. It is not V4
evidence identity and it does not establish evidence authority.

## Identity domains

- Node: `HAHAWEEK-EVIDENCE-V4-GRAPH-NODE`
- Edge: `HAHAWEEK-EVIDENCE-V4-GRAPH-EDGE`

Both domains are independent from V4 evidence identity and transition
semantics.

## Canonical object

A graph node identity commits to:

- schema_version
- graph_identity_kind = NODE
- node_type
- node_id
- scope

A graph edge identity commits to:

- schema_version
- graph_identity_kind = EDGE
- from
- edge_type
- to
- scope

Object keys are recursively canonicalized in lexical order before hashing.

## Digest

`SHA-256(domain || 0x00 || canonical_object)`

The domain is part of the graph identity protocol. This is a graph-specific
identity protocol; it MUST NOT be substituted for V4 evidence identity.

## Authority boundary

Graph identity:

- is deterministic;
- is rebuildable;
- preserves graph provenance;
- does not mutate canonical evidence;
- does not advance V4 cursor/checkpoint/manifest;
- does not establish canonicality.

## Compatibility

Existing semantic graph keys remain stable. The graph identity is an
additional explicit identity field so this contract can be introduced
without rewriting historical V4 evidence identifiers.

## Acceptance criteria

- deterministic for identical inputs;
- independent of object key insertion order;
- node and edge domains are distinct;
- identity is not treated as V4 evidence identity;
- rebuild produces identical identities from identical authoritative inputs.
