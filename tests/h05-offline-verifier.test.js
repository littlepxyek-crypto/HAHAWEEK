"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");
const { verifyRecoveryFixture } = require("../scripts/verify-v4-offline");

const fixture = path.join(__dirname, "..", "docs", "golden-vectors", "checkpoint-cursor-recovery.json");

test("H-05 offline verifier validates the complete recovery fixture without network access", () => {
  const result = verifyRecoveryFixture(fixture);
  assert.equal(result.count, 12);
  assert.ok(result.results.every(item => item.pass));
});

test("H-05 rejects tampered checkpoint authority", () => {
  const tampered = {
    protocol: "HAHAWEEK-V4-CHECKPOINT-CURSOR-RECOVERY-V0.1",
    version: "0.1",
    vectors: [{
      id: "tampered",
      kind: "checkpoint",
      input: { generation: "0", manifest_hash: "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa" },
      manifest: { exists: true, hash: "0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb", generation: "0", inventory_valid: true, segments_valid: true },
      expected: "CHECKPOINT_VALID"
    }]
  };
  const file = require("node:fs").mkdtempSync(require("node:os").tmpdir() + "/hahaweek-h05-");
  const p = path.join(file, "tampered.json");
  require("node:fs").writeFileSync(p, JSON.stringify(tampered));
  assert.throws(() => verifyRecoveryFixture(p), /OFFLINE_VECTOR_MISMATCH/);
});

test("H-05 rejects cursor ahead of checkpoint", () => {
  const tampered = {
    protocol: "HAHAWEEK-V4-CHECKPOINT-CURSOR-RECOVERY-V0.1",
    version: "0.1",
    vectors: [{
      id: "ahead",
      kind: "cursor",
      checkpoint: { hash: "0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb", generation: "7" },
      input: { generation: "8", checkpoint_hash: "0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb", position: "42" },
      expected: "CURSOR_VALID"
    }]
  };
  const dir = require("node:fs").mkdtempSync(require("node:os").tmpdir() + "/hahaweek-h05-");
  const p = path.join(dir, "ahead.json");
  require("node:fs").writeFileSync(p, JSON.stringify(tampered));
  assert.throws(() => verifyRecoveryFixture(p), /OFFLINE_VECTOR_MISMATCH/);
});
