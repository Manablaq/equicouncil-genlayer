import test from 'node:test';
import assert from 'node:assert/strict';
import {validateCreate,validateTerms,canPerform,normalizeRecord} from '../src/validation.js';
test('create bound and preference',()=>{
  assert.deepEqual(validateCreate({title:'Critical project',units:'6',minimum:'1',maximum:'4',preference:'This service is required before the upcoming operational deadline.'}),['Critical project',6,1,4,'This service is required before the upcoming operational deadline.']);
  assert.throws(()=>validateCreate({title:'Bad',units:12,minimum:1,maximum:4,preference:'short'}));
});
test('terms enforce limits',()=>{
  assert.throws(()=>validateTerms(6,4,3,'Sufficiently long operational justification.'));
  assert.throws(()=>validateTerms(6,1,4,'short'));
});
test('step-8 is not ratified before finalize',()=>{
  const pre={status:'PROPOSED',approvals:3,round:1,participants:3};
  assert.equal(canPerform('finalize_session',pre,1,{}, {status:'PROPOSED'}),true);
  assert.equal(canPerform('ratify_proposal',pre,1,{approved_current_round:true}, {status:'PROPOSED'}),false);
  assert.equal(canPerform('finalize_session',{...pre,status:'RATIFIED'},1,{}, {status:'RATIFIED'}),false);
});
test('permissions reflect contract methods',()=>{
  assert.equal(canPerform('join_session',{status:'OPEN',participants:2},0),true);
  assert.equal(canPerform('lock_session',{status:'OPEN',participants:3},2),false);
  assert.equal(canPerform('lock_session',{status:'OPEN',participants:3},1),true);
  assert.equal(canPerform('open_revision',{status:'REJECTED',round:2},1),false);
});
test('state decoding does not silently mock',()=>{
  assert.deepEqual(normalizeRecord('{"status":"PROPOSED"}','session'),{status:'PROPOSED'});
  assert.throws(()=>normalizeRecord('not-json','session'));
});
