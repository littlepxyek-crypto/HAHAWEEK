'use strict';

const { assertAuthorityRecord, createAuthorityRecord } = require('./v4-authority-record');
const { expectedCursorHash } = require('./v4-checkpoint-authority');
const { persistAuthorityAndCursor, loadCurrentCursor } = require('./v4-cursor-store');
const { assertCursorTransition } = require('./v4-cursor-transition');

class V4BlockCursorAdapter {
  constructor({ database, authorityRecord }) {
    if (!database || !database.db) throw new Error('V4_DATABASE_REQUIRED');
    assertAuthorityRecord(authorityRecord);
    this.database = database;
    this.authorityRecord = authorityRecord;
    this.current = loadCurrentCursor(database);
    if (this.current && this.current.authority_record_id !== authorityRecord.record_id) throw new Error('V4_AUTHORITY_RECORD_MISMATCH');
  }
  get() { return this.current ? Number(this.current.position) : Number(this.authorityRecord.cursor_input.position); }
  advance(blockNumber) {
    if (!Number.isInteger(blockNumber) || blockNumber < 0) throw new Error('INVALID_BLOCK_NUMBER');
    const current = this.current || { generation:this.authorityRecord.cursor_input.generation, position:this.authorityRecord.cursor_input.position, checkpoint_hash:this.authorityRecord.checkpoint_hash, cursor_hash:this.authorityRecord.cursor_hash, authority_record_id:this.authorityRecord.record_id };
    const decision = assertCursorTransition({ currentCursor:current, targetPosition:blockNumber, checkpointGeneration:this.authorityRecord.checkpoint_input.generation, checkpointHash:this.authorityRecord.checkpoint_hash });
    if (decision.idempotent) return blockNumber;
    const cursorInput = { generation: current.generation, checkpoint_hash: this.authorityRecord.checkpoint_hash, position: String(blockNumber) };
    const next = createAuthorityRecord({ manifestGeneration:this.authorityRecord.manifest_generation, manifestHash:this.authorityRecord.manifest_hash, checkpointInput:this.authorityRecord.checkpoint_input, checkpointHash:this.authorityRecord.checkpoint_hash, cursorInput, cursorHash:expectedCursorHash(cursorInput), acquisitionPositionValid:this.authorityRecord.acquisition_position_valid });
    persistAuthorityAndCursor(this.database, next, blockNumber);
    this.authorityRecord = next;
    this.current = loadCurrentCursor(this.database);
    return blockNumber;
  }
}

module.exports = { V4BlockCursorAdapter };