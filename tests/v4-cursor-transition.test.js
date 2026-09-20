'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { assertCursorTransition } = require('../src/core/v4-cursor-transition');

const current = { generation:'7', position:'101', checkpoint_hash:'0x'+'b'.repeat(64), cursor_hash:'0x'+'c'.repeat(64), authority_record_id:'record-1' };

test('V4 cursor transition authorizes monotonic advance', () => {
  const result = assertCursorTransition({ currentCursor: current, targetPosition: 102, checkpointGeneration:'7', checkpointHash:current.checkpoint_hash });
  assert.deepEqual(result, { authorized:true, idempotent:false, currentPosition:'101', targetPosition:'102' });
});

test('V4 cursor transition treats equal position as idempotent', () => {
  const result = assertCursorTransition({ currentCursor: current, targetPosition: 101, checkpointGeneration:'7', checkpointHash:current.checkpoint_hash });
  assert.equal(result.idempotent, true);
});

test('V4 cursor transition rejects regression', () => {
  assert.throws(() => assertCursorTransition({ currentCursor: current, targetPosition:100, checkpointGeneration:'7', checkpointHash:current.checkpoint_hash }), /BLOCK_CURSOR_REGRESSION/);
});

test('V4 cursor transition rejects checkpoint mismatch', () => {
  assert.throws(() => assertCursorTransition({ currentCursor: current, targetPosition:102, checkpointGeneration:'7', checkpointHash:'0x'+'d'.repeat(64) }), /CURSOR_CHECKPOINT_MISMATCH/);
});

test('V4 cursor transition rejects cursor ahead of checkpoint generation', () => {
  assert.throws(() => assertCursorTransition({ currentCursor: current, targetPosition:102, checkpointGeneration:'6', checkpointHash:current.checkpoint_hash }), /CURSOR_AHEAD_OF_CHECKPOINT/);
});

test('V4 cursor transition rejects malformed state', () => {
  assert.throws(() => assertCursorTransition({ currentCursor:{...current, position:'01'}, targetPosition:102, checkpointGeneration:'7', checkpointHash:current.checkpoint_hash }), /CURSOR_STATE_INVALID/);
});