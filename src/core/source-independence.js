'use strict';

const CONTRACT_VERSION = 'SOURCE-INDEPENDENCE-EXECUTION-V1';
const CLASSES = Object.freeze(['I0','I1','I2','I3','I4']);

function object(value, field) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error(field.toUpperCase() + '_REQUIRED');
  return value;
}
function source(line, index) {
  object(line, 'source_' + index);
  for (const key of ['source_id','source_lineage_id','acquisition_id']) {
    if (typeof line[key] !== 'string' || !line[key]) throw new Error(key.toUpperCase() + '_REQUIRED');
  }
}
function classifySourceRelationship(a,b) {
  source(a,0); source(b,1);
  if (a.source_lineage_id === b.source_lineage_id) return 'I1';
  if (a.independence_class === 'I2' || b.independence_class === 'I2') return 'I2';
  if (a.independence_class === 'I4' && b.independence_class === 'I4' &&
      a.direct_independence_proof === true && b.direct_independence_proof === true) return 'I4';
  if (a.independence_class === 'I3' && b.independence_class === 'I3') return 'I3';
  if (a.independence_class === 'I4' && b.independence_class === 'I4') return 'I3';
  return 'I0';
}
function assertIndependentEvidence(lines, minimumClass='I3') {
  if (!Array.isArray(lines) || lines.length < 2) throw new Error('INDEPENDENT_EVIDENCE_REQUIRED');
  lines.forEach(source);
  const acceptable = minimumClass === 'I4' ? new Set(['I4']) : new Set(['I3','I4']);
  for (let i=0;i<lines.length;i++) {
    for (let j=i+1;j<lines.length;j++) {
      const cls=classifySourceRelationship(lines[i],lines[j]);
      if (acceptable.has(cls)) return Object.freeze({independent:true,class:cls,pair:[lines[i].source_id,lines[j].source_id]});
    }
  }
  throw new Error('INDEPENDENT_SOURCE_THRESHOLD_NOT_MET');
}

function createAcquisitionEvidenceLine({ acquisitionResult, source: sourceDefinition }) {
  object(acquisitionResult, 'acquisition_result');
  object(sourceDefinition, 'source');
  if (acquisitionResult.status !== 'OBSERVED') {
    throw new Error('SOURCE_INDEPENDENCE_ACQUISITION_NOT_OBSERVED');
  }
  if (acquisitionResult.source_id !== sourceDefinition.source_id) {
    throw new Error('SOURCE_INDEPENDENCE_SOURCE_ID_MISMATCH');
  }
  const provenance = sourceDefinition.provenance;
  object(provenance, 'source_provenance');
  const line = {
    source_id: acquisitionResult.source_id,
    source_lineage_id: provenance.source_lineage_id,
    acquisition_id: acquisitionResult.acquisition_id,
    independence_class: provenance.independence_class,
    direct_independence_proof: provenance.direct_independence_proof === true,
  };
  source(line, 0);
  return Object.freeze({
    ...line,
    independence_class: line.independence_class || 'I0',
    content_hash: acquisitionResult.content_hash,
    observed_at: acquisitionResult.completed_at,
  });
}

module.exports={CONTRACT_VERSION,CLASSES,classifySourceRelationship,assertIndependentEvidence,createAcquisitionEvidenceLine};
