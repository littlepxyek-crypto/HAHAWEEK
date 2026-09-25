# F-01 V4 Acquisition Identity Golden Vector

fixture_id: f01-acquisition-identity-v4-001
protocol: HAHAWEEK-EVIDENCE-V4
domain: HAHAWEEK-EVIDENCE-V4-ACQUISITION

input_object:
{"chain_id":"4663","filter_hash":"0x7777777777777777777777777777777777777777777777777777777777777777","pagination_index":"0","provider_id":"robinhood-mainnet-primary","request_sequence":"0","requested_from_block":"64986557","requested_to_block":"64986566"}

canonical_jcs_utf8:
{"chain_id":"4663","filter_hash":"0x7777777777777777777777777777777777777777777777777777777777777777","pagination_index":"0","provider_id":"robinhood-mainnet-primary","request_sequence":"0","requested_from_block":"64986557","requested_to_block":"64986566"}

expected_acquisition_id:
6efb8f5087b0681c33c72f5f38eedb6ca8fba97478b85aef300adaf2d824f7c9

## Response digest fixture

response_object:
{"chain_id":"4663","filter_hash":"0x7777777777777777777777777777777777777777777777777777777777777777","logs":[],"requested_from_block":"64986557","requested_to_block":"64986566","status":"SUCCESS"}

canonical_response_jcs_utf8:
{"chain_id":"4663","filter_hash":"0x7777777777777777777777777777777777777777777777777777777777777777","logs":[],"requested_from_block":"64986557","requested_to_block":"64986566","status":"SUCCESS"}

response_digest:
29dbbd1485e675f18c177940d1708067ac70fb765a87321032e8f1795d98935c

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
