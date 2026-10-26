# STEP 568 — Evidence-Set Digest Addendum Contract v0.1

This addendum is part of STEP 568 implementation and closes the only implementation ambiguity identified before production code: the exact evidence_set_digest derivation.

The digest is:

SHA-256( UTF8("HAHAWEEK-EVIDENCE-V4-PROCESSING-RESULT-EVIDENCE-SET-V0.1") || NUL || canonical_JCS(payload) )

Payload:
{
  "contract": "HAHAWEEK-EVIDENCE-V4-PROCESSING-RESULT-EVIDENCE-SET-V0.1",
  "result_id": "<processing result id>",
  "from_block": "<decimal string>",
  "to_block": "<decimal string>",
  "generation": "<decimal uint64 string>",
  "members": [
    {
      "ordinal": "<decimal string>",
      "evidence_id": "<string>",
      "raw_event_id": "<string>",
      "identity_hash": "<64 lowercase hex>",
      "raw_hash": "<64 lowercase hex>",
      "canonical_hash": "<64 lowercase hex>",
      "block_number": "<decimal string>",
      "transaction_index": "<decimal string>",
      "log_index": "<decimal string>"
    }
  ]
}

Members MUST be in STEP 563 deterministic order and ordinal MUST be zero-based contiguous.

The same canonical processing result and membership MUST always produce the same digest. Empty membership is represented by members: [] and remains valid only when empty_result=true.

No cursor, authority, timestamp, randomness, or expected-authority input participates in this digest.
