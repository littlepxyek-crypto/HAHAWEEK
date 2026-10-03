'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');

const {
  QUERY_OPERATIONS,
  capabilities,
} = require('../src/query/evidence-query-contract');
const {
  createReadOnlyQueryService,
} = require('../src/query/read-only-query-service');

function fakeStatement(row = null, rows = []) {
  let index = 0;
  return {
    bind() {},
    step() {
      if (index < rows.length) {
        index += 1;
        return true;
      }
      return false;
    },
    getAsObject() {
      if (rows.length) return rows[index - 1];
      return row || {};
    },
    free() {},
  };
}

function fakeDatabase() {
  const calls = [];
  const db = {
    prepare(sql) {
      calls.push(sql);
      assert.match(sql.trim(), /^(SELECT|PRAGMA|EXPLAIN)\b/i);
      if (sql.includes('FROM canonical_evidence')) {
        return fakeStatement({
          evidence_id: 'e1',
          identity_schema_version: '1',
          identity_hash: 'ih1',
          raw_event_id: 'r1',
          raw_hash: 'rh1',
          canonical_hash: 'ch1',
          canonical_json: JSON.stringify({
            evidence_type: 'RAW_LOG',
            event_time: '2026-10-03T00:00:00.000Z',
          }),
          interpretation_status: 'OBSERVED',
          provenance_json: JSON.stringify({
            acquisition_id: 'a1',
            source_id: 'rpc-1',
            source_lineage_id: 'lineage-1',
          }),
          stored_at: '2026-10-03T00:01:00.000Z',
          chain_id: 4663,
          block_number: 10,
          transaction_hash: '0xtx',
          block_hash: '0xblock',
          transaction_index: 0,
          log_index: 0,
          address: '0xpool',
          captured_at: '2026-10-03T00:00:01.000Z',
        });
      }
      return fakeStatement(null, []);
    },
  };
  return { db, calls };
}

test('EQC exposes read-only capabilities and no write surface', () => {
  const caps = capabilities();
  assert.equal(caps.mode, 'READ_ONLY');
  assert.equal(caps.authority_write, false);
  assert.equal(caps.arbitrary_sql, false);
  assert.ok(caps.supported_operations.includes('get_evidence'));
});

test('read-only query service reads evidence through fixed SELECT only', () => {
  const database = fakeDatabase();
  const service = createReadOnlyQueryService(database);
  const result = service.execute(QUERY_OPERATIONS.GET_EVIDENCE, { evidence_id: 'e1' });

  assert.equal(result.status, 'COMPLETE');
  assert.equal(result.data.evidence_id, 'e1');
  assert.equal(result.data.location.chain_id, 4663);
  assert.equal(result.evidence_refs[0].evidence_id, 'e1');
  assert.equal(database.calls.length, 1);
  assert.match(database.calls[0].trim(), /^SELECT\b/i);
});

test('service rejects unimplemented and unsupported operations', () => {
  const service = createReadOnlyQueryService(fakeDatabase());

  assert.throws(
    () => service.execute(QUERY_OPERATIONS.GET_GRAPH_CONTEXT, {}),
    /QUERY_OPERATION_NOT_IMPLEMENTED/
  );

  assert.throws(
    () => service.execute('write_evidence', {}),
    /QUERY_OPERATION_UNSUPPORTED/
  );
});

test('service has no database mutation method', () => {
  const service = createReadOnlyQueryService(fakeDatabase());
  assert.equal(typeof service.run, 'undefined');
  assert.equal(typeof service.write, 'undefined');
  assert.equal(typeof service.save, 'undefined');
  assert.equal(typeof service.mutate, 'undefined');
});


test('EQC resource boundary rejects oversized block ranges', () => {
  const service = createReadOnlyQueryService(fakeDatabase());
  assert.throws(() => service.execute(QUERY_OPERATIONS.GET_WALLET_ACTIVITY, {
    chain_id: 4663, address: '0xwallet', start_block: 1, end_block: 100002,
  }), /BLOCK_RANGE_TOO_LARGE/);
});

