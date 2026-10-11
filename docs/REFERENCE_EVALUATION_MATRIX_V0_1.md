# HAHAWEEK — Reference Evaluation Matrix v0.1

- **Document ID:** HFI-REF-MATRIX-001
- **Version:** 0.1
- **Status:** DRAFT — NON-AUTHORITATIVE
- **Scope:** External reference evaluation
- **Reference:** https://github.com/f/prompts.chat
- **System:** HAHAWEEK — standalone Evidence Intelligence

> This document records an evaluation policy and reference decision only. It is not an architecture contract, does not authorize implementation, and does not assert that any HAHAWEEK code or runtime has been changed or tested.

## 1. Purpose

Define a traceable process for evaluating external prompt libraries, AI instructions, and integration patterns before they are considered for HAHAWEEK.

Goals:
- Preserve provenance and evaluation history.
- Keep external references separate from canonical evidence and system authority.
- Prevent prompt content from changing policy, runtime state, cursor, checkpoint, manifest, or evidence.
- Require reproducible tests and explicit review before adoption.
- Keep rejected, unknown, and unresolved findings visible.

## 2. Non-negotiable constraints

1. HAHAWEEK remains standalone.
2. External references are untrusted, non-authoritative inputs.
3. Inspect → Verify → Execute; ambiguity fails closed.
4. Raw evidence and provenance are not overwritten by AI interpretation.
5. No silent normalization, history deletion, or evidence rewriting.
6. Cursor, checkpoint, manifest, and V4 authority are governed only by their existing contracts and authorized procedures.
7. No predictive score without reproducible validation.
8. Prompt or MCP output cannot authorize code changes, shell execution, wallet actions, or production activation.
9. Evaluation results do not imply production readiness.
10. Existing architecture and authority gates remain unchanged by this document.

## 3. Reference registry

| Field | Value |
|---|---|
| Reference ID | REF-PROMPTS-CHAT-001 |
| Name | prompts.chat |
| Repository | https://github.com/f/prompts.chat |
| Type | Prompt library, learning material, CLI/plugin/MCP reference |
| Intended use | Learn and evaluate prompt engineering and integration patterns |
| Trust level | UNTRUSTED EXTERNAL INPUT |
| Authority | NON-AUTHORITATIVE |
| Integration status | NOT INTEGRATED |
| Runtime status | NOT TESTED |
| Adoption status | REFERENCE ONLY; IMPLEMENTATION NOT APPROVED |
| Pinned commit/version | PENDING |
| License review | REQUIRED before copying/adopting content or files |
| Security review | REQUIRED before enabling any integration or tool access |

## 4. Evaluation matrix

### REF-01 — Prompt engineering

**Purpose:** Evaluate task framing, explicit constraints, output schemas, and testable success criteria.

**Acceptance criteria**
- Task and scope are explicit.
- Output distinguishes observed facts, inferences, assumptions, and unknowns.
- Test cases and expected outputs are defined.
- Prompt does not claim authority it does not possess.
- Failure and uncertainty are represented explicitly.

**Required evidence:** Source URL and version, prompt text, test cases, expected/actual outputs, reviewer decision.

**Current status:** REFERENCE ACCEPTED; IMPLEMENTATION NOT TESTED.

### REF-02 — Prompt and skill discovery

**Purpose:** Evaluate prompt/skill search as a possible reference workflow.

**Acceptance criteria**
- Results are treated as external data, not privileged instructions.
- Source and version are traceable.
- Retrieved content is not executed automatically.
- Retrieved instructions cannot override HAHAWEEK policy or contracts.

**Current status:** DOCUMENTATION REVIEWED; RUNTIME NOT TESTED.

### REF-03 — MCP integration

**Purpose:** Determine whether programmatic prompt retrieval is needed and safe.

**Acceptance criteria**
- Endpoint and server identity are verified.
- Authentication, permissions, and available tools are reviewed.
- Secrets are not disclosed to unauthorized services.
- Tool access is least-privilege and read-only during evaluation.
- External responses are validated before use.
- Timeout or provider failure cannot mutate canonical state.

