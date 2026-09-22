'use strict';

const EVIDENCE_CLASS = 'DERIVED';
const SCHEMA_VERSION = '1';

function fail(message) { throw new TypeError(message); }
function requiredObject(value, field) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) fail('derived evidence consumer requires ' + field);
}
function nonEmptyString(value, field) {
  if (typeof value !== 'string' || value.length === 0) fail('derived evidence consumer requires non-empty ' + field);
}
function uniqueStrings(values, field) {
  if (!Array.isArray(values) || values.length === 0) fail('derived evidence consumer requires ' + field);
  const seen = new Set();
  for (const value of values) {
    nonEmptyString(value, field);
    if (seen.has(value)) fail('derived evidence consumer requires unique ' + field);
    seen.add(value);
  }
}
function createDerivedEvidenceConsumerInput(reference) {
  requiredObject(reference, 'reference');
  if (reference.evidence_class !== EVIDENCE_CLASS) fail('derived evidence consumer accepts DERIVED evidence only');
  if (reference.schema_version !== '1') fail('derived evidence consumer requires schema_version 1');
  nonEmptyString(reference.formation_id, 'formation_id');
  nonEmptyString(reference.formation_type, 'formation_type');
  nonEmptyString(reference.formation_rule_version, 'formation_rule_version');
  if (!Number.isSafeInteger(reference.chain_id) || reference.chain_id <= 0) fail('derived evidence consumer requires valid chain_id');
  nonEmptyString(reference.pool_id, 'pool_id');
  uniqueStrings(reference.evidence_ids, 'evidence_ids');
  if (!Array.isArray(reference.event_order) || reference.event_order.length === 0) fail('derived evidence consumer requires event_order');

  const evidenceSet = new Set(reference.evidence_ids);
  const eventEvidenceIds = new Set();
  for (const event of reference.event_order) {
    requiredObject(event, 'event_order entry');
    nonEmptyString(event.event_type, 'event_order.event_type');
    nonEmptyString(event.evidence_id, 'event_order.evidence_id');
    if (eventEvidenceIds.has(event.evidence_id)) fail('derived evidence consumer requires unique event_order evidence IDs');
    if (!evidenceSet.has(event.evidence_id)) fail('derived evidence consumer event evidence ID is not selected');
    eventEvidenceIds.add(event.evidence_id);
    for (const field of ['block_number', 'transaction_index', 'log_index']) {
      if (!Number.isSafeInteger(event[field]) || event[field] < 0) fail('derived evidence consumer requires valid event_order.' + field);
    }
  }
  if (eventEvidenceIds.size !== evidenceSet.size) fail('derived evidence consumer event/evidence coverage mismatch');

  requiredObject(reference.graph_reference, 'graph_reference');
  if (reference.graph_reference.node_type !== 'FORMATION' || reference.graph_reference.node_id !== reference.formation_id) {
    fail('derived evidence consumer graph_reference mismatch');
  }
  requiredObject(reference.provenance_reference, 'provenance_reference');
  if (reference.provenance_reference.chain_id !== reference.chain_id) fail('derived evidence consumer provenance chain mismatch');
  if (JSON.stringify(reference.provenance_reference.evidence_ids) !== JSON.stringify(reference.evidence_ids)) {
    fail('derived evidence consumer provenance evidence mismatch');
  }

  return structuredClone({
    schema_version: SCHEMA_VERSION,
    evidence_class: EVIDENCE_CLASS,
    formation_id: reference.formation_id,
    formation_type: reference.formation_type,
    formation_rule_version: reference.formation_rule_version,
    chain_id: reference.chain_id,
    pool_id: reference.pool_id,
    evidence_ids: reference.evidence_ids,
    event_order: reference.event_order,
    graph_reference: reference.graph_reference,
    provenance_reference: reference.provenance_reference,
  });
}
module.exports = { EVIDENCE_CLASS, SCHEMA_VERSION, createDerivedEvidenceConsumerInput };
