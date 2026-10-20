# HAHAWEEK — F-01 Golden Vector V4-001

Status: DRAFT — TEST FIXTURE

Protocol: HAHAWEEK-EVIDENCE-V4
Serialization: RFC8785-JCS
Hash: SHA-256

## Vector

fixture_id: f01-payload-basic-v4-001

input_object:
{"b":"two","a":"one"}

canonical_jcs_utf8:
{"a":"one","b":"two"}

canonical_jcs_utf8_hex:
7b2261223a226f6e65222c2262223a2274776f227d

domain:
HAHAWEEK-EVIDENCE-V4-PAYLOAD

domain_utf8_hex:
484148415745454b2d45564944454e43452d56342d5041594c4f4144

separator_byte:
00

hash_input_utf8_hex:
484148415745454b2d45564944454e43452d56342d5041594c4f4144007b2261223a226f6e65222c2262223a2274776f227d

expected_sha256:
228d7728c03cf30c3e3e4a7f4e7bdd827f54fe7cc6037a732065aa6f2356cc12

## Expected invariants

- Reordering input keys MUST produce the same canonical bytes and digest.
- Changing "one" or "two" MUST change the digest.
- Removing or adding an integrity-critical field MUST be rejected where the applicable schema forbids it.
- The hash preimage is exactly UTF8(domain) || 0x00 || UTF8(JCS(input_object)).
- No JSON.stringify() output is normative unless it is byte-for-byte identical to the RFC8785 JCS result.

## Scope

This vector establishes the V4 payload hash primitive only. It does not by itself establish event identity, transition identity, segment, manifest, checkpoint, cursor, migration, acquisition, or lease vectors.

F-01 remains CONDITIONAL until the complete artifact vector corpus and independent verifier coverage are complete.
