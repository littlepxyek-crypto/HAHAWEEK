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
module.exports={CONTRACT_VERSION,CLASSES,classifySourceRelationship,assertIndependentEvidence};
