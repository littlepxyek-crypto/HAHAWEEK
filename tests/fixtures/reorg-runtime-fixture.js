"use strict";

/**
 * F-02B executable reorg boundary fixture.
 *
 * This is a provider-independent test harness. It models the persistence
 * boundary that production reorg handling must satisfy without changing
 * production ingestion or V4 authority.
 */

class ReorgFixture {
  constructor() {
    this.evidence = new Map();
    this.transitions = [];
    this.cursor = null;
    this.committed = false;
  }

  observe(evidence) {
    if (this.evidence.has(evidence.id)) {
      const existing = this.evidence.get(evidence.id);
      if (existing.digest !== evidence.digest) {
        throw new Error("INTEGRITY_CONFLICT");
      }
      return "IDEMPOTENT";
    }

    this.evidence.set(evidence.id, {
      ...evidence,
      state: "OBSERVED",
    });
    this.transitions.push({
      evidence_id: evidence.id,
      from: "OBSERVED",
      to: "CANONICAL",
    });
    this.evidence.get(evidence.id).state = "CANONICAL";
    return "INSERTED";
  }

  orphan(evidenceId, replacementId) {
    const current = this.evidence.get(evidenceId);
    if (!current) throw new Error("EVIDENCE_NOT_FOUND");
    if (current.state !== "CANONICAL") {
      throw new Error("INVALID_REORG_STATE");
    }

    current.state = "ORPHANED";
    this.transitions.push({
      evidence_id: evidenceId,
      from: "CANONICAL",
      to: "ORPHANED",
      replacement_id: replacementId,
    });
  }

  commitCursor(block) {
    if (!Number.isInteger(block) || block < 0) {
      throw new Error("INVALID_BLOCK");
    }
    this.cursor = block;
    this.committed = true;
  }

  snapshot() {
    return {
      cursor: this.cursor,
      evidence: [...this.evidence.values()].map((item) => ({ ...item })),
      transitions: this.transitions.map((item) => ({ ...item })),
    };
  }

  restore(snapshot) {
    this.cursor = snapshot.cursor;
    this.evidence = new Map(
      snapshot.evidence.map((item) => [item.id, { ...item }]),
    );
    this.transitions = snapshot.transitions.map((item) => ({ ...item }));
    this.committed = true;
  }
}

module.exports = { ReorgFixture };
