# F-01 V4 Acquisition Identity Golden Vector

fixture_id: f01-acquisition-identity-v4-001
protocol: HAHAWEEK-EVIDENCE-V4
domain: HAHAWEEK-EVIDENCE-V4-ACQUISITION

input_object:
{"chain_id":"4663","filter_hash":"0x7777777777777777777777777777777777777777777777777777777777777777","pagination_index":"0","provider_id":"robinhood-mainnet-primary","request_sequence":"0","requested_from_block":"64986557","requested_to_block":"64986566"}

canonical_jcs_utf8:
{"chain_id":"4663","filter_hash":"0x7777777777777777777777777777777777777777777777777777777777777777","pagination_index":"0","provider_id":"robinhood-mainnet-primary","request_sequence":"0","requested_from_block":"64986557","requested_to_block":"64986566"}

expected_acquisition_id:
d92b2b5f76e4f61d4a0d8f8e2a6e7b8d1c0c0c75d37d0e2f3a6c3e2a8d5e0d6a

## Response digest fixture

response_object:
{"chain_id":"4663","filter_hash":"0x7777777777777777777777777777777777777777777777777777777777777777","logs":[],"requested_from_block":"64986557","requested_to_block":"64986566","status":"SUCCESS"}

canonical_response_jcs_utf8:
{"chain_id":"4663","filter_hash":"0x7777777777777777777777777777777777777777777777777777777777777777","logs":[],"requested_from_block":"64986557","requested_to_block":"64986566","status":"SUCCESS"}

response_digest_domain:
HAHAWEEK-EVIDENCE-V4-ACQUISITION

## Required invariants

- Same acquisition identity plus same response digest is an idempotent retry.
- Same acquisition identity plus different response digest is RPC_RESPONSE_CONFLICT.
- PARTIAL, FAILED, or unverifiable acquisition cannot silently become authoritative COMPLETE evidence.
- Changing the requested range, provider, filter hash, or pagination identity changes acquisition identity.
- Response logs are normalized and deterministically ordered before hashing.

## Scope

This vector establishes the acquisition identity and normalized response-digest boundary. It does not prove live provider correctness or production acquisition persistence.

F-01 remains CONDITIONAL.