test('EQC transaction query is bounded and reports PARTIAL when limit is exceeded', () => {
  const calls = [];
  const rows = Array.from({ length: 1001 }, (_, i) => ({ event_id: 'e' + i, chain_id: 4663, block_number: 1, transaction_hash: '0xtx', block_hash: '0xb', transaction_index: 0, log_index: i, address: '0xa', topics_json: '[]', data: '0x', captured_at: '2026-10-03T00:00:00.000Z', evidence_id: 'ev' + i, identity_hash: 'ih' + i, canonical_hash: 'ch' + i }));
  const db = { prepare(sql) { calls.push(sql); return fakeStatement(null, rows); } };
  const service = createReadOnlyQueryService({ db });
  const result = service.execute(QUERY_OPERATIONS.GET_TRANSACTION_CONTEXT, { chain_id: 4663, transaction_hash: '0xtx' });
  assert.equal(result.status, 'PARTIAL');
  assert.equal(result.data.events.length, 1000);
  assert.match(calls[0], /LIMIT 1001/);
});


test('EQC as-of query reconstructs canonicality from transitions at or before the requested time', () => {
  const db = {
    prepare(sql) {
      if (sql.includes('FROM canonical_evidence')) {
        return fakeStatement({
          evidence_id: 'e1', identity_schema_version: '1', identity_hash: 'ih1',
          raw_event_id: 'r1', raw_hash: 'rh1', canonical_hash: 'ch1',
          canonical_json: JSON.stringify({ evidence_type: 'RAW_LOG', event_time: '2026-10-03T00:00:00.000Z' }),
          interpretation_status: 'OBSERVED',
          provenance_json: JSON.stringify({ acquisition_id: 'a1', source_id: 'rpc-1', source_lineage_id: 'lineage-1' }),
          stored_at: '2026-10-03T00:01:00.000Z', chain_id: 4663, block_number: 10,
          transaction_hash: '0xtx', block_hash: '0xblock', transaction_index: 0, log_index: 0,
          address: '0xpool', captured_at: '2026-10-03T00:00:01.000Z',
        });
      }
      if (sql.includes('FROM canonical_transitions')) {
        return fakeStatement({
          to_state: 'CANONICAL',
          committed_at: '2026-10-03T00:02:00.000Z',
          sequence: '1',
          transition_hash: 'h1',
        });
      }
      return fakeStatement(null, []);
    },
  };
  const service = createReadOnlyQueryService({ db });
  const result = service.execute(QUERY_OPERATIONS.GET_EVIDENCE, {
    evidence_id: 'e1',
    temporal: { as_of: '2026-10-03T00:03:00.000Z' },
  });
  assert.equal(result.status, 'COMPLETE');
  assert.equal(result.data.temporal.canonicality, 'CANONICAL');
  assert.equal(result.data.temporal.as_of, '2026-10-03T00:03:00.000Z');
  assert.equal(result.consistency.canonicality, 'CANONICAL');
});

test('EQC as-of query excludes transitions after the requested time', () => {
  const db = {
    prepare(sql) {
      if (sql.includes('FROM canonical_evidence')) {
        return fakeStatement({
          evidence_id: 'e1', identity_schema_version: '1', identity_hash: 'ih1',
          raw_event_id: 'r1', raw_hash: 'rh1', canonical_hash: 'ch1',
          canonical_json: '{}', interpretation_status: 'OBSERVED',
          provenance_json: '{}', stored_at: '2026-10-03T00:01:00.000Z',
          chain_id: 4663, block_number: 10, transaction_hash: '0xtx', block_hash: '0xb',
          transaction_index: 0, log_index: 0, address: '0xpool', captured_at: '2026-10-03T00:00:01.000Z',
        });
      }
      if (sql.includes('FROM canonical_transitions')) return fakeStatement(null, []);
      return fakeStatement(null, []);
    },
  };
  const service = createReadOnlyQueryService({ db });
  const result = service.execute(QUERY_OPERATIONS.GET_EVIDENCE, {
    evidence_id: 'e1',
    temporal: { as_of: '2026-10-03T00:01:30.000Z' },
  });
  assert.equal(result.data.temporal.canonicality, 'UNKNOWN');
  assert.equal(result.consistency.canonicality, 'UNKNOWN');
});

test('EQC rejects invalid as-of timestamps', () => {
  const service = createReadOnlyQueryService({ db: fakeDatabase().db });
  assert.throws(() => service.execute(QUERY_OPERATIONS.GET_EVIDENCE, {
    evidence_id: 'e1',
    temporal: { as_of: 'not-a-time' },
  }), /AS_OF_INVALID/);
});
