'use strict';

const PHASES = Object.freeze(['CONTRACT','ANALYSIS','DESIGN','CODE','TEST','SECURITY/REGRESSION','CI','REVIEW','MERGE','VERIFICATION','RECONCILIATION','DOCUMENTATION']);
const ERRORS = Object.freeze({STEP_MISSING:'STATE_STEP_MISSING',CONTRACT_MISSING:'STATE_CONTRACT_MISSING',PHASE_MISSING:'STATE_PHASE_MISSING',NEXT_STEP_MISSING:'STATE_NEXT_STEP_MISSING',STEP_CONFLICT:'STATE_STEP_CONFLICT',PHASE_CONFLICT:'STATE_PHASE_CONFLICT',NEXT_STEP_CONFLICT:'STATE_NEXT_STEP_CONFLICT',MALFORMED:'STATE_MALFORMED'});

function fail(errors){return {valid:false,current_step:null,phase:null,status:null,contract:null,next_step:null,errors:[...new Set(errors)].sort()};}
function currentSection(text){const lines=String(text).split(/\r?\n/);const first=lines.findIndex(line=>/^## STEP \d+/.test(line.trim()));if(first<0)return '';const out=[];for(let i=first;i<lines.length;i+=1){if(i!==first&&/^## /.test(lines[i].trim()))break;out.push(lines[i]);}return out.join('\n');}
function validateLifecycleState(text){
 if(typeof text!=='string'||text.length===0)return fail([ERRORS.MALFORMED]);
 const current=currentSection(text); if(!current)return fail([ERRORS.STEP_MISSING]);
 const heading=current.split(/\r?\n/)[0]||'';
 const hm=heading.match(/^## STEP (\d+) — (.+?) — (CONTRACT|ANALYSIS|DESIGN|CODE|TEST|SECURITY\/REGRESSION|CI|REVIEW|MERGE|VERIFICATION|RECONCILIATION|DOCUMENTATION) — (.+)$/);
 if(!hm)return fail([ERRORS.MALFORMED]);
 const step=Number(hm[1]); const phase=hm[3]; const status=hm[4].trim();
 const stepHeaders=[...current.matchAll(/(?:^|\n)## STEP (\d+) —/g)]; if(stepHeaders.length!==1)return fail([ERRORS.STEP_CONFLICT]);
 const contracts=[...current.matchAll(/(?:^|\n)- Contract: `([^`]+)`/g)].map(m=>m[1].trim()); if(contracts.length===0)return fail([ERRORS.CONTRACT_MISSING]);
 const next=[...current.matchAll(/(?:^|\n)- \*\*Next authorized phase(?: after [^:]+)?: (STEP \d+ [^*.]+)\.*\*\*/g)].map(m=>m[1].trim());
 if(next.length===0&&!/\b(STOP|FAIL-CLOSED|BLOCKED|terminal|No new numbered STEP)\b/i.test(current))return fail([ERRORS.NEXT_STEP_MISSING]);
 if(new Set(next).size>1)return fail([ERRORS.NEXT_STEP_CONFLICT]);
 return {valid:true,current_step:step,phase,status,contract:contracts[0],next_step:next[0]||null,errors:[]};
}

module.exports={PHASES,ERRORS,validateLifecycleState};