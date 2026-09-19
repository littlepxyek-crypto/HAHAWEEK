# HAHAWEEK — GitHub Continuity & Auto-Save Protocol

## Purpose
GitHub is the durable engineering record for HAHAWEEK code, specifications, decisions, tests, changelog, and recoverable project state.

It is NOT the automatic destination for raw production evidence, runtime databases, secrets, or the entire chat transcript.

## Safe to commit
- source code
- schemas
- tests
- architecture/specification documents
- decisions
- changelog
- worklog
- resume/state summaries
- reproducible audit results
- provenance indexes that contain no secrets or sensitive runtime data

## Never commit
- .env files
- API keys/tokens
- private keys/seed phrases
- credentials
- production SQLite databases
- raw production JSONL/event stores
- local checkpoints/manifests containing sensitive operational data
- backups containing secrets or production data
- full chat transcripts containing credentials or private information

## Engineering save cycle
Every material HAHAWEEK change should follow:

WORK RESULT
→ DOCUMENT
→ DIFF REVIEW
→ TEST
→ SECURITY CHECK
→ COMMIT
→ PUSH / PR
→ RECORD RESULT

Never use the equivalent of blindly staging every file as a security policy.

## Continuity artifacts
Maintain, when applicable:
- PROJECT_STATE.md
- CHANGELOG.md
- DECISIONS.md
- docs/WORKLOG.md
- docs/HAHAWEEK_RESUME.md
- docs/DESIGN_GATE_2_STATE.md
- docs/V4_CANONICAL_REFERENCE_MODEL.md

Each major milestone should update the appropriate durable artifact before the next major phase.

## Commit discipline
Prefer atomic commits such as:
- feat(...)
- fix(...)
- docs(...)
- test(...)
- security(...)
- perf(...)

Do not mix unrelated changes into one commit.

## Recovery rule
A new chat/session must recover HAHAWEEK from repository artifacts and verified repository HEAD, not from conversational memory alone.

## Automation boundary
Repository-side CI may automatically validate tests, dependency health, and basic secret patterns.

Repository-side automation must not automatically:
- commit production data;
- rewrite historical evidence;
- reset cursors;
- migrate legacy evidence;
- deploy production;
- publish secrets;
- bypass review gates.

Automation should fail closed on integrity/security errors.
