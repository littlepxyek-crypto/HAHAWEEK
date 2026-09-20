'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { expectedCheckpointHash, expectedCursorHash, assertCheckpointAuthority, assertCursorAuthority, assertRecoveryAuthority, authorizeCursorAdvance } = require('../src/core/v4-checkpoint-authority');
const MANIFEST_HASH = '0x' + 'a'.repeat(64);
function validFixture() {
  const checkpointInput = { generation: '7', manifest_hash: MANIFEST_HASH };
  const checkpointHash = expectedCheckpointHash(checkpointInput);
  const cursorInput = { generation: '6', checkpoint_hash: checkpointHash, position: '100' };
  return { manifest: { exists: true, hash: MANIFEST_HASH, generation: '7', inventory_valid: true, segments_valid: true }, checkpoint: { input: checkpointInput, hash: checkpointHash }, cursor: { input: cursorInput, hash: expectedCursorHash(cursorInput) } };
}
test('V4 production integration boundary accepts valid authority chain', () => { const fixture = validFixture(); assert.equal(assertRecoveryAuthority({ ...fixture, acquisitionPositionValid: true }), true); assert.deepEqual(authorizeCursorAdvance({ ...fixture, currentCursor: 100, targetPosition: 101, acquisitionPositionValid: true }), { authorized: true, position: '101', checkpointHash: fixture.checkpoint.hash, generation: '6' }); });
test('V4 production integration boundary rejects checkpoint hash mutation', () => { const fixture = validFixture(); fixture.checkpoint.hash = '0x' + 'b'.repeat(64); assert.throws(() => assertCheckpointAuthority(fixture.checkpoint, fixture.manifest), /CHECKPOINT_AUTHORITY_INVALID/); });
test('V4 production integration boundary rejects cursor hash mutation', () => { const fixture = validFixture(); fixture.cursor.hash = '0x' + 'c'.repeat(64); assert.throws(() => assertCursorAuthority(fixture.cursor, fixture.checkpoint), /CURSOR_AUTHORITY_INVALID/); });
test('V4 production integration boundary fails closed on manifest mismatch', () => { const fixture = validFixture(); fixture.manifest.hash = '0x' + 'c'.repeat(64); assert.throws(() => authorizeCursorAdvance({ ...fixture, currentCursor: 100, targetPosition: 101, acquisitionPositionValid: true }), /CHECKPOINT_AUTHORITY_INVALID/); });
test('V4 production integration boundary rejects cursor regression', () => { const fixture = validFixture(); assert.throws(() => authorizeCursorAdvance({ ...fixture, currentCursor: 100, targetPosition: 99, acquisitionPositionValid: true }), /BLOCK_CURSOR_REGRESSION/); });
test('V4 production integration boundary rejects invalid acquisition position', () => { const fixture = validFixture(); assert.throws(() => assertRecoveryAuthority({ ...fixture, acquisitionPositionValid: false }), /RECOVERY_AUTHORITY_INVALID/); });
test('V4 production integration boundary rejects cursor ahead of checkpoint generation', () => { const fixture = validFixture(); fixture.cursor.input.generation = '8'; fixture.cursor.hash = expectedCursorHash(fixture.cursor.input); assert.throws(() => assertCursorAuthority(fixture.cursor, fixture.checkpoint), /CURSOR_AUTHORITY_INVALID/); });