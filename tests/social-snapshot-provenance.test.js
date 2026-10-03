'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { createSocialSnapshotProvenance, SOCIAL_SNAPSHOT_RULE_VERSION } = require('../src/core/social-snapshot-provenance');

function input(overrides = {}) {
  return {
    snapshot_id: 'snapshot:v1:001', content_id: 'content:x:001', source_id: 'source:x:001', source_type: 'X',
    acquisition_id: 'acquisition:001', publisher: 'example-publisher',
    first_seen: '2026-10-03T08:00:00.000Z', captured_at: '2026-10-03T08:01:00.000Z',
    digest: 'sha256:content-001', derivation_method: 'direct_capture',
    temporal_scope: { observed_at: '2026-10-03T08:00:00.000Z', valid_from: '2026-10-03T08:00:00.000Z', valid_to: null },
    origin_kind: 'EXTERNAL', ...overrides,
  };
}

test('creates deterministic externally sourced snapshot provenance', () => {
  const a = createSocialSnapshotProvenance(input()); const b = createSocialSnapshotProvenance(input());
  assert.equal(a.rule_version, SOCIAL_SNAPSHOT_RULE_VERSION);
  assert.equal(a.snapshot_identity, b.snapshot_identity);
  assert.equal(a.independence, 'UNCLASSIFIED_PENDING_SOURCE_INDEPENDENCE');
});

test('preserves publication lineage and blocks automatic independence', () => {
  const result = createSocialSnapshotProvenance(input({ origin_kind: 'HAHAWEEK_PUBLICATION', source_id: 'source:hahaweek:publication', parent_source_id: 'source:x:001' }));
  assert.equal(result.origin_kind, 'HAHAWEEK_PUBLICATION');
  assert.equal(result.parent_source_id, 'source:x:001');
  assert.equal(result.independence, 'NOT_INDEPENDENT_EXTERNAL_SOURCE');
});

test('rejects invalid timestamps', () => { assert.throws(() => createSocialSnapshotProvenance(input({ captured_at: 'not-a-time' })), /INVALID_CAPTURED_AT/); });
test('rejects incomplete temporal scope', () => { assert.throws(() => createSocialSnapshotProvenance(input({ temporal_scope: null })), /TEMPORAL_SCOPE_REQUIRED/); });
test('rejects unknown origin kind', () => { assert.throws(() => createSocialSnapshotProvenance(input({ origin_kind: 'UNKNOWN' })), /SOCIAL_ORIGIN_KIND_INVALID/); });
test('rejects missing acquisition provenance', () => { assert.throws(() => createSocialSnapshotProvenance(input({ acquisition_id: undefined })), /ACQUISITION_ID_REQUIRED/); });

test('caller mutation does not change snapshot provenance', () => {
  const source = input(); const result = createSocialSnapshotProvenance(source);
  source.temporal_scope.observed_at = '2099-01-01T00:00:00.000Z';
  assert.equal(result.temporal_scope.observed_at, '2026-10-03T08:00:00.000Z');
});