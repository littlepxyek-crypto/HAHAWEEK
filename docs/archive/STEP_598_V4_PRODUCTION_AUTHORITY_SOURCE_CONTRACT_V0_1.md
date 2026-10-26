# STEP 598 — V4 Production Authority Source Contract v0.1

- Status: CONTRACT
- Step: 598
- Predecessor: STEP 597 — V4 Production Implementation Boundary Analysis
- Baseline: `565465d44bb41afd21418c9c49f1fd658dfbb6f9`
- Gate 2: PASS
- V4 production authority: INACTIVE / BLOCKED

## 1. Purpose

Establish the explicit contract boundary for the production authority source required by the STEP 597 analysis. This contract defines what must be established before any production implementation can select or construct the runtime `authorityFactory`.

This contract does not itself activate V4, select an authority implementation, change cursor semantics, mutate evidence, migrate data, or authorize live production behavior.

## 2. Repository-grounded prerequisite

STEP 597 Analysis established that the repository already owns:
- verified canonical processing context;
- canonical lineage and generation;
- durable expected-authority verification;
- authority validation and binding;
- existing single-writer fence;
- existing BlockCursor ordering;
- recovery/reorg/integrity verification boundaries.

STEP 597 also established that the live runtime requires an explicit production authority source and fails closed with `AUTHORITY_SOURCE_REQUIRED` when absent.

Therefore STEP 598 must define that missing source without duplicating or replacing existing semantic owners.

## 3. Required authority source contract

The production authority source SHALL have an explicit, stable identity and owner.

The contract SHALL define:
1. source identity;
2. source ownership;
3. record schema and compatibility with the existing F-03 authority record;
4. provenance;
5. durable establishment boundary;
6. lifecycle/state transitions;
7. exact range binding;
8. generation binding;
9. cursor-endpoint binding;
10. canonical evidence binding;
11. relationship to the durable expected-authority chain;
12. writer/fencing ownership;
13. crash/recovery semantics;
14. reorg/replacement semantics;
15. integrity verification;
16. operator-visible verification;
17. STOP/FAIL-CLOSED conditions.

No field may be derived from an unrelated authority such as timestamp, cursor position alone, writer state, randomness, default value, or unverified inference.

## 4. Authority record compatibility

The production source must produce an authority representation that can be validated by the existing authority gate without changing its semantic ownership.

At minimum, compatibility SHALL preserve the existing checks for:
- exact processing range;
- VERIFIED processing context;
- generation equality;
- cursor endpoint equality;
- expected-authority binding;
- authority-source validity;
- writer-fence ownership where required.

If the existing F-03 schema is insufficient, the insufficiency must be documented and handled through a separate contract before implementation. No silent schema extension is permitted.

## 5. Durable establishment and provenance

The contract SHALL identify exactly where the production authority record becomes durable and what evidence proves that transition.

Durability SHALL be fail-closed.

A transient, partially persisted, ambiguous, or integrity-conflicted authority record SHALL NOT become production authority.

The source SHALL preserve provenance sufficient to reconstruct why the authority record was accepted and which canonical processing context it binds to.

## 6. Reorg and replacement

The authority source SHALL define:
- how canonical reorganization is represented;
- how replacement authority relates to the previous authority;
- how generation changes are consumed;
- how stale authority is rejected;
- how recovery preserves historical evidence;
- how ambiguous reorg state causes STOP/FAIL-CLOSED.

No historical authority record may be silently rewritten or deleted.

## 7. Crash and recovery

Before the durable authority boundary, failure SHALL leave no authoritative production state that can be mistaken for committed authority.

After the durable boundary, recovery SHALL preserve the immutable authority/evidence history and reconstruct or reuse the deterministic state rather than rewrite history.

Cursor advancement remains outside this contract's ownership and may occur only through the existing authority-gated ordering.

## 8. Writer and concurrency

The existing single-writer fence remains the sole writer/fencing authority.

This contract SHALL NOT introduce a second lock, writer, or concurrency authority.

Authority creation must prove ownership through the existing fence where the runtime contract requires it.

## 9. Operator Acceptance

The operator must be able to determine from repository-grounded procedures:
- which authority source is configured;
- whether its authority record is durable and valid;
- which range/generation/cursor endpoint it binds;
- whether provenance/integrity verification succeeded;
- whether recovery is allowed;
- when STOP/FAIL-CLOSED is mandatory.

No new operator command may be invented by this contract. Concrete operator procedure must be established from actual repository capabilities during Analysis/Design.

## 10. Surveillance boundary

Surveillance remains strictly:
**derived, evidence-linked, versioned, reproducible, non-authoritative.**

The authority source SHALL NOT:
- consume Surveillance output as production authority;
- allow Surveillance to mutate raw/canonical evidence;
- allow Surveillance to advance the cursor;
- create authority;
- perform automated trading/action;
- infer actor ownership from address identity.

**ADDRESS != ACTOR** remains mandatory.

No temporal leakage is permitted.

## 11. STOP / FAIL-CLOSED

Production authority MUST NOT be established when:
- source identity/ownership is absent;
- provenance is missing or invalid;
- required durable evidence is absent;
- authority record is ambiguous or malformed;
- range binding fails;
- generation binding fails;
- cursor endpoint binding fails;
- expected-authority binding fails;
- processing context is absent or not VERIFIED;
- writer ownership cannot be proven;
- integrity verification fails;
- reorg/replacement state is ambiguous;
- recovery state cannot be deterministically reconstructed;
- implementation would require new semantics not owned by an explicit contract.

There SHALL be no fallback/default authority source.

## 12. Scope exclusions

This contract does not authorize:
- V4 production activation;
- live RPC cutover;
- cursor reset or manual cursor advancement;
- historical evidence rewrite/deletion;
- schema migration;
- new writer/lock authority;
- automated trading/action;
- predictive/ranking authority;
- ADDRESS = ACTOR inference;
- implementation before Analysis and Design;
- alteration of frozen contracts without a new contract.

## 13. Acceptance criteria

STEP 598 Contract is accepted only when:
1. STEP 597 is VERIFIED/RECONCILED;
2. Gate 2 remains PASS;
3. V4 production authority remains INACTIVE/BLOCKED;
4. production authority source ownership is explicit;
5. authority record compatibility is explicit;
6. durability/provenance lifecycle is explicit;
7. range/generation/cursor binding is explicit;
8. reorg/recovery behavior is explicit;
9. existing writer/cursor/authority semantic owners remain unchanged;
10. Operator Acceptance remains repository-grounded;
11. Surveillance remains non-authoritative;
12. no implementation semantics are invented;
13. contract is merged and post-merge verified;
14. reconciliation and PROJECT_STATE documentation record exact evidence.

## 14. Next lifecycle

After this contract is verified and reconciled:
**STEP 598 Analysis → Design → Code only if Analysis and Design establish a concrete, repository-grounded production authority source boundary.**

If Analysis finds the source cannot be established without inventing semantics, production implementation remains blocked and the next required contract must be documented.
