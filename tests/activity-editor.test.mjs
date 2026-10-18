import test from 'node:test';
import assert from 'node:assert/strict';
import {createActivityDraft,reviseActivityDraft,verifyActivityDraft,publishActivityDraft,revokeActivityModule,validateActivityDraft} from '../packages/core/activity-editor.mjs';
import {summarizePublishedModule} from '../packages/core/activity-summary.mjs';
const now=new Date('2026-10-18T18:00:00Z'),sha='e'.repeat(64);
const actor=(id,scope)=>({id,verified:true,scopes:[scope]});
const edit=actor('fixture-editor','activity:edit'),verify1=actor('fixture-verifier-a','activity:verify'),
 verify2=actor('fixture-verifier-b','activity:verify'),publisher=actor('fixture-publisher','activity:publish');
const sample=()=>({id:'synthetic-training',jurisdiction:'CT',election:'2028 General',
 activity:'Synthetic session orientation',validFrom:'2026-10-17T00:00:00Z',
 validUntil:'2026-12-01T00:00:00Z',training:['practice-orientation'],
 approvedTools:['sandbox-training-app'],sources:[{url:'https://example.org/official',checkedAt:'2026-10-17T00:00:00Z',digest:sha}]});
const rev=x=>({revision:x.revision,stateVersion:x.stateVersion});
const err=(fn,code)=>assert.throws(fn,x=>x.code===code);
test('schema prohibits unauthorized fields, URLs, stale evidence and non-UTC dates',()=>{
 assert.equal(validateActivityDraft(sample(),now).id,'synthetic-training');
 for(const change of [
  {url:'javascript:alert(1)'},{url:'https://localhost/secret'},
  {url:'https://u:pw@example.org/official'},{url:'http://example.org/file'},
  {url:'https://127.0.0.1/private'},{url:'https://example.org/?secret=foo'}
 ]){const input=sample();input.sources[0].url=change.url;assert.throws(()=>validateActivityDraft(input,now));}
 const bads=[
  {...sample(),status:'published'},
  {...sample(),approver:'owner'},
  {...sample(),training:[]},
  {...sample(),approvedTools:['a','a']},
  {...sample(),validUntil:'2026-10-17T00:00:00Z'},
  {...sample(),validFrom:'2026-10-17'},
  {...sample(),sources:[{url:'https://example.org/a',checkedAt:'2026-08-17T00:00:00Z',digest:sha}]},
  {...sample(),sources:[{url:'https://example.org/a',checkedAt:'2026-10-17T00:00:00Z',digest:'invalid'}]}
 ];
 bads.forEach(x=>assert.throws(()=>validateActivityDraft(x,now)));
});
test('drafts require verified scoped editors and reject stale concurrency',()=>{
 err(()=>createActivityDraft(sample(),actor('x','activity:verify'),now),'staff_permission_required');
 err(()=>createActivityDraft(sample(),{...edit,verified:false},now),'staff_permission_required');
 const original=createActivityDraft(sample(),edit,now);
 assert.equal(original.revision,1);assert.equal(original.status,'draft');
 assert.deepEqual(original.verifiers,[]);assert.equal(original.approval,null);
 err(()=>reviseActivityDraft(original,sample(),edit,{revision:1,stateVersion:0},now),'stale_activity_edit');
 const newer=reviseActivityDraft(original,{...sample(),activity:'Second synthetic revision'},edit,rev(original),now);
 assert.equal(newer.revision,2);assert.equal(newer.stateVersion,1);
 assert.equal(newer.status,'draft');assert.equal(newer.approval,null);
 err(()=>reviseActivityDraft(original,{...sample(),id:'other-activity'},edit,rev(original),now),'activity_id_immutable');
});
test('two independent checks, exact revision, and separate publication are required',()=>{
 const original=createActivityDraft(sample(),edit,now);
 err(()=>verifyActivityDraft(original,edit,sha,rev(original)),'staff_permission_required');
 const authorVerify={...edit,scopes:['activity:edit','activity:verify']};
 err(()=>verifyActivityDraft(original,authorVerify,sha,rev(original)),'independent_activity_review');
 const r1=verifyActivityDraft(original,verify1,sha,rev(original));
 assert.equal(r1.verifiers.length,1);assert.equal(r1.stateVersion,2);
 err(()=>publishActivityDraft(r1,publisher,rev(r1),now),'missing_review');
 err(()=>verifyActivityDraft(r1,verify1,sha,rev(r1)),'duplicate_activity_verifier');
 err(()=>verifyActivityDraft(r1,verify2,sha,rev(original)),'stale_activity_edit');
 const r2=verifyActivityDraft(r1,verify2,sha,rev(r1));
 err(()=>publishActivityDraft(r2,actor(verify1.id,'activity:publish'),rev(r2),now),'independent_activity_approval');
 const published=publishActivityDraft(r2,publisher,rev(r2),now);
 assert.equal(published.status,'published');assert.equal(published.revision,1);
 assert.equal(published.approval.by,publisher.id);
 assert.equal(summarizePublishedModule(published,now).activityAuthorized,false);
 err(()=>verifyActivityDraft(published,verify1,sha,rev(published)),'invalid_activity_state');
 err(()=>publishActivityDraft(published,publisher,rev(published),now),'invalid_activity_state');
});
test('a draft or revocation supersedes old publication without reviving an older grant',()=>{
 const d=createActivityDraft(sample(),edit,now);
 const d2=verifyActivityDraft(d,verify1,sha,rev(d));
 const d3=verifyActivityDraft(d2,verify2,sha,rev(d2));
 const published=publishActivityDraft(d3,publisher,rev(d3),now);
 const draft2=reviseActivityDraft(published,sample(),edit,rev(published),now);
 assert.equal(draft2.status,'draft');assert.equal(summarizePublishedModule(draft2,now),null);
 assert.equal(draft2.verifiers.length,0);
 err(()=>publishActivityDraft(draft2,publisher,rev(draft2),now),'missing_review');
 const revoked=revokeActivityModule(published,publisher,rev(published),'source_withdrawn');
 assert.equal(revoked.status,'revoked');assert.equal(revoked.revision,2);
 assert.equal(summarizePublishedModule(revoked,now),null);
 err(()=>revokeActivityModule(revoked,publisher,rev(revoked),'source_withdrawn'),'invalid_activity_state');
 err(()=>revokeActivityModule(published,publisher,{revision:1,stateVersion:2},'source_withdrawn'),'stale_activity_edit');
});
test('publication rejects stale official source even after valid earlier verification',()=>{
 const d=createActivityDraft(sample(),edit,now);
 const r1=verifyActivityDraft(d,verify1,sha,rev(d));
 const r2=verifyActivityDraft(r1,verify2,sha,rev(r1));
 const later=new Date('2026-11-18T18:00:00Z');
 err(()=>publishActivityDraft(r2,publisher,rev(r2),later),'stale_activity_source');
});