**Current status:** DESIGN REFERENCE ONLY; NO CONNECTION AUTHORIZED.

### REF-04 — Evidence integrity

**Purpose:** Prevent AI-generated interpretation from being promoted to canonical evidence without verification.

**Acceptance criteria**
- Raw source is retained independently from derived output.
- Derived results record provenance and evaluation version.
- Conflicts and uncertainty remain explicit.
- Existing canonicalization, hashing, manifest, checkpoint, and cursor contracts are not redefined.
- AI cannot rewrite history or advance state.

**Current status:** REQUIRED CONTROL; IMPLEMENTATION NOT VERIFIED BY THIS DOCUMENT.

### REF-05 — Security and authority

**Purpose:** Prevent prompt injection and unauthorized tool execution.

**Acceptance criteria**
- External content cannot override system policy.
- Write and execution permissions are disabled during evaluation.
- Repository modifications require separate review and authorization.
- No integration bypasses validation gates.
- Failed or ambiguous actions are not represented as successful.

**Current status:** MANDATORY GATE; SECURITY TESTS PENDING.

### REF-06 — License and provenance

**Purpose:** Ensure that adopted content can be traced and used under the applicable license.

**Acceptance criteria**
- Exact files and content types are identified.
- Applicable license is checked per file/content class.
- Source URL, commit/version, retrieval time, and artifact hash are recorded when applicable.
- Attribution and other license obligations are followed.
- Unclear licensing blocks adoption until resolved.

**Current status:** REVIEW REQUIRED BEFORE ADOPTION.

## 5. Status vocabulary

- **CONFIRMED:** supported by evidence that was inspected.
- **PARTIALLY VERIFIED:** only some required claims have supporting evidence.
- **INCONCLUSIVE:** available evidence cannot resolve the question.
- **UNKNOWN:** no adequate evidence is available.
- **REJECTED:** evaluation criteria are not met.
- **PENDING:** evaluation or required review has not completed.

Absence of evidence is not evidence of absence. A retrieval failure is not a negative finding.

## 6. Evaluation procedure

### Phase A — Identify
Record source, URL, commit/version, purpose, content type, and intended use.

### Phase B — Inspect
Review relevant documentation and files. Do not install a plugin or activate a connection solely to conduct an initial review.

### Phase C — Verify
Compare claims against evidence, review license/security constraints, and run isolated tests where needed.

### Phase D — Review
Document findings, residual risks, limitations, and any possible impact on HAHAWEEK contracts.

### Phase E — Decide
Choose one disposition: reject, retain as reference, or propose adoption for a separate approval gate.

### Phase F — Authorize
Any implementation requires a verified repository baseline, scoped change, appropriate review, and explicit authorization. This matrix alone is not authorization.

## 7. Required evaluation record

Every formal evaluation should record:

- Evaluation ID and Reference ID
- Source URL and commit/version
- Retrieval timestamp
- Files or sections inspected
- SHA-256 artifact hash where relevant
- Test cases and expected results
- Actual results and supporting evidence
- Findings and unresolved questions
- Security and license review
- Reviewer and applicable authorization
- Decision and rationale
- Revision history

Unavailable fields must be marked UNKNOWN or PENDING rather than guessed.

## 8. Adoption gate

A reference must not be adopted merely because it is popular, produces persuasive output, supports MCP, or advertises AI-agent capabilities.

Adoption requires evidence of relevance, appropriate testing, security review, license review, and a separately authorized decision.

## 9. Current decision

| Item | Decision |
|---|---|
| prompts.chat as a non-authoritative reference | ACCEPTED |
| Prompt/skill library use in production | NOT APPROVED |
| MCP activation | NOT AUTHORIZED |
| Production access | NOT AUTHORIZED |
| Canonical evidence authority | UNCHANGED |
| Cursor/checkpoint/manifest authority | UNCHANGED |
| Architecture change | NONE |
| Runtime/code integration | NONE |

## 10. Revision history

- **v0.1 — Draft:** Initial reference registry, evaluation criteria, and adoption gates. Created as documentation only; no runtime or architecture change implied.

---

**End of HFI-REF-MATRIX-001 v0.1**
