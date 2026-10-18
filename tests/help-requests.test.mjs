import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {HELP_KINDS,HELP_AREAS,HELP_NOTE,normalizeHelpRequest,nextHelpStatus} from '../packages/core/help-requests.mjs';
import {MemoryStore} from '../apps/api/src/memory-store.mjs';

test('structured help requests accept only enumerated, non-sensitive metadata',()=>{
 assert.equal(HELP_KINDS.length,4);
 assert.equal(HELP_AREAS.length,6);
 assert.match(HELP_NOTE,/No free-text/);
 assert.deepEqual(normalizeHelpRequest({kind:'accessibility',area:'homepage'}),
  {kind:'accessibility',area:'homepage'});
 for(const body of [
  {kind:'incident',area:'portal'},
  {kind:'account_correction',area:'issues'},
  {kind:'material_correction',area:'account'},
  {kind:'privacy_question',area:'homepage'},
  {kind:'accessibility',area:'homepage',description:'private medical details'},
  {kind:'accessibility',area:'homepage',email:'someone@example.test'},
  {kind:'accessibility',area:'homepage',attachment:'data:evil'},
  {kind:'accessibility',area:'homepage',accountId:'somebody-else'},
  {kind:'accessibility',area:'homepage',priority:'emergency'},
  {kind:'accessibility',area:'homepage',freeText:'private'}
 ])assert.throws(()=>normalizeHelpRequest(body));
});

test('staff and volunteer transitions are separate and safe for replay',()=>{
 assert.equal(nextHelpStatus('received','withdraw','volunteer'),'withdrawn');
 assert.equal(nextHelpStatus('withdrawn','withdraw','volunteer'),'withdrawn');
 assert.equal(nextHelpStatus('received','acknowledge','staff'),'acknowledged');
 assert.equal(nextHelpStatus('acknowledged','acknowledge','staff'),'acknowledged');
 assert.equal(nextHelpStatus('acknowledged','resolve','staff'),'resolved');
 assert.equal(nextHelpStatus('resolved','resolve','staff'),'resolved');
 for(const [state,action,role] of [
  ['received','resolve','staff'],['received','resolve','volunteer'],
  ['received','acknowledge','volunteer'],['resolved','withdraw','volunteer'],
  ['withdrawn','acknowledge','staff'],['acknowledged','withdraw','staff'],
  ['received','withdraw','anonymous']
 ])assert.throws(()=>nextHelpStatus(state,action,role));
});

test('memory help queue enforces owner scoping, cap, withdrawal and staff triage',async()=>{
 const store=new MemoryStore(),one=randomUUID(),two=randomUUID();
 store.accounts.set(one,{id:one,emailKey:'one'});
 store.accounts.set(two,{id:two,emailKey:'two'});
 const first=await store.createHelpRequest(one,normalizeHelpRequest({kind:'accessibility',area:'homepage'}));
 assert.equal(first.status,'received');
 assert.equal(JSON.stringify(first).includes(one),false);
 await store.createHelpRequest(one,{kind:'privacy_question',area:'portal'});
 await store.createHelpRequest(one,{kind:'account_correction',area:'account'});
 await assert.rejects(store.createHelpRequest(one,{kind:'accessibility',area:'issues'}),e=>e.code==='help_limit');
 assert.equal((await store.listHelpRequests(two)).length,0);
 assert.equal((await store.listStaffHelpRequests()).length,3);
 await assert.rejects(store.changeHelpRequest(first.id,two,'withdraw','volunteer',two),e=>e.code==='help_not_found');
 await store.changeHelpRequest(first.id,null,'acknowledge','staff','operator');
 const updated=await store.changeHelpRequest(first.id,one,'withdraw','volunteer',one);
 assert.equal(updated.status,'withdrawn');
 assert.equal((await store.listStaffHelpRequests()).length,2);
 assert.equal((await store.createHelpRequest(one,{kind:'accessibility',area:'issues'})).status,'received');
 assert(!JSON.stringify(await store.listStaffHelpRequests()).includes(one));
});
