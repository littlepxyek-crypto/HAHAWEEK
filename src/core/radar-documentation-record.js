'use strict';
const crypto = require('node:crypto');
const SCHEMA_VERSION='1'; const RULE_VERSION='radar-documentation-record-v1';
function obj(v,n){if(!v||typeof v!=='object'||Array.isArray(v)) throw new TypeError(n.toUpperCase()+'_REQUIRED');}
function str(v,n){if(typeof v!=='string'||!v.length) throw new TypeError(n.toUpperCase()+'_REQUIRED');}
function createRadarDocumentationRecord(input){obj(input,'input'); obj(input.document,'document'); const d=input.document;
for(const f of ['document_id','document_type','radar_id','radar_type','state','validation_result']) str(d[f],f);
if(d.document_type!=='VERIFIED_RADAR_RECORD') throw new TypeError('DOCUMENT_TYPE_INVALID');
if(d.state!=='VERIFIED') throw new TypeError('DOCUMENT_STATE_INVALID');
obj(d.lineage,'lineage'); for(const f of ['summary_id','intelligence_id','formation_id','outcome_id','validation_id']) str(d.lineage[f],'lineage_'+f);
if(!Array.isArray(d.evidence_ids)||!d.evidence_ids.length) throw new TypeError('EVIDENCE_IDS_REQUIRED');
const ids=[...d.evidence_ids], seen=new Set(); for(const id of ids){str(id,'evidence_id'); if(seen.has(id)) throw new TypeError('EVIDENCE_IDS_DUPLICATE'); seen.add(id);}
const rule=input.rule_version??RULE_VERSION; str(rule,'rule_version');
const identity={schema_version:SCHEMA_VERSION,rule_version:rule,document_id:d.document_id,document_type:d.document_type,radar_id:d.radar_id,radar_type:d.radar_type,state:d.state,validation_result:d.validation_result,lineage:d.lineage,evidence_ids:[...ids].sort()};
const record_id='radar-document-record:v1:'+crypto.createHash('sha256').update(JSON.stringify(identity)).digest('hex');
return structuredClone({schema_version:SCHEMA_VERSION,record_id,rule_version:rule,document_id:d.document_id,document_type:d.document_type,radar_id:d.radar_id,radar_type:d.radar_type,state:d.state,validation_result:d.validation_result,lineage:d.lineage,evidence_ids:ids,interpretation_boundary:'This record preserves a verified historical documentation state and is not a prediction or future-performance guarantee.'});}
module.exports={SCHEMA_VERSION,RULE_VERSION,createRadarDocumentationRecord};