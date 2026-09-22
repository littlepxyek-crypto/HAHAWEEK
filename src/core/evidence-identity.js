"use strict";

const crypto = require("node:crypto");
const { canonicalUtf8 } = require("../reference/v4/jcs");

const IDENTITY_SCHEMA_VERSION = "1";
const IDENTITY_DOMAIN = "HAHAWEEK-EVIDENCE-IDENTITY-V1";
const RAW_HASH_DOMAIN = "HAHAWEEK-EVIDENCE-RAW-V1";
const CANONICAL_HASH_DOMAIN = "HAHAWEEK-EVIDENCE-CANONICAL-V1";
const HEX32_RE = /^0x[0-9a-f]{64}$/;
const ADDRESS20_RE = /^0x[0-9a-f]{40}$/;

function fail(message) {
  throw new TypeError(message);
}

function uintString(value, field) {
  if (!Number.isSafeInteger(value) || value < 0) {
    fail(`${field} must be a non-negative safe integer`);
  }
  return String(value);
}

function canonicalHex(value, field, pattern) {
  if (typeof value !== "string" || !pattern.test(value)) {
    fail(`${field} must be canonical lowercase hexadecimal`);
  }
  return value;
}

function requireCanonicalEvidence(evidence) {
  if (!evidence || typeof evidence !== "object" || Array.isArray(evidence)) {
    fail("canonical evidence must be an object");
  }
  if (evidence.evidence_type !== "RAW_LOG") {
    fail("canonical evidence must be RAW_LOG");
  }
  if (!Number.isSafeInteger(evidence.chain_id) || evidence.chain_id < 0) {
    fail("chain_id must be a non-negative safe integer");
  }

  const location = evidence.location;
  if (!location || typeof location !== "object" || Array.isArray(location)) {
    fail("canonical evidence location is required");
  }
  if (location.block_hash == null) fail("block_hash is required for evidence identity");
  if (location.transaction_index == null) {
    fail("transaction_index is required for evidence identity");
  }

  canonicalHex(location.block_hash, "block_hash", HEX32_RE);
  canonicalHex(location.transaction_hash, "transaction_hash", HEX32_RE);
  canonicalHex(evidence.contract_address, "contract_address", ADDRESS20_RE);

  return evidence;
}

function createIdentityPayload(evidence) {
  requireCanonicalEvidence(evidence);
  const location = evidence.location;

  return {
    block_hash: location.block_hash,
    block_number: uintString(location.block_number, "block_number"),
    chain_id: uintString(evidence.chain_id, "chain_id"),
    contract_address: evidence.contract_address,
    log_index: uintString(location.log_index, "log_index"),
    transaction_hash: location.transaction_hash,
    transaction_index: uintString(location.transaction_index, "transaction_index"),
  };
}

function sha256Domain(domain, value) {
  const bytes = canonicalUtf8(value);
  const preimage = Buffer.concat([
    Buffer.from(domain, "utf8"),
    Buffer.from([0x00]),
    bytes,
  ]);
  return crypto.createHash("sha256").update(preimage).digest("hex");
}

function createEvidenceIdentity(evidence) {
  const identity_payload = createIdentityPayload(evidence);
  const identity_hash = sha256Domain(IDENTITY_DOMAIN, identity_payload);

  return {
    evidence_id: `ei:v${IDENTITY_SCHEMA_VERSION}:${identity_hash}`,
    identity_schema_version: IDENTITY_SCHEMA_VERSION,
    identity_domain: IDENTITY_DOMAIN,
    identity_payload,
    identity_hash,
  };
}

function hashRawEvidence(raw) {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    fail("raw evidence must be an object");
  }
  return sha256Domain(RAW_HASH_DOMAIN, raw);
}

function hashCanonicalEvidence(evidence) {
  requireCanonicalEvidence(evidence);
  return sha256Domain(CANONICAL_HASH_DOMAIN, evidence);
}

module.exports = {
  IDENTITY_SCHEMA_VERSION,
  IDENTITY_DOMAIN,
  RAW_HASH_DOMAIN,
  CANONICAL_HASH_DOMAIN,
  createIdentityPayload,
  createEvidenceIdentity,
  hashRawEvidence,
  hashCanonicalEvidence,
};
