'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const {CONTRACT_VERSION,classifySourceRelationship,assertIndependentEvidence}=require('../src/core/source-independence');
const base=(id,lineage,cls,assessed=false)=>({source_id:id,source_lineage_id:lineage,acquisition_id:'acq-'+id,independence_class:cls,independence_basis:assessed?'lineage-review-v1':null,independence_rule_version:assessed?'SOURCE-INDEPENDENCE-EXECUTION-V1.1':null,independence_assessed:assessed});
test('classifies same lineage as I1',()=>assert.equal(classifySourceRelationship(base('a','L','I3'),base('b','L','I3')),'I1'));
test('classifies explicit correlated sources as I2',()=>assert.equal(classifySourceRelationship(base('a','A','I2'),base('b','B','I3')),'I2'));
test('classifies two independent sources as I3',()=>assert.equal(classifySourceRelationship(base('a','A','I3',true),base('b','B','I3',true)),'I3'));
test('does not treat two unknown sources as independent',()=>assert.throws(()=>assertIndependentEvidence([base('a','A','I0'),base('b','B','I0')]),/INDEPENDENT_SOURCE_THRESHOLD_NOT_MET/));
test('does not treat source count as independence',()=>assert.throws(()=>assertIndependentEvidence([base('a','A','I3',true),base('b','A','I3',true),base('c','A','I3',true)]),/INDEPENDENT_SOURCE_THRESHOLD_NOT_MET/));
test('accepts directly independent proof for I4',()=>{const r=assertIndependentEvidence([{...base('a','A','I4'),direct_independence_proof:true},{...base('b','B','I4'),direct_independence_proof:true}],'I4'); assert.equal(r.class,'I4');});
test('does not accept I3 for an I4 threshold',()=>assert.throws(()=>assertIndependentEvidence([base('a','A','I3',true),base('b','B','I3',true)],'I4'),/INDEPENDENT_SOURCE_THRESHOLD_NOT_MET/));
test('pins the contract version',()=>assert.equal(CONTRACT_VERSION,'SOURCE-INDEPENDENCE-EXECUTION-V1.1'));

test('does not trust I3 declaration without auditable assessment',()=>assert.throws(()=>assertIndependentEvidence([base('a','A','I3'),base('b','B','I3')]),/INDEPENDENT_SOURCE_THRESHOLD_NOT_MET/));
