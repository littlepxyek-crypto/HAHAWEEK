'use strict';

const EVIDENCE_CLASS = 'DERIVED';
const SCHEMA_VERSION = '1';
const FORMATION_STATE = 'VALID';

function fail(message) { throw new TypeError(message); }
function requiredObject(value, field) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) fail(`formation evidence reference requires ${field}`);
}
function nonEmptyString(value, field) {
  if (typeof value !== 'string' || value.length === 0) fail(`formation evidence reference requires non-empty ${field}`);
}
function uniqueStrings(values, field) {
  if (!Array.isArray(values) || values.length === 0) fail(`formation evidence reference requires ${field}`);
  const seen = new Set();
  for (const value of values) {
    nonEmptyString(value, field);
    if (seen.has(value)) fail(`formation evidence reference requires unique ${field}`);
    seen.add(value);
  }
}
function createFormationEvidenceReference(formation) {
  requiredObject(formation, 'formation');
  if (formation.state !== FORMATION_STATE) fail('formation evidence reference requires VALID formation');
  nonEmptyString(formation.formation_id, 'formation_id');
  nonEmptyString(formation.formation_type, 'formation_type');
  nonEmptyString(formation.formation_rule_version, 'formation_rule_version');
  if (!Number.isSafeInteger(formation.chain_id) || formation.chain_id <= 0) fail('formation evidence reference requires valid chain_id');
  nonEmptyString(formation.pool_id, 'pool_id');
  uniqueStrings(formation.evidence_ids, 'evidence_ids');
  if (!Array.isArray(formation.event_order) || formation.event_order.length === 0) fail('formation evidence reference requires event_order');
  const evidenceSet = new Set(formation.evidence_ids);
  const eventEvidenceIds = new Set();
  for (const event of formation.event_order) {
    requiredObject(event, 'event_order entry');
    nonEmptyString(event.event_type, 'event_order.event_type');
    nonEmptyString(event.evidence_id, 'event_order.evidence_id');
    if (eventEvidenceIds.has(event.evidence_id)) fail('formation evidence reference requires unique event_order evidence IDs');
    eventEvidenceIds.add(event.evidence_id);
    if (!evidenceSet.has(event.evidence_id)) fail('formation evidence reference event evidence ID is not selected');
    for (const field of ['block_number', 'transaction_index', 'log_index']) {
      if (!Number.isSafeInteger(event[field]) || event[field] < 0) fail(`formation evidence reference requires valid event_order.${field}`);
    }
  }
  if (eventEvidenceIds.size !== evidenceSet.size) fail('formation evidence reference event/evidence coverage mismatch');
  requiredObject(formation.graph_reference, 'graph_reference');
  if (formation.graph_reference.node_type !== 'FORMATION' || formation.graph_reference.node_id !== formation.formation_id) fail('formation evidence reference graph_reference mismatch');
  requiredObject(formation.provenance_reference, 'provenance_reference');
  if (formation.provenance_reference.chain_id !== formation.chain_id) fail('formation evidence reference provenance chain mismatch');
  if (JSON.stringify(formation.provenance_reference.evidence_ids) !== JSON.stringify(formation.evidence_ids)) fail('formation evidence reference provenance evidence mismatch');
  return structuredClone({
    schema_version: SCHEMA_VERSION,
    evidence_class: EVIDENCE_CLASS,
    formation_id: formation.formation_id,
    formation_type: formation.formation_type,
    formation_rule_version: formation.formation_rule_version,
    chain_id: formation.chain_id,
    pool_id: formation.pool_id,
    evidence_ids: formation.evidence_ids,
    event_order: formation.event_order,
    graph_reference: formation.graph_reference,
    provenance_reference: formation.provenance_reference,
  });
}

module.exports = { EVIDENCE_CLASS, SCHEMA_VERSION, createFormationEvidenceReference };
