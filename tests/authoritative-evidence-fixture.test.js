'use strict';

const assert = require('node:assert/strict');
const test = require('node:test');

const fixtures = require('./fixtures/authoritative-pool-bootstrap-fixtures.json');
const {
  AUTHORITY_CLASSES,
  replayAuthoritativeEvidence,
} = require('../src/core/authoritative-replay');
const {
  createAuthoritativeEvidenceEnvelope,
} = require('../src/core/authoritative-evidence');
const {
  detectPoolBootstrap,
} = require('../src/core/pool-bootstrap-formation');

function envelopeFromFixture(fixture) {
  return createAuthoritativeEvidenceEnvelope({
    schema_version: fixtures.schema_version,
    evidence_class: fixtures.fixture_class,
    chain_id: fixtures.chain_id,
    source: fixture.source,
    evidence_id: fixture.evidence_id,
    request: fixture.request,
    response_payload: fixture.response_payload,
    observation: fixture.observation,
    capture: fixture.capture,
    events: fixture.events,
  });
}

test('authoritative fixture family has deterministic metadata and provenance', () => {
  assert.equal(fixtures.schema_version, '1');
  assert.equal(fixtures.fixture_class, AUTHORITY_CLASSES.AUTHORITATIVE);
  assert.equal(fixtures.chain_id, 4663);
  assert.equal(fixtures.formation_type, 'POOL_BOOTSTRAP');
  assert.equal(fixtures.vectors.length, 3);

  for (const fixture of fixtures.vectors) {
    assert.ok(fixture.fixture_id);
    assert.ok(fixture.evidence_id);
    assert.ok(fixture.source);
    assert.ok(fixture.request.method);
    assert.ok(Object.hasOwn(fixture.request, 'params'));
    assert.ok(Object.hasOwn(fixture, 'response_payload'));
    assert.ok(Number.isInteger(fixture.observation.block_number));
    assert.ok(fixture.capture.captured_at);
    assert.ok(Array.isArray(fixture.events));
  }
});

test('authoritative fixtures replay through the frozen envelope and replay boundaries', () => {
  const expected = new Map([
    ['PB-AUTH-001', 'VALID'],
    ['PB-AUTH-002', 'CANDIDATE'],
    ['PB-AUTH-003', 'PARTIAL'],
  ]);

  for (const fixture of fixtures.vectors) {
    const input = envelopeFromFixture(fixture);
    const replay = replayAuthoritativeEvidence(input);
    const result = detectPoolBootstrap(replay.events);

    assert.equal(result.state, expected.get(fixture.fixture_id));
    assert.equal(replay.evidence_class, AUTHORITY_CLASSES.AUTHORITATIVE);
    assert.equal(replay.chain_id, 4663);
    assert.equal(replay.evidence_id, fixture.evidence_id);
  }
});

test('authoritative fixture replay preserves raw response and does not mutate input', () => {
  const fixture = fixtures.vectors[0];
  const rawInput = envelopeFromFixture(fixture);
  const before = structuredClone(rawInput);
  const replay = replayAuthoritativeEvidence(rawInput);

  assert.deepEqual(rawInput, before);
  assert.deepEqual(rawInput.response_payload, fixture.response_payload);
  assert.deepEqual(rawInput.request.params, fixture.request.params);
  assert.notStrictEqual(replay.events, rawInput.events);
});

test('identical authoritative fixture replays produce identical Formation IDs', () => {
  const fixture = fixtures.vectors[0];
  const a = detectPoolBootstrap(
    replayAuthoritativeEvidence(envelopeFromFixture(fixture)).events
  );
  const b = detectPoolBootstrap(
    replayAuthoritativeEvidence(envelopeFromFixture(fixture)).events
  );

  assert.equal(a.formation.formation_id, b.formation.formation_id);
});

test('fixture family is offline-only and exposes no production authority', () => {
  for (const fixture of fixtures.vectors) {
    const replay = replayAuthoritativeEvidence(envelopeFromFixture(fixture));
    assert.equal(Object.hasOwn(replay, 'cursor'), false);
    assert.equal(Object.hasOwn(replay, 'runtime_state'), false);
    assert.equal(Object.hasOwn(replay, 'raw_store'), false);
    assert.equal(Object.hasOwn(replay, 'v4_authority'), false);
  }
});
