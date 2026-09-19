# HAHAWEEK — IDENTITY RESOLUTION L4/L5 CONTRACT v0.1

Status: Draft
Scope: Formal resolution semantics for cross-entity identity/linking.
Dependencies: Evidence Graph v0.1, Temporal & Validation v0.1, Identity Resolution v0.1, Analytical Transition Boundary v0.1, Threat Model v0.1, Cross-Spec Reconciliation Audit v0.1.

## 1. PURPOSE

This contract freezes the boundary between:
- observed identity facts;
- corroborated associations;
- cryptographic/direct-control verification;
- real-world identity claims.

Identity resolution is an analytical projection. It never changes V4 evidence authority.

The central rule is:

> Association is not identity. Control of a key is not proof of a real-world person or organization unless the claimed relation itself is what the evidence proves.

## 2. RESOLUTION LEVELS

L0 UNRESOLVED
- No supported relation exists.

L1 MENTIONED
- One source mentions the target entity or identifier.
- No identity relation is established.

L2 ASSOCIATED
- At least one valid evidence item supports an association.
- The relation remains weak and non-corroborated.

L3 PATTERNED
- Repeated observations support a reproducible behavioral or contextual pattern.
- Pattern similarity is not proof of common control or identity.

L4 CORROBORATED
- The relation is supported by at least two qualifying, independent evidence lines.
- Independence must be established by the Source Independence Contract.
- L4 is not cryptographic proof.
- L4 may support an explicitly qualified analytical hypothesis.

L5 VERIFIED
- The specific relation is established by direct cryptographic or direct on-chain control evidence appropriate to that relation.
- L5 is relation-specific.
- L5 must not be assigned merely because multiple weak signals agree.

## 3. L4 — CORROBORATED

L4 requires:

1. at least two evidence lines;
2. evidence lines are materially independent under the source-lineage rules;
3. each evidence line supports the same narrowly defined relation;
4. no unresolved contradiction that directly defeats the relation;
5. temporal scope is compatible;
6. the evidence provenance is complete;
7. a falsifier is recorded.

Examples that may qualify for L4 after source-independence verification:
- two independent direct declarations connecting the same wallet to the same social account;
- an on-chain control observation plus an independently sourced signed declaration, where both address the same relation;
- multiple independent on-chain facts supporting a narrowly defined control relation.

L4 must state exactly what is corroborated.

Example:
"Account A is associated with wallet W during period T."

Not:
"Account A is definitely the real-world owner of W."

## 4. L5 — VERIFIED

L5 requires direct evidence that verifies the exact relation being asserted.

### 4.1 Wallet control

A wallet-control relation can reach L5 when:
- a valid cryptographic signature proves control of the wallet under a defined challenge/message;
- the signature verification is performed against the exact canonical message;
- nonce/replay protection and message domain are verified;
- the observation is bound to the intended account/entity relation.

A signature proves control of the signing key for the specified challenge. It does not automatically prove a person's legal identity.

### 4.2 Contract administration/control

A relation can reach L5 when direct on-chain evidence establishes the relevant control relation, such as:
- verified owner/admin storage;
- verified proxy admin slot;
- direct ownership-transfer event;
- direct contract-controlled authorization event.

The exact relation must be named. "Controls contract" is not interchangeable with "deployed contract".

### 4.3 Same wallet / same address

Identical chain + address is self-evident identity of the address reference and does not require heuristic resolution.

Cross-chain same-address strings are NOT automatically L5.

### 4.4 Social account ownership

A wallet signature alone does not establish that a specific human or organization owns a social account.

For:
SOCIAL_ACCOUNT ↔ WALLET

L5 requires a verification protocol that directly binds the social account to the wallet, or an equivalent cryptographic mechanism accepted by a future Social Identity Verification Contract.

Until that contract exists:
- signed wallet message proves wallet control;
- social posting proves control of the social posting channel only to the extent supported by platform evidence;
- the combination must not be promoted to L5 real-world identity.

## 5. RELATION-SPECIFIC VERIFICATION

Every identity link must declare:

- relation_type;
- subject_entity_type;
- object_entity_type;
- resolution_level;
- evidence_ref[];
- source_lineage_ref[];
- temporal scope;
- falsifier[];
- contradiction_ref[];
- verification_method.

The resolution level applies to the specific relation, not globally to the entities.

Example:

W1 controls contract C = L5

does NOT imply:

W1 owns social account X = L5.

## 6. PROHIBITED PROMOTIONS

The following are insufficient by themselves for L4 or L5:

- same token purchase;
- same posting time;
- same timezone;
- similar transaction sizes;
- similar gas patterns;
- common followers;
- username similarity;
- profile image similarity;
- bio similarity;
- shared narrative;
- shared exchange funding;
- common IP/network metadata unless explicitly verified and authorized;
- bytecode similarity as proof of common control;
- repeated co-occurrence without independent corroboration.

These signals may contribute to L2/L3 hypotheses when properly evidenced.

## 7. SOURCE INDEPENDENCE BOUNDARY

L4 depends on source independence.

Until the Source Independence Contract is frozen:
- L4 cannot be considered publication-grade;
- multiple URLs/reposts of the same origin count as one lineage;
- derived aggregators do not automatically constitute independent sources;
- one RPC provider and its mirrors do not automatically constitute independent chain evidence.

Source independence is a separate contract and cannot be inferred from a source count.

## 8. CONTRADICTION

A direct contradiction prevents automatic promotion.

If an L4/L5 relation receives credible contradictory evidence:
- resolution may move to WEAKENED or REJECTED through an analytical transition;
- prior evidence and prior resolution are preserved;
- no deletion or overwrite occurs.

L5 is not irrevocable merely because it was once verified. It is a state supported by a specific evidence set and verification method.

## 9. FALSIFIER

Every L2+ relation must define at least one falsifier.

Examples:
- wallet signature fails verification;
- signed message nonce is replayed;
- direct control record points to a different administrator;
- independent evidence demonstrates different wallet control;
- social verification protocol fails;
- the relation's required temporal condition is impossible.

A satisfied falsifier causes a new analytical transition to REJECTED, not deletion.

## 10. TRANSITIVITY

Identity links are not transitively promoted.

A → B at L5 and B → C at L5 does not automatically create A → C at L5.

A new relation requires relation-specific evidence.

Even cryptographic control chains must be interpreted according to the exact relations involved.

## 11. TEMPORAL SCOPE

Every L2+ relation must have:
- start_event_time where known;
- end_event_time where known;
- observation_time;
- processing_time.

A verified relation at time T does not automatically establish the same relation at all other times.

Historical identity resolution must remain historical.

## 12. REORG INTERACTION

If on-chain evidence supporting an identity relation becomes ORPHANED:
- the relation is marked affected;
- the previous resolution is preserved;
- a new evaluation is performed;
- any state change is recorded through the Identity analytical transition chain.

Reorg does not delete the prior resolution record.

## 13. PUBLICATION BOUNDARY

Default publication eligibility:

L0-L2:
- internal only.

L3:
- may appear as explicitly labelled "pattern observed" or hypothesis;
- must not be presented as identity fact.

L4:
- may be used as a qualified corroborated association;
- must expose uncertainty and source independence.

L5:
- may be described as verified only for the exact relation and verification method;
- must not be generalized into an unverified real-world identity claim.

No resolution level authorizes doxxing or disclosure of personal information.

## 14. IDENTITY CLAIM LANGUAGE

Allowed examples:

L3:
"Wallet W1 and W2 show a repeated behavioral pattern during window T."

L4:
"Independent evidence corroborates an association between W1 and account A during T."

L5:
"Control of wallet W1 was verified using cryptographic challenge C."

Not allowed as automatic promotion:

"Therefore W1 belongs to person X."

That requires a separate real-world identity evidence contract.

## 15. MINIMUM RECORD

A relation record must contain:

{
  "link_id": "...",
  "relation_type": "...",
  "source_node_id": "...",
  "target_node_id": "...",
  "resolution_level": "L0|L1|L2|L3|L4|L5",
  "identity_class": "...",
  "evidence_ref": [],
  "source_lineage_ref": [],
  "verification_method": "...",
  "temporal": {
    "start_event_time": null,
    "end_event_time": null,
    "observation_time": "...",
    "processing_time": "..."
  },
  "falsifier": [],
  "contradiction_ref": [],
  "uncertainty": {
    "level": "UNKNOWN|HIGH|MEDIUM|LOW",
    "reason": "..."
  }
}

This is a record/projection schema. Its exact identity hashing and analytical transition semantics remain governed by their respective contracts.

## 16. REQUIRED NEGATIVE VECTORS

At minimum:

1. L4 with two sources from the same source lineage → reject.
2. L4 with one evidence item → reject.
3. L5 from repeated behavioral similarity → reject.
4. L5 from same token purchase → reject.
5. L5 from username/profile similarity → reject.
6. L5 from wallet signature claiming a human identity without a social binding protocol → reject.
7. Cross-chain same-address strings promoted automatically to L5 → reject.
8. L5 relation generalized to a different relation → reject.
9. L4/L5 without falsifier → reject.
10. L4/L5 with unresolved direct contradiction → reject promotion.
11. L5 based on replayed signature/nonce → reject.
12. L5 based on an orphaned V4 event without re-evaluation → reject.
13. A→B and B→C automatically producing A→C L5 → reject.
14. URL count used as source independence without lineage verification → reject.

## 17. OPEN DEPENDENCIES

Still required:
- Source Independence Contract;
- Social Identity Verification Contract;
- relation-specific cryptographic challenge contract;
- exact identity analytical transition vectors;
- executable positive/negative golden vectors.

## 18. DESIGN GATE

Status: OPEN.

This contract does not authorize:
- social scraping;
- real-world identity attribution;
- production identity clustering;
- publication of personal data;
- production migration;
- V4 authority changes.

## 19. CORE RULE

L4 means:

"Independent evidence corroborates this specific association."

L5 means:

"Direct evidence verifies this specific relation."

Neither means:

"I know who the human is."

Identity resolution must remain relation-specific, temporal, evidence-backed, falsifiable, and reversible through immutable analytical history.
