'use strict';

const crypto = require('node:crypto');

function sha256Hex(value) {
  return crypto.createHash('sha256').update(value).digest('hex');
}

function canonical(value) {
  if (value === null || typeof value !== 'object') return JSON.stringify(value);
  if (Array.isArray(value)) return '[' + value.map(canonical).join(',') + ']';
  return '{' + Object.keys(value).sort().map(k => JSON.stringify(k) + ':' + canonical(value[k])).join(',') + '}';
}

function digestBytes(bytes) {
  return sha256Hex(Buffer.from(bytes, 'utf8'));
}

function fail(code, message) {
  const error = new Error(message);
  error.code = code;
  throw error;
}

function verifyScenario(input) {
  if (!input || input.format !== 'HAHAWEEK-F04-MIGRATION-SCENARIO-1') fail('MALFORMED_MANIFEST', 'invalid scenario format');
  if (!Array.isArray(input.sources) || !Array.isArray(input.units) || !Array.isArray(input.dispositions)) fail('MALFORMED_MANIFEST', 'missing arrays');
  if (!input.manifest || typeof input.manifest !== 'object') fail('MALFORMED_MANIFEST', 'missing manifest');

  const sources = new Map();
  for (const source of input.sources) {
    if (!source.id || !Number.isInteger(source.byte_count) || source.byte_count < 0 || typeof source.bytes !== 'string') fail('MALFORMED_SOURCE', 'invalid source');
    const digest = digestBytes(source.bytes);
    if (digest !== source.digest) fail('SOURCE_DIGEST_MISMATCH', source.id);
    if (sources.has(source.id)) fail('INTEGRITY_CONFLICT', source.id);
    sources.set(source.id, { ...source, digest });
  }

  const units = new Map();
  for (const unit of input.units) {
    if (!unit.id || !unit.source_id || typeof unit.bytes !== 'string' || !unit.digest) fail('MALFORMED_UNIT', 'invalid unit');
    if (!sources.has(unit.source_id)) fail('UNKNOWN_SOURCE', unit.source_id);
    const digest = digestBytes(unit.bytes);
    if (digest !== unit.digest) fail('SOURCE_UNIT_DIGEST_MISMATCH', unit.id);
    if (units.has(unit.id) && units.get(unit.id).digest !== digest) fail('INTEGRITY_CONFLICT', unit.id);
    units.set(unit.id, unit);
  }

  const dispositions = new Map();
  for (const d of input.dispositions) {
    if (!d.unit_id || !['MIGRATED', 'PRESERVED', 'REJECTED'].includes(d.type)) fail('AMBIGUOUS_DISPOSITION', d.unit_id || 'unknown');
    if (!units.has(d.unit_id)) fail('UNKNOWN_UNIT', d.unit_id);
    if (dispositions.has(d.unit_id)) fail('AMBIGUOUS_DISPOSITION', d.unit_id);
    dispositions.set(d.unit_id, d);
  }
  for (const id of units.keys()) if (!dispositions.has(id)) fail('MISSING_DISPOSITION', id);

  const results = new Map();
  for (const result of input.results || []) {
    if (!result.id || typeof result.bytes !== 'string' || !result.digest) fail('MALFORMED_RESULT', 'invalid result');
    const digest = digestBytes(result.bytes);
    if (digest !== result.digest) fail('RESULT_DIGEST_MISMATCH', result.id);
    if (results.has(result.id) && results.get(result.id).digest !== digest) fail('INTEGRITY_CONFLICT', result.id);
    results.set(result.id, result);
  }

  for (const d of dispositions.values()) {
    if (d.type !== 'MIGRATED') continue;
    if (!d.result_id || !results.has(d.result_id)) fail('MISSING_RESULT', d.unit_id);
    if (!d.provenance || d.provenance.source_unit_id !== d.unit_id) fail('BROKEN_PROVENANCE', d.unit_id);
  }

  const expectedBytes = [...sources.values()].reduce((n, s) => n + s.byte_count, 0);
  const accountedBytes = [...units.values()].reduce((n, u) => n + Buffer.byteLength(u.bytes, 'utf8'), 0);
  if (expectedBytes !== accountedBytes) fail('ACCOUNTING_MISMATCH', 'source/unit byte totals differ');

  const sourceManifest = [...sources.values()]
    .map(s => ({ id: s.id, digest: s.digest, byte_count: s.byte_count }))
    .sort((a, b) => a.id.localeCompare(b.id));
  if (input.manifest.source_digest !== sha256Hex(canonical(sourceManifest))) fail('MANIFEST_SOURCE_DIGEST_MISMATCH', 'manifest');
  if (input.manifest.unit_count !== units.size || input.manifest.disposition_count !== dispositions.size) fail('ACCOUNTING_MISMATCH', 'manifest counts');

  const replay = canonical({
    sources: sourceManifest,
    units: [...units.values()].map(u => ({ id: u.id, source_id: u.source_id, digest: u.digest })).sort((a, b) => a.id.localeCompare(b.id)),
    dispositions: [...dispositions.values()].sort((a, b) => a.unit_id.localeCompare(b.unit_id))
  });
  const verification_digest = sha256Hex(replay);
  if (input.manifest.verification_digest !== verification_digest) fail('NON_DETERMINISTIC_REPLAY', 'verification digest mismatch');

  return { status: 'VERIFIED', verification_digest, source_count: sources.size, unit_count: units.size, disposition_count: dispositions.size };
}

module.exports = { verifyScenario, sha256Hex, digestBytes, canonical };
