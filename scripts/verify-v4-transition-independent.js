"use strict";

const fs = require("node:fs");
const crypto = require("node:crypto");
const path = require("node:path");

const KEYS = ["evidence_id","from_state","previous_transition_hash","sequence","to_state"];
const STATES = new Set(["OBSERVED","CANONICAL","ORPHANED"]);
const UINT64_MAX = 18446744073709551615n;
const UINT64_RE = /^(0|[1-9][0-9]*)$/;
const HASH_RE = /^0x[0-9a-f]{64}$/;
const DOMAIN = "HAHAWEEK-EVIDENCE-V4-TRANSITION";

function fail(message){ throw new Error(message); }
function exactKeys(obj){
  if (!obj || typeof obj !== "object" || Array.isArray(obj)) fail("transition must be an object");
  const actual=Object.keys(obj).sort(), expected=[...KEYS].sort();
  if (JSON.stringify(actual)!==JSON.stringify(expected)) fail("transition has wrong key set");
}
function validateTransition(t){
  exactKeys(t);
  if (typeof t.evidence_id!=="string" || !HASH_RE.test(t.evidence_id)) fail("evidence_id invalid");
  if (typeof t.previous_transition_hash!=="string" && t.previous_transition_hash!==null) fail("previous_transition_hash invalid type");
  if (t.previous_transition_hash!==null && !HASH_RE.test(t.previous_transition_hash)) fail("previous_transition_hash invalid");
  if (typeof t.sequence!=="string" || !UINT64_RE.test(t.sequence)) fail("sequence non-canonical");
  if (BigInt(t.sequence)>UINT64_MAX) fail("sequence overflow");
  if (typeof t.from_state!=="string" || !STATES.has(t.from_state)) fail("from_state invalid");
  if (typeof t.to_state!=="string" || !STATES.has(t.to_state)) fail("to_state invalid");
  if (t.from_state==="OBSERVED" && t.to_state!=="CANONICAL") fail("illegal state edge");
  if (t.from_state==="CANONICAL" && t.to_state!=="ORPHANED") fail("illegal state edge");
  if (t.from_state==="ORPHANED") fail("ORPHANED is terminal");
}
function canonical(t){
  validateTransition(t);
  const ordered={};
  for(const k of Object.keys(t).sort()) ordered[k]=t[k];
  return JSON.stringify(ordered);
}
function transitionHash(t){
  const bytes=Buffer.from(canonical(t),"utf8");
  return "0x"+crypto.createHash("sha256").update(Buffer.concat([Buffer.from(DOMAIN,"utf8"),Buffer.from([0]),bytes])).digest("hex");
}
function verifyChain(transitions){
  if(!Array.isArray(transitions)||!transitions.length) fail("empty transition chain");
  let expectedSeq=0n, previousHash=null, previousState=null;
  for(let i=0;i<transitions.length;i++){
    const t=transitions[i]; validateTransition(t);
    const seq=BigInt(t.sequence);
    if(seq!==expectedSeq) fail("sequence is not contiguous");
    if(i===0){
      if(t.previous_transition_hash!==null) fail("first predecessor must be null");
      if(t.from_state!=="OBSERVED") fail("first from_state must be OBSERVED");
    } else {
      if(t.previous_transition_hash!==previousHash) fail("predecessor mismatch");
      if(t.from_state!==previousState) fail("state continuity mismatch");
    }
    const digest=transitionHash(t);
    if(t.expected_transition_hash && t.expected_transition_hash!==digest) fail("transition hash mismatch");
    previousHash=digest; previousState=t.to_state; expectedSeq++;
  }
  return {state:previousState,last_sequence:(expectedSeq-1n).toString(),last_hash:previousHash};
}
function classifyTransitionDuplicate(existing,candidate){
  validateTransition(existing.input);
  validateTransition(candidate.input);
  if(typeof existing.hash!=="string" || !HASH_RE.test(existing.hash)) fail("existing transition hash invalid");
  if(typeof candidate.hash!=="string" || !HASH_RE.test(candidate.hash)) fail("candidate transition hash invalid");
  if(existing.hash!==transitionHash(existing.input)) fail("existing transition hash mismatch");
  if(canonical(existing.input)!==canonical(candidate.input)) return "NOT_DUPLICATE";
  if(existing.hash===candidate.hash) return "IDEMPOTENT";
  return "INTEGRITY_CONFLICT";
}
function verifyVectorFile(filePath){
  const set=JSON.parse(fs.readFileSync(filePath,"utf8"));
  if(set.protocol!=="HAHAWEEK-EVIDENCE-V4") fail("invalid vector metadata");
  if(!Array.isArray(set.vectors)||!set.vectors.length) fail("empty vector set");
  for(const v of set.vectors){
    if(v.domain!==DOMAIN) fail(v.vector_id+": invalid vector domain");
    const bytes=Buffer.from(canonical(v.input_object),"utf8").toString("hex");
    if(bytes!==v.canonical_utf8_hex) fail(v.vector_id+": canonical bytes mismatch");
    if(transitionHash(v.input_object)!==v.expected_hash) fail(v.vector_id+": hash mismatch");
  }
  return set.vectors.length;
}
if(require.main===module){
  const file=process.argv[2]||path.join(__dirname,"..","docs","golden-vectors","transition.json");
  process.stdout.write("independently verified "+verifyVectorFile(file)+" transition vector(s)\n");
}
module.exports={validateTransition,canonical,transitionHash,verifyChain,classifyTransitionDuplicate,verifyVectorFile};
