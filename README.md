# HAHAWEEK

## Early Formation Intelligence

> **Observe what is forming. Connect the evidence. Validate before believing.**

HAHAWEEK is an evidence-first research and engineering system for reconstructing how early on-chain formations emerge.

It connects acquisition, raw evidence, provenance, relationships, temporal formation, validation, and research output into one auditable chain.

**Others detect signals. HAHAWEEK reconstructs how a formation becomes evidence.**

> **Status at a glance (see [ARCHITECTURE.md](ARCHITECTURE.md)):** the live runtime ingests Uniswap v4 PoolManager events on Robinhood Chain (chain ID 4663) through RPC → raw evidence → canonical evidence → V4/F-03 authority gate → cursor. Formation, validation, intelligence, radar, research report and X content are implemented and unit-tested but **not wired into the live runtime yet** (they run only in CI verification scripts). INTERNET and WALLET sources are planned. The diagrams below show the target design.

[![Security & Regression](https://github.com/littlepxyek-crypto/HAHAWEEK/actions/workflows/security.yml/badge.svg)](https://github.com/littlepxyek-crypto/HAHAWEEK/actions/workflows/security.yml)

---

## What is HAHAWEEK?

HAHAWEEK is designed around one question:

> **What is forming, what evidence supports it, what contradicts it, and can the conclusion be reproduced from preserved evidence?**

The core model is:

```text
OBSERVE
   ↓
CONNECT
   ↓
RECORD
   ↓
UNDERSTAND
   ↓
VALIDATE
   ↓
LEARN
```

And the evidence pipeline is:

```text
RPC  (INTERNET: planned)
      ↓
  ACQUISITION
      ↓
 RAW EVIDENCE RECORD
      ↓
 CANONICAL EVIDENCE RECORD
      ↓
 V4 INTEGRITY AUTHORITY
      │
      +-----------------------+------------------------+
      │                                                │
      v                                                v
 EVIDENCE GRAPH                                 FORMATION
 (parallel, rebuildable)                              ↓
                                                HYPOTHESIS
                                                     ↓
                                                VALIDATION
                                                     ↓
                                                INTELLIGENCE
                         /          \\
                      RADAR       RESEARCH
                                      ↓
                                   REPORT
```

---

## The Core Idea

HAHAWEEK does not treat a single transaction, mention, wallet, or metric as a formation by default.

A formation is reconstructed from connected evidence across time.

For an on-chain pool formation, the conceptual sequence can look like:

```text
POOL CREATED
      ↓
LIQUIDITY ADDED
      ↓
FIRST SWAP
      ↓
WALLET ACTIVITY
      ↓
FORMATION WINDOW
      ↓
FORMATION / VALIDATION
      │
      └──→ EVIDENCE GRAPH (parallel rebuildable projection)
```

Every downstream conclusion should remain traceable to the evidence that supports it.

---

## Evidence First

The authority model is intentionally layered:

```text
RAW EVIDENCE
     ↓
CANONICAL BYTES
     ↓
DETERMINISTIC IDENTITY / HASH
     ↓
IMMUTABLE SEGMENT
     ↓
MANIFEST
     ↓
CHECKPOINT
     ↓
CURSOR
```

The higher-level research layer is derived from this evidence chain.

### Important distinctions

HAHAWEEK explicitly distinguishes:

- observed fact
- derived measurement
- inference
- uncertainty
- contradiction
- validation
- provenance

**Unknown does not mean false.**

**Missing data does not automatically mean negative evidence.**

**Repeated mentions do not automatically mean independent sources.**

**Address diversity does not automatically mean actor diversity.**

---

## Architecture (target design)

Stages marked `*` are implemented but not yet wired into the live runtime; `(planned)` has no implementation yet.

```text
                    HAHAWEEK
                       │
        ┌──────────────┼──────────────┐
        ↓              ↓              ↓
  INTERNET*          RPC        WALLET (planned)
        │              │              │
        └──────────────┼──────────────┘
                       ↓
                  ACQUISITION
                       ↓
                  RAW EVIDENCE
                       ↓
               CANONICAL EVIDENCE
                       ↓
                  V4 AUTHORITY
                    /       \
                   /         \
                  ↓           ↓
       EVIDENCE GRAPH*     FORMATION*
       (rebuildable)           ↓
                           HYPOTHESIS*
                               ↓
                           VALIDATION*
                               ↓
                          INTELLIGENCE*
                           /       \
                        RADAR*    RESEARCH*
                                    ↓
                                  REPORT*
```

The Evidence Graph is a projection and must remain rebuildable from authoritative evidence.

**V4 integrity authority protects the identity, ordering, and integrity of HAHAWEEK records; it does not by itself establish external truth.**

**Graph is a parallel projection, not a prerequisite for Formation.**


---

## What HAHAWEEK Is Not

HAHAWEEK is not:

- a trading bot;
- a price-prediction engine;
- an automatic BUY/SELL system;
- a private-key or signing system;
- a token-shilling system;
- a substitute for preserved evidence.

The foundation is **read-only, evidence-first, reproducible, and fail-closed at authority boundaries**.

---

## Integrity & Provenance

HAHAWEEK's V4 engineering layer defines deterministic integrity primitives including:

- RFC 8785 JSON Canonicalization Scheme;
- SHA-256 domain-separated hashing;
- deterministic event identity;
- transition-chain integrity;
- explicit reorg handling;
- acquisition provenance;
- segment, manifest, checkpoint, and cursor authority;
- duplicate/collision handling;
- single-writer lease semantics;
- migration and backup integrity boundaries;
- executable golden-vector verification.

V4 remains an engineering/integrity layer. It does not replace the conceptual HAHAWEEK architecture.

---

## Formation Model

The system is built around the idea that formation is a process rather than a single signal.

Conceptually:

```text
BLOCK
  ↓
TRANSACTION
  ↓
CONTRACT / EVENT
  ↓
POOL
  ↓
LIQUIDITY
  ↓
SWAP
  ↓
WALLET
  ↓
FORMATION
```

Social and narrative observations can later be connected to the evidence graph, but they do not become authoritative merely because they are published.

---

## Validation

Validation is separated from formation detection.

The intended research flow is:

```text
OBSERVATION
    ↓
HYPOTHESIS
    ↓
HISTORICAL OUTCOME
    ↓
EVALUATION
    ↓
CONFIRMED / REJECTED / INCONCLUSIVE
```

Validation definitions and thresholds must be versioned before evaluation.

Future evidence must not leak backward into formation detection.

---

## Current Engineering Status

**Design Gate 2: PASS**

The current Design Gate 2 state records F-01..F-05 and H-01..H-05 as VERIFIED / FROZEN, with the acceptance evidence documented in [Design Gate 2 State](docs/DESIGN_GATE_2_STATE.md).

**Gate 2 PASS is a design/provenance acceptance state. It does not itself activate V4 production authority.**

**What runs today:** `src/index.js` builds the V4/F-03 production-authority gate and lifecycle for every ingested batch; the cursor advances only when that gate returns `AUTHORIZED`. Older documents that call V4 authority "INACTIVE" describe the governance label, not the code: the activation state machine (`src/core/authority-activation-state.js`) exists but the live gate does not consult it. No production host deployment is recorded in this repository.

---

## MVP Scope

The current MVP design deliberately stays small:

```text
ONE CHAIN
ONE FORMATION TYPE
ONE VALIDATION FAMILY
ONE COMPLETE EVIDENCE CHAIN
```

The MVP scope is designed around a bounded on-chain `POOL_BOOTSTRAP` formation:

```text
Pool Created
     ↓
Liquidity Added
     ↓
First Swap
     ↓
Validation
     ↓
Evidence-backed Research Report
```

The MVP explicitly excludes automated trading, private keys/signing, predictive price models, production V4 cutover, legacy migration, and autonomous claim publication.

See [MVP Scope](docs/MVP_SCOPE_SPEC_V0_1.md).

---

## Research & Publication (planned output)

Research is designed as a first-class output. Today the report and X-content modules run only inside CI verification scripts; their results are CI artifacts and **nothing is published**.

```text
DATA
 ↓
EVIDENCE
 ↓
ANALYSIS
 ↓
REPORT
 ↓
X CONTENT
```

A publishable claim should remain traceable:

```text
X POST
  ↓
CLAIM
  ↓
RESEARCH
  ↓
EVIDENCE
  ↓
SOURCE / TRANSACTION / BLOCK
```

X can be an input and publication channel.

**X is not the source of truth.**

---

## Documentation

### Architecture

- [ARCHITECTURE.md](ARCHITECTURE.md) — as-built status (source of truth)
- [ROADMAP.md](ROADMAP.md) · [DATA_SCHEMA.md](DATA_SCHEMA.md) · [EVENT_SCHEMA.md](EVENT_SCHEMA.md) · [EVIDENCE_MODEL.md](EVIDENCE_MODEL.md) · [TEST_PLAN.md](TEST_PLAN.md)
- Historical STEP records: [docs/archive/](docs/archive/)
- [Canonical Blueprint](docs/BLUEPRINT_CANONICAL.md)
- [MVP Scope](docs/MVP_SCOPE_SPEC_V0_1.md)
- [Threat Model](docs/THREAT_MODEL_SPEC_V0_1.md)

### V4 Evidence Integrity

- [V4 Canonical Reference Model](docs/V4_CANONICAL_REFERENCE_MODEL.md)
- [V4 Normative Lexical Forms](docs/V4_NORMATIVE_LEXICAL_FORMS.md)
- [V4 Event Identity Contract](docs/V4_EVENT_IDENTITY_INPUT_CONTRACT.md)
- [V4 Transition Contract](docs/V4_NORMATIVE_TRANSITION_INPUT_CONTRACT.md)
- [V4 Checkpoint Contract](docs/V4_NORMATIVE_CHECKPOINT_INPUT_CONTRACT.md)
- [V4 Cursor Contract](docs/V4_NORMATIVE_CURSOR_INPUT_CONTRACT.md)
- [Checkpoint / Recovery Boundary Audit](docs/V4_CHECKPOINT_RECOVERY_BOUNDARY_AUDIT.md)

### Trust, Identity & Cross-Spec

- [Identity Resolution L4/L5](docs/IDENTITY_RESOLUTION_L4_L5_CONTRACT_V0_1.md)
- [Source Independence](docs/SOURCE_INDEPENDENCE_CONTRACT_V0_1.md)
- [Cross-Spec L4 Validation](docs/CROSS_SPEC_L4_VALIDATION_CONTRACT_V0.1.md)
- [Cross-Spec Reconciliation Audit](docs/CROSS_SPEC_RECONCILIATION_AUDIT_V0_1.md)

### Reference Intelligence

- [Reference Intelligence Contract](docs/REFERENCE_INTELLIGENCE_CONTRACT_V1.md)
- [Reference Observation Provenance](docs/REFERENCE_OBSERVATION_PROVENANCE_CONTRACT_V1.md)
- [Reference Provider Resource Boundary](docs/REFERENCE_PROVIDER_RESOURCE_BOUNDARY_V1.md)
- [Investigation Execution State Machine](docs/INVESTIGATION_EXECUTION_STATE_MACHINE_V1.md)

Reference Intelligence is non-authoritative, provenance-preserving, temporally explicit, and resource-bounded. It cannot mutate V4 authority or become canonical evidence automatically.

### Engineering & Continuity

- [Design Gate 2 State](docs/DESIGN_GATE_2_STATE.md)
- [GitHub Continuity Protocol](docs/GITHUB_CONTINUITY_PROTOCOL.md)
- [GitHub Hardening Checklist](docs/GITHUB_HARDENING_CHECKLIST.md)
- [Decisions](docs/DECISIONS.md)

---

## Development

The repository uses a PR-based engineering workflow.

```text
WORK RESULT
    ↓
DOCUMENT
    ↓
DIFF REVIEW
    ↓
TEST
    ↓
SECURITY CHECK
    ↓
COMMIT
    ↓
PUSH / PR
    ↓
RECORD RESULT
```

Core rules:

- preserve historical evidence;
- do not rewrite raw history;
- fail closed at authority boundaries;
- keep derived projections rebuildable;
- do not bypass repository protections;
- do not introduce production V4 changes before the applicable production-boundary authorization.

Run the test suite with:

```bash
npm test
```

Run ingestion (configuration: [.env.example](.env.example), details in [ARCHITECTURE.md](ARCHITECTURE.md)):

```bash
npm ci
node src/pass.js       # one bounded pass (free profile by default), honours a previous fail-closed STOP
HAHAWEEK_MODE=window node src/watch.js   # window-watch loop: new pools + latest blocks, gaps recorded
node src/index.js      # one ingestion pass, then exit
node src/runner.js     # continuous: health -> ingestion pass -> sleep; fail-closed STOP exits 78
node src/status.js     # print persisted operational state
```

### Profiles: `free` (default) and `fast`

`HAHAWEEK_PROFILE=free` is made for **free resources only**: the public RPC `https://rpc.mainnet.chain.robinhood.com` (no API key), a free GitHub Actions runner, or an Android phone with Termux. Small requests (100-block `getLogs`, 2 header requests in flight, 5 × 100 blocks per pass ≈ 1.7 MB download), long sleeps, and patient retries (exponential backoff + jitter on 429/5xx/timeouts, `Retry-After` honoured, cursor never moves on failure).

It **does not keep up with the chain head** (~9.6 blocks/s). It builds a contiguous, authority-checked history at a polite pace. Use `HAHAWEEK_PROFILE=fast` (the earlier defaults: 500-block batches, 20 batches, 8 concurrent headers) with a keyed RPC to track the head. Any single variable can still be overridden. Probe numbers and reasoning: [ARCHITECTURE.md §3](ARCHITECTURE.md#3-profiles-throughput-and-start-block).

```bash
export HAHAWEEK_PROFILE=fast
export HAHAWEEK_RPC_URL='https://<your keyed Robinhood Chain RPC>'
export HAHAWEEK_START_BLOCK=59281988   # optional backfill start, only used with no cursor
node src/runner.js
```

### Mode window-watch (`HAHAWEEK_MODE=window`) — penjelasan sederhana

Rantai Robinhood membuat ~9,6 blok per detik. RPC publik gratis tidak sanggup kalau kita mengambil **semua** blok. Mode window-watch bekerja dalam dua tahap:

1. **Cari pool baru (murah).** Setiap pass meminta log `Initialize` saja dari PoolManager Uniswap v4, dalam potongan besar (100.000 blok sekali minta, maksimal 1 juta blok per pass). Bagian ini **tidak bolong**: semua blok dicek. Kalau RPC menjawab "terlalu banyak log", potongan dibagi dua lalu dicoba lagi.
2. **Ambil detail (lengkap).** Untuk tiap pool baru (maksimal 60 terbaru per pass), HAHAWEEK mengambil penuh **5 blok** mulai dari blok pembuatan pool (Initialize, tambah likuiditas, swap), ditambah **200 blok terbaru**. Dari sampel, 89% pool sudah dapat likuiditas/swap pertama di blok pembuatannya.

Yang jujur perlu diketahui:

- Blok di antara jendela-jendela itu **dilewati**. Setiap lompatan dicatat sebagai *gap* (`WINDOW_SKIPPED`) **sebelum** jendela berikutnya diproses. Hasil analisis yang menyentuh gap ditandai `PARTIAL`/`UNKNOWN`, tidak pernah `COMPLETE`.
- Setiap jendela tetap lewat jalur yang sama: header + hash induk dicek, lalu gerbang otoritas; kursor baru maju setelah `AUTHORIZED`. Jendela setelah gap memulai garis keturunan (*lineage*) baru (`INITIAL`), jadi tidak ada klaim "bersambung" melewati gap.
- Data disimpan per **epoch** (folder). Epoch baru dibuat setiap 24 jam atau 150 MB, 1 epoch lama disimpan, yang lebih lama dihapus utuh. Tidak pernah dirotasi saat ada STOP.
- Pool di luar batas 60 per pass, atau yang datang saat pass gagal, **tidak** diambil detailnya (dihitung sebagai `dropped`).

Jalankan satu pass:

```bash
HAHAWEEK_MODE=window node src/pass.js
```

Atau terus-menerus (loop, berhenti sendiri saat STOP/exit 78):

```bash
HAHAWEEK_MODE=window node src/watch.js
```

Mode default tetap `contiguous` (profil `free`/`fast` seperti sebelumnya). Detail teknis dan angka: [ARCHITECTURE.md §3b](ARCHITECTURE.md#3b-window-watch-mode-hahaweek_modewindow).

### Free runtime: GitHub Actions (no computer, no VPS)

`.github/workflows/ingest-scheduled.yml` runs one free-profile **window-watch** pass (`HAHAWEEK_MODE=window`) every 30 minutes (minutes 7 and 37) and on demand: every new pool since the last pass is found, up to 60 of the newest get their first 5 blocks fully ingested, plus the newest 200 blocks. Public repo, so runner minutes are free; no secrets are used. **It becomes active only after it is merged to `main`** (GitHub runs schedules from the default branch only).

- State (`data/`) is kept in the GitHub Actions cache between runs, not in git. See [ARCHITECTURE.md §3a](ARCHITECTURE.md#3a-free-runtime-github-actions-schedule).
- Run now from the phone: GitHub app or browser → repo → **Actions** → *HAHAWEEK Scheduled Ingestion (free)* → **Run workflow**.
- New-pool latency is one schedule interval (up to ~30 min plus GitHub's delay). More than ~60 new pools in 30 minutes means the oldest of them are not ingested in detail (counted as `dropped`); a Termux loop avoids that.
- If a run ends in a fail-closed STOP, later runs stay stopped (exit 78) until you run it manually with **resume_after_stop** ticked, after reading the log.

### Termux (Android) option

Copy-paste into Termux. Wi-Fi recommended.

```bash
pkg update -y && pkg install -y nodejs-lts git
git clone https://github.com/littlepxyek-crypto/HAHAWEEK.git
cd HAHAWEEK
npm ci --omit=dev
```

**Window-watch (recommended on a phone).** Finds every new pool and fully ingests 5 blocks after it plus the newest blocks; skipped ranges are recorded as gaps. One pass:

```bash
HAHAWEEK_MODE=window node src/pass.js
```

Loop: a new pass every 2 minutes, newest 100 blocks per pass (lighter on quota: ~0.3 GB download per day, data on disk stays ≤ ~300 MB because old epochs are deleted). It stops by itself on a fail-closed STOP (exit 78). Press Ctrl+C to end.

```bash
termux-wake-lock 2>/dev/null
HAHAWEEK_MODE=window HAHAWEEK_LOOP_SLEEP_MS=120000 HAHAWEEK_WINDOW_LATEST_BLOCKS=100 node src/watch.js
termux-wake-unlock 2>/dev/null
```

A new pool shows up within ~2–2.5 minutes this way. After a STOP: read the log, then `HAHAWEEK_MODE=window node src/pass.js --resume-after-stop`.

**Contiguous (every block, falls behind the head).** One pass of 200 blocks, then a light loop every 15 minutes:

```bash
HAHAWEEK_PROFILE=free HAHAWEEK_MAX_BATCHES_PER_RUN=2 node src/pass.js
termux-wake-lock 2>/dev/null
while true; do
  HAHAWEEK_PROFILE=free HAHAWEEK_MAX_BATCHES_PER_RUN=2 node src/pass.js
  [ $? -eq 78 ] && echo "STOP: check the log above" && break
  sleep 900
done
termux-wake-unlock 2>/dev/null
```

Do not point both modes at the same `./data` folder: window mode keeps its evidence in `./data/epochs/`, contiguous mode in `./data/` itself.

Check progress any time: `node src/status.js` (contiguous) or `cat data/window/discovery-ledger.json` (window). Data lives in `./data` inside the `HAHAWEEK` folder.

Docker: `docker compose -f deploy/docker-compose.yml up -d` (requires `RPC_URL`; defaults to the `fast` profile). The container runs `src/runner.js` and stays idle instead of restarting after a fail-closed STOP.

---

## Design Principles

```text
FREE-FIRST
EVIDENCE-FIRST
NO DATA LOSS
NO OVERWRITE OF RAW HISTORY
NO SKIPPED LAYER
NO SIGNAL WITHOUT EVIDENCE
NO PREDICTIVE SCORE WITHOUT VALIDATION
ONE EVIDENCE CHAIN, MULTIPLE OUTPUTS
```

---

## Project Status

HAHAWEEK is an active research and engineering project.

Current status is intentionally conservative:

```text
RPC ingestion (raw → canonical)   LIVE
V4 / F-03 authority gate          LIVE (runs on every batch)
Formation → report                IMPLEMENTED, NOT WIRED (CI scripts only)
Radar / X content output          IMPLEMENTED, NOT WIRED; nothing published
INTERNET / WALLET sources         PLANNED
Production host deployment        NOT RECORDED
Automated Trading                 NOT PART OF THE FOUNDATION
```

---

## License

See the repository license and individual project artifacts for applicable terms.
