'use strict';

const { assertAuthorityRecord } = require('./v4-authority-record');
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

  get() { return this.current ? Number(this.current.position) : null; }

  advance(blockNumber) {
    if (!Number.isInteger(blockNumber) || blockNumber < 0) throw new Error('INVALID_BLOCK_NUMBER');
    const current = this.current || { generation: this.authorityRecord.cursor_input.generation, position: this.authorityRecord.cursor_input.position, checkpoint_hash: this.authorityRecord.checkpoint_hash, cursor_hash: this.authorityRecord.cursor_hash, authority_record_id: this.authorityRecord.record_id };
    const decision = assertCursorTransition({ currentCursor: current, targetPosition: blockNumber, checkpointGeneration: this.authorityRecord.checkpoint_input.generation, checkpointHash: this.authorityRecord.checkpoint_hash });
    if (decision.idempotent) return blockNumber;
    persistAuthorityAndCursor(this.database, this.authorityRecord, blockNumber);
    this.current = loadCurrentCursor(this.database);
    return blockNumber;
  }
}

module.exports = { V4BlockCursorAdapter };