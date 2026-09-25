"use strict";
const test=require("node:test");
const assert=require("node:assert/strict");
const path=require("node:path");
const {validateTransition,transitionHash,verifyChain,classifyTransitionDuplicate,verifyVectorFile}=require("../scripts/verify-v4-transition-independent");
const vectors=require("../docs/golden-vectors/transition.json");
const fixture=path.join(__dirname,"..","docs","golden-vectors","transition.json");

test("independent verifier validates all transition golden vectors",()=>assert.equal(verifyVectorFile(fixture),vectors.vectors.length));
test("valid transition chain is contiguous and state-consistent",()=>{
  const chain=vectors.vectors.slice(0,2).map(v=>v.input_object);
  const result=verifyChain(chain);
  assert.equal(result.state,"ORPHANED");
  assert.equal(result.last_sequence,"1");
  for(const v of vectors.vectors.slice(0,2)) assert.equal(transitionHash(v.input_object),v.expected_hash);
});
const cases=[
  ["missing key",t=>{delete t.to_state;}],
  ["unknown key",t=>{t.extra="x";}],
  ["leading zero",t=>{t.sequence="01";}],
  ["overflow",t=>{t.sequence="18446744073709551616";}],
  ["bad evidence hash",t=>{t.evidence_id="0x1";}],
  ["first predecessor",t=>{t.previous_transition_hash="0x"+"0".repeat(64);}],
  ["first sequence",t=>{t.sequence="1";}],
  ["wrong first state",t=>{t.from_state="CANONICAL";}],
  ["illegal edge",t=>{t.to_state="ORPHANED";}],
  ["wrong type",t=>{t.sequence=0;}]
];
for(const [name,mutate] of cases)test("rejects "+name,()=>{
  const t={...vectors.vectors[0].input_object}; mutate(t); assert.throws(()=>validateTransition(t));
});
test("rejects sequence gap",()=>{
  const chain=vectors.vectors.slice(0,2).map(v=>({...v.input_object}));
  chain[1].sequence="2"; assert.throws(()=>verifyChain(chain));
});
test("rejects predecessor mutation",()=>{
  const chain=vectors.vectors.slice(0,2).map(v=>({...v.input_object}));
  chain[1].previous_transition_hash="0x"+"1".repeat(64); assert.throws(()=>verifyChain(chain));
});
test("rejects forked state edge",()=>{
  const chain=[{...vectors.vectors[0].input_object},{...vectors.vectors[1].input_object,to_state:"CANONICAL"}];
  assert.throws(()=>verifyChain(chain));
});
test("rejects wrong vector domain",()=>{
  const fs=require("node:fs");
  const tmp=path.join(require("node:os").tmpdir(),"hahaweek-transition-domain-test.json");
  const set=JSON.parse(fs.readFileSync(fixture,"utf8"));
  set.vectors[0].domain="WRONG-DOMAIN";
  fs.writeFileSync(tmp,JSON.stringify(set));
  try { assert.throws(()=>verifyVectorFile(tmp)); } finally { fs.unlinkSync(tmp); }
});
const first=vectors.vectors[0];
const existing={input:first.input_object,hash:first.expected_hash};
test("classifies identical transition as idempotent",()=>{
  assert.equal(classifyTransitionDuplicate(existing,{input:{...first.input_object},hash:first.expected_hash}),"IDEMPOTENT");
});
test("classifies different transition input as not duplicate",()=>{
  const candidate={input:{...first.input_object,sequence:"1"},hash:first.expected_hash};
  assert.equal(classifyTransitionDuplicate(existing,candidate),"NOT_DUPLICATE");
});
test("classifies same input with different digest as integrity conflict",()=>{
  const candidate={input:{...first.input_object},hash:"0x"+"1".repeat(64)};
  assert.equal(classifyTransitionDuplicate(existing,candidate),"INTEGRITY_CONFLICT");
});
