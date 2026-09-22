# Authoritative Replay Boundary Contract v0.1

Status: VERIFIED / FROZEN
Step: 437
Scope: Pool Bootstrap MVP historical replay

## Purpose

Define the boundary between synthetic fixture replay and authoritative blockchain evidence replay.

This contract does not activate production V4, change cursor authority, or migrate runtime state.

## Authority Classes

### SYNTHETIC

Synthetic fixtures are deterministic test vectors only.

They MUST NOT:
- be treated as blockchain observation;
- advance the production cursor;
- commit authoritative raw evidence;
- overwrite raw evidence;
- satisfy an authoritative provenance requirement.

### DISCOVERY_ONLY

Discovery/indexer data may identify candidates for investigation.

It MUST NOT become authoritative evidence merely by being replayed.

### AUTHORITATIVE

An authoritative replay input MUST reference preserved raw blockchain RPC evidence and retain enough provenance to reproduce the observation.

At minimum the replay envelope MUST preserve:
- chain_id;
- source/provider identity;
- request method and parameters;
- response payload;
- observation block context where applicable;
- evidence_id;
- capture metadata sufficient to trace the preserved raw record.

## Replay Boundary

Replay MUST be an offline derivation step:

AUTHORITATIVE RAW EVIDENCE -> REPLAY ADAPTER -> FORMATION ENGINE

The Formation Engine MUST consume the replayed event representation without gaining authority over raw storage or cursor state.

Synthetic replay follows a separate path:

SYNTHETIC FIXTURE -> TEST ADAPTER -> FORMATION ENGINE

The two paths MUST remain distinguishable by explicit fixture/evidence class.

## State Safety

Replay MUST NOT:
- advance or reset the production cursor;
- mutate production runtime state;
- overwrite existing raw evidence;
- promote discovery or synthetic data to authoritative evidence;
- activate V4 production authority.

## Determinism

For identical authoritative replay input, the derived formation result MUST remain deterministic under the existing Formation Contract.

Processing timestamps MUST NOT become evidence identity.

## Required Verification Vectors

The next implementation verification MUST cover:
1. authoritative replay accepted when provenance is complete;
2. synthetic replay rejected at an authoritative-only boundary;
3. discovery-only replay rejected at an authoritative-only boundary;
4. missing provenance rejected;
5. replay does not advance cursor;
6. replay does not mutate raw evidence;
7. deterministic formation output from identical authoritative replay input.

## Non-Goals

This contract does not:
- implement a live historical backfill;
- change RPC ingestion;
- change Pool Bootstrap semantics;
- authorize production V4;
- introduce predictive scoring;
- introduce trading.

## Safety Boundary

Design Gate 2 remains OPEN.
Production V4 remains NOT AUTHORIZED.
