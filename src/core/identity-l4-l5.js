'use strict';

const CONTRACT_VERSION = 'IDENTITY-L4-L5-EXECUTABLE-V1';
const LEVELS = Object.freeze(['L0','L1','L2','L3','L4','L5']);

function requiredObject(value, field) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error(field.toUpperCase() + '_REQUIRED');
  return value;
}
function requireRelation(relation) {
  if (typeof relation !== 'string' || !relation) throw new Error('RELATION_REQUIRED');
  return relation;
}
function validateEvidenceLine(line, index) {
  requiredObject(line, 'evidence_line_' + index);
  if (typeof line.source_lineage_id !== 'string' || !line.source_lineage_id) throw new Error('SOURCE_LINEAGE_ID_REQUIRED');
  if (typeof line.source_id !== 'string' || !line.source_id) throw new Error('SOURCE_ID_REQUIRED');
  if (typeof line.acquisition_id !== 'string' || !line.acquisition_id) throw new Error('ACQUISITION_ID_REQUIRED');
  if (typeof line.relation !== 'string' || !line.relation) throw new Error('EVIDENCE_RELATION_REQUIRED');
  if (line.first_seen !== undefined && !Number.isFinite(Date.parse(line.first_seen))) throw new Error('FIRST_SEEN_INVALID');
  return true;
}
function assertNoDirectContradiction(lines) {
  const relations = new Map();
  for (const line of lines) {
    const key = line.relation;
    const polarity = line.polarity === undefined ? 'UNSPECIFIED' : String(line.polarity);
    if (!relations.has(key)) relations.set(key, new Set());
    relations.get(key).add(polarity);
  }
  for (const values of relations.values()) {
    if (values.has('SUPPORT') && values.has('CONTRADICT')) throw new Error('IDENTITY_DIRECT_CONTRADICTION');
  }
}
function assertL4(input) {
  requiredObject(input, 'input');
  const relation = requireRelation(input.relation);
  const lines = Array.isArray(input.evidence_lines) ? input.evidence_lines : [];
  if (lines.length < 2) throw new Error('L4_INDEPENDENT_EVIDENCE_REQUIRED');
  lines.forEach(validateEvidenceLine);
  if (!input.falsifier || typeof input.falsifier !== 'object') throw new Error('L4_FALSIFIER_REQUIRED');
  const matching = lines.filter(line => line.relation === relation);
  if (matching.length < 2) throw new Error('L4_RELATION_CORROBORATION_REQUIRED');
  const lineages = new Set(matching.map(line => line.source_lineage_id));
  if (lineages.size < 2) throw new Error('L4_INDEPENDENT_LINEAGES_REQUIRED');
  if (matching.some(line => line.temporally_compatible !== true)) throw new Error('L4_TEMPORAL_COMPATIBILITY_REQUIRED');
  if (matching.some(line => line.direct_contradiction === true)) throw new Error('L4_DIRECT_CONTRADICTION');
  assertNoDirectContradiction(matching);
  return Object.freeze({ level:'L4', relation, evidence_count:matching.length, independent_lineages:lineages.size });
}
function assertL5(input) {
  requiredObject(input, 'input');
  const relation = requireRelation(input.relation);
  if (input.direct_proof !== true) throw new Error('L5_DIRECT_PROOF_REQUIRED');
  if (input.proof_type !== 'CRYPTOGRAPHIC_OR_DIRECT_CONTROL') throw new Error('L5_PROOF_TYPE_INVALID');
  if (input.proof_relation !== relation) throw new Error('L5_RELATION_SCOPE_MISMATCH');
  if (input.temporally_compatible !== true) throw new Error('L5_TEMPORAL_COMPATIBILITY_REQUIRED');
  if (input.provenance_complete !== true) throw new Error('L5_PROVENANCE_REQUIRED');
  return Object.freeze({ level:'L5', relation, proof_type:input.proof_type });
}
function evaluate(input) {
  requiredObject(input, 'input');
  if (!LEVELS.includes(input.level)) throw new Error('IDENTITY_LEVEL_INVALID');
  if (input.level === 'L4') return assertL4(input);
  if (input.level === 'L5') return assertL5(input);
  return Object.freeze({ level:input.level, relation:input.relation || null });
}
module.exports = { CONTRACT_VERSION, LEVELS, assertL4, assertL5, evaluate };
