'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');

const {
  discoverFormationEvent,
} = require('../src/core/pool-formation');

const fixture = require('./fixtures/initialize-live.json');

test('pool formation connects discovery to formation event', () => {
  const event = discoverFormationEvent(fixture);

  assert.equal(event.eventType, 'POOL_INITIALIZED');
  assert.equal(event.stage, 'FORMATION');
  assert.equal(event.chainId, 4663);
  assert.ok(event.poolId);
});

test('pool formation preserves blockchain provenance', () => {
  const event = discoverFormationEvent(fixture);

  assert.equal(event.blockNumber, fixture.blockNumber);

  assert.equal(
    event.transactionHash,
    fixture.transactionHash.toLowerCase()
  );

  assert.equal(event.logIndex, fixture.index);
});

test('pool formation preserves pool identity', () => {
  const event = discoverFormationEvent(fixture);

  assert.ok(event.identity);
  assert.ok(event.identity.canonicalId);

  assert.equal(
    event.identity.canonicalId,
    `4663:${event.poolId}`
  );
});

test('pool formation is deterministic', () => {
  const a = discoverFormationEvent(fixture);
  const b = discoverFormationEvent(fixture);

  assert.deepEqual(a, b);
});
