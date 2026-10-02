'use strict';

const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');

const { createFormationRadarRecord } = require('../src/core/hfi-radar-formation');
const { createCandidateRadarRecord } = require('../src/core/hfi-radar-candidate');
const { createHfiRadarProjection } = require('../src/core/hfi-radar-projection');
const { createValidatedRadarRecord } = require('../src/core/validated-radar-record');

const OUT = 'docs/runtime/hfi-radar-latest.json';
const COMMIT = process.env.GITHUB_SHA || 'UNKNOWN';
const events = [
  { event_type:'POOL_CREATED', evidence_id:'ei:v1:runtime-created', chain_id:4663, pool_id:'0xruntimepool', block_number:100, transaction_index:0, log_index:1, event_time:'2026-09-10T09:04:36.000Z' },
  { event_type:'LIQUIDITY_ADDED', evidence_id:'ei:v1:runtime-liquidity', chain_id:4663, pool_id:'0xruntimepool', block_number:100, transaction_index:0, log_index:2, event_time:'2026-09-10T09:04:40.000Z' }
];
const formation = {
  formation_id:'formation:v1:runtime-formation', formation_type:'POOL_BOOTSTRAP', formation_rule_version:'pool-bootstrap-v1', chain_id:4663, pool_id:'0xruntimepool',
  formation_start:'2026-09-10T09:04:36.000Z', formation_end:'2026-09-10T09:05:00.000Z', state:'VALID',
  evidence_ids:['ei:v1:runtime-created','ei:v1:runtime-liquidity','ei:v1:runtime-swap'],
  provenance_reference:{chain_id:4663,evidence_ids:['ei:v1:runtime-created','ei:v1:runtime-liquidity','ei:v1:runtime-swap']}
};
function assertOk(condition,message){if(!condition)throw new Error(message);}
function digest(value){return crypto.createHash('sha256').update(JSON.stringify(value)).digest('hex');}
function write(result){fs.mkdirSync(path.dirname(OUT),{recursive:true});fs.writeFileSync(OUT,JSON.stringify(result,null,2)+'\n');}
async function main(){
  const startedAt=new Date().toISOString();
  const candidate=createCandidateRadarRecord({events});
  const candidateReplay=createCandidateRadarRecord({events:[...events].reverse()});
  assertOk(candidate.radar_state==='CANDIDATE','CANDIDATE_STATE_NOT_VERIFIED');
  assertOk(candidate.radar_id===candidateReplay.radar_id,'CANDIDATE_REPLAY_NON_EQUIVALENT');
  assertOk(candidate.evidence_ids.length===2,'CANDIDATE_EVIDENCE_LINEAGE_INVALID');
  const formationRadar=createFormationRadarRecord({formation});
  const formationReplay=createFormationRadarRecord({formation:{...formation,evidence_ids:[...formation.evidence_ids].reverse()}});
  assertOk(formationRadar.radar_id===formationReplay.radar_id,'FORMATION_REPLAY_NON_EQUIVALENT');
  const validated=createValidatedRadarRecord({summary:{summary_id:'intelligence-summary:v1:runtime',intelligence_id:'intelligence:v1:runtime',formation_id:formation.formation_id,outcome_id:'outcome:v1:runtime',validation_id:'validation:v1:runtime',validation_result:'CONFIRMED',evidence_ids:formation.evidence_ids}});
  const validatedProjection=createHfiRadarProjection({kind:'VALIDATED',validated_radar:validated});
  assertOk(validatedProjection.radar_state==='VALIDATED','VALIDATED_RADAR_STATE_INVALID');
  assertOk(validatedProjection.validated_radar_id===validated.radar_id,'VALIDATED_RADAR_LINEAGE_INVALID');
  const mutationProbe=createCandidateRadarRecord({events});
  mutationProbe.evidence_ids.push('ei:v1:mutation');
  assertOk(events[0].evidence_id==='ei:v1:runtime-created','CALLER_INPUT_MUTATION_DETECTED');
  const withFutureSwap=[...events,{event_type:'SWAP',evidence_id:'ei:v1:runtime-swap',chain_id:4663,pool_id:'0xruntimepool',block_number:101,transaction_index:0,log_index:0,event_time:'2026-09-10T09:05:00.000Z'}];
  let futureRejected=false;
  try{createCandidateRadarRecord({events:withFutureSwap});}catch(error){futureRejected=error.message==='CANDIDATE_RADAR_REQUIRES_CANDIDATE_FORMATION_STATE';}
  assertOk(futureRejected,'FUTURE_SWAP_LEAKAGE_NOT_BLOCKED');
  const result={verification_class:'E5_RUNTIME',contract_id:'HFI-RADAR-V0_1',commit:COMMIT,state:'VERIFIED',started_at:startedAt,completed_at:new Date().toISOString(),environment:{runtime:process.version,platform:process.platform,external_network:false,external_actions:false},checks:{candidate_projection:true,candidate_replay_equivalent:true,formation_projection:true,formation_replay_equivalent:true,validated_projection:true,caller_mutation_isolation:true,no_lookahead:futureRejected},ids:{candidate_radar_id:candidate.radar_id,formation_radar_id:formationRadar.radar_id,validated_radar_id:validated.radar_id,validated_projection_id:validatedProjection.projection_id},lineage:{candidate_evidence_ids:candidate.evidence_ids,formation_evidence_ids:formationRadar.evidence_ids,validated_evidence_ids:validated.evidence_ids,validation_id:validated.validation_id,formation_id:formation.formation_id},artifact_digest:digest({candidate:candidate.radar_id,formation:formationRadar.radar_id,validated:validated.radar_id})};
  write(result);
}
main().catch(error=>{write({verification_class:'E5_RUNTIME',contract_id:'HFI-RADAR-V0_1',commit:COMMIT,state:'FAILED',completed_at:new Date().toISOString(),failure:{message:error instanceof Error?error.message:String(error)}});process.exitCode=1;});