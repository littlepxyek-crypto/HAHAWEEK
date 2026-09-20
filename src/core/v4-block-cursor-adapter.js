'use strict';

const { assertAuthorityRecord, createAuthorityRecord } = require('./v4-authority-record');
const { expectedCursorHash, assertRecoveryAuthority } = require('./v4-checkpoint-authority');
const { loadCurrentCursor, insertAuthorityAndCursorInTransaction } = require('./v4-cursor-store');
const { assertCursorTransition } = require('./v4-cursor-transition');

class V4BlockCursorAdapter {
  constructor({ database, authorityRecord, authorityContext }) {
    if (!database || !database.db) throw new Error('V4_DATABASE_REQUIRED');
    assertAuthorityRecord(authorityRecord);

    if (!authorityContext || !authorityContext.manifest || !authorityContext.checkpoint) {
      throw new Error('V4_AUTHORITY_CONTEXT_REQUIRED');
    }

    assertRecoveryAuthority({
      manifest: authorityContext.manifest,
      checkpoint: authorityContext.checkpoint,
      cursor: { input: authorityRecord.cursor_input, hash: authorityRecord.cursor_hash },
      acquisitionPositionValid: authorityRecord.acquisition_position_valid,
    });

    if (
      authorityContext.manifest.hash !== authorityRecord.manifest_hash ||
      authorityContext.checkpoint.hash !== authorityRecord.checkpoint_hash
    ) {
      throw new Error('V4_AUTHORITY_RECORD_MISMATCH');
    }

    this.database = database;
    this.authorityRecord = authorityRecord;
    this.authorityContext = authorityContext;
    this.current = loadCurrentCursor(database);

    if (this.current && this.current.authority_record_id !== authorityRecord.record_id) {
      throw new Error('V4_AUTHORITY_RECORD_MISMATCH');
    }
  }

  get() {
    return this.current ? Number(this.current.position) : Number(this.authorityRecord.cursor_input.position);
  }

  buildNext(blockNumber) {
    if (!Number.isInteger(blockNumber) || blockNumber < 0) throw new Error('INVALID_BLOCK_NUMBER');

    assertRecoveryAuthority({
      manifest: this.authorityContext.manifest,
      checkpoint: this.authorityContext.checkpoint,
      cursor: { input: this.authorityRecord.cursor_input, hash: this.authorityRecord.cursor_hash },
      acquisitionPositionValid: this.authorityRecord.acquisition_position_valid,
    });

    const current = this.current || {
      generation: this.authorityRecord.cursor_input.generation,
      position: this.authorityRecord.cursor_input.position,
      checkpoint_hash: this.authorityRecord.checkpoint_hash,
      cursor_hash: this.authorityRecord.cursor_hash,
      authority_record_id: this.authorityRecord.record_id,
    };

    const decision = assertCursorTransition({
      currentCursor: current,
      targetPosition: blockNumber,
      checkpointGeneration: this.authorityRecord.checkpoint_input.generation,
      checkpointHash: this.authorityRecord.checkpoint_hash,
    });

    if (decision.idempotent) return { record: this.authorityRecord, idempotent: true };

    const cursorInput = {
      generation: current.generation,
      checkpoint_hash: this.authorityRecord.checkpoint_hash,
      position: String(blockNumber),
    };

    return {
      record: createAuthorityRecord({
        manifestGeneration: this.authorityRecord.manifest_generation,
        manifestHash: this.authorityRecord.manifest_hash,
        checkpointInput: this.authorityRecord.checkpoint_input,
        checkpointHash: this.authorityRecord.checkpoint_hash,
        cursorInput,
        cursorHash: expectedCursorHash(cursorInput),
        acquisitionPositionValid: this.authorityRecord.acquisition_position_valid,
      }),
      idempotent: false,
    };
  }

  advanceInTransaction(blockNumber) {
    const next = this.buildNext(blockNumber);
    if (next.idempotent) return blockNumber;
    insertAuthorityAndCursorInTransaction(this.database, next.record, blockNumber);
    this.authorityRecord = next.record;
    this.current = loadCurrentCursor(this.database);
    return blockNumber;
  }

  advance(blockNumber) {
    return this.database.transaction(() => this.advanceInTransaction(blockNumber));
  }
}

module.exports = { V4BlockCursorAdapter };
