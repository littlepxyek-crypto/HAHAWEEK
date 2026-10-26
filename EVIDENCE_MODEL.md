# Evidence Model

```text
RPC log  ->  RAW EVENT  ->  CANONICAL EVIDENCE  ->  AUTHORITY (F-03 + lifecycle)  ->  CURSOR
```

1. **Raw evidence** is the RPC log as received, stored append-only with a content digest
   ([EVENT_SCHEMA.md](EVENT_SCHEMA.md)). Raw history is never rewritten.
2. **Canonical decision.** Before a range is accepted, every block header in it is fetched and the
   parent-hash chain is checked against the persisted parent (`canonical-decision-input.js`).
3. **Canonical evidence** is derived from raw events with a deterministic identity
   (RFC 8785 canonical JSON via `src/reference/v4/jcs.js` + domain-separated SHA-256, `evidence-identity.js`), and committed with its lineage
   (`INITIAL`, `CONTINUATION`, `REORG_REPLACEMENT`).
4. **Verified processing context** binds range, lineage, evidence-set digest and generation
   (`runtime-processing-context.js`).
5. **Authority gate** (`f03-ingestion-authority-integration.js`) checks the expected F-03 authority,
   the authority binding and the production lifecycle record. Only `AUTHORIZED` lets the cursor
   advance. Everything else fails closed.
6. **Single writer.** A file lease (`single-writer-fence.js`) and a legacy-write barrier guard every
   write; a lost lease aborts the run.

What the authority does **not** do: it guarantees identity, ordering and integrity of HAHAWEEK's
own records. It is not an oracle of external truth.

Derived layers (evidence graph, formation, validation, intelligence, radar, report) are designed
to be rebuildable projections of canonical evidence. They are not wired into the live runtime yet;
see [ARCHITECTURE.md](ARCHITECTURE.md).
