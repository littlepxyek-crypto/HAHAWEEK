'use strict';

const crypto = require('node:crypto');

const SOCIAL_SNAPSHOT_SCHEMA_VERSION = '1';
const SOCIAL_SNAPSHOT_RULE_VERSION = 'social-snapshot-provenance-v1';
const ORIGIN_KINDS = Object.freeze(['EXTERNAL', 'HAHAWEEK_PUBLICATION']);

function requireObject(value, name) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error(name.toUpperCase() + '_REQUIRED');
  }
}

function requireString(value, name) {
  if (typeof value !== 'string' || value.length === 0) {
    throw new Error(name.toUpperCase() + '_REQUIRED');
  }
}

function requireTimestamp(value, name) {
  requireString(value, name);
  if (Number.isNaN(Date.parse(value))) throw new Error('INVALID_' + name.toUpperCase());
}

function canonicalize(input) {
  requireObject(input, 'input');
  for (const field of ['snapshot_id','content_id','source_id','source_type','acquisition_id','publisher','digest','derivation_method']) {
    requireString(input[field], field);
  }
  requireTimestamp(input.first_seen, 'first_seen');
  requireTimestamp(input.captured_at, 'captured_at');
  requireObject(input.temporal_scope, 'temporal_scope');
  requireString(input.origin_kind, 'origin_kind');
  if (!ORIGIN_KINDS.includes(input.origin_kind)) throw new Error('SOCIAL_ORIGIN_KIND_INVALID');
  if (input.parent_source_id !== undefined && input.parent_source_id !== null) requireString(input.parent_source_id, 'parent_source_id');
  return {
    schema_version: SOCIAL_SNAPSHOT_SCHEMA_VERSION,
    rule_version: SOCIAL_SNAPSHOT_RULE_VERSION,
    snapshot_id: input.snapshot_id,
    content_id: input.content_id,
    source_id: input.source_id,
    source_type: input.source_type,
    parent_source_id: input.parent_source_id ?? null,
    acquisition_id: input.acquisition_id,
    publisher: input.publisher,
    first_seen: input.first_seen,
    captured_at: input.captured_at,
    digest: input.digest,
    derivation_method: input.derivation_method,
    temporal_scope: structuredClone(input.temporal_scope),
    origin_kind: input.origin_kind,
  };
}

function createSocialSnapshotProvenance(input) {
  const canonical = canonicalize(input);
  const snapshotIdentity = crypto.createHash('sha256').update(JSON.stringify(canonical)).digest('hex');
  return Object.freeze({
    ...canonical,
    snapshot_identity: 'social-snapshot:v1:' + snapshotIdentity,
    independence: canonical.origin_kind === 'HAHAWEEK_PUBLICATION'
      ? 'NOT_INDEPENDENT_EXTERNAL_SOURCE'
      : 'UNCLASSIFIED_PENDING_SOURCE_INDEPENDENCE',
  });
}

module.exports = { SOCIAL_SNAPSHOT_SCHEMA_VERSION, SOCIAL_SNAPSHOT_RULE_VERSION, ORIGIN_KINDS, createSocialSnapshotProvenance };