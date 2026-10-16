import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {Coordination} from '../packages/core/coordination.mjs';
import {MemoryStore} from '../apps/api/src/memory-store.mjs';
const now=Date.parse('2026-10-16T12:00:00Z');
const owner={id:randomUUID(),emailKey:'a'.repeat(64),owner:true};
const a={id:randomUUID(),emailKey:'b'.repeat(64)};
const b={id:randomUUID(),emailKey:'c'.repeat(64)};
const event={title:'Orientation',startsAt:'2026-11-01T06:30:00Z',endsAt:'2026-11-01T07:30:00Z',timeZone:'America/New_York',capacity:1,accessibility:'Step-free entrance',venue:'Private meeting location',safety:'Orientation only. No field operations.'};
async function setup(){const store=new MemoryStore(),service=new Coordination(store,()=>now);const t=await service.create(owner,{name:'Test team',region:'Example region'});return{store,service,id:t.id};}
async function join(s,id,who){const inv=await s.change(owner,id,'invite',{emailKey:who.emailKey});await s.change(who,id,'accept',{invitationId:inv.invitationId,displayName:'Volunteer',consent:true});}
async function publish(s,id){const e=await s.change(owner,id,'propose-event',event);await s.change(owner,id,'review-event',{eventId:e.eventId,revision:1,decision:'publish',acknowledge:true});return e.eventId;}
test('team invitations are email-bound, revocable, one-use and require opt-in',async()=>{
 const {service:s,id,store}=await setup();
 await assert.rejects(()=>s.create(a,{name:'Escalation',region:'Anywhere'}),{code:'coordination_forbidden'});
 const inv=await s.change(owner,id,'invite',{emailKey:a.emailKey});
 assert.equal((await s.invitations(a)).length,1);assert.equal((await s.invitations(b)).length,0);
 await assert.rejects(()=>s.change(b,id,'accept',{invitationId:inv.invitationId,displayName:'Wrong recipient',consent:true}),{code:'not_found'});
 await assert.rejects(()=>s.change(a,id,'accept',{invitationId:inv.invitationId,displayName:'Volunteer',consent:false}),{code:'consent_required'});
 await s.change(owner,id,'revoke-invite',{invitationId:inv.invitationId});
 await assert.rejects(()=>s.change(a,id,'accept',{invitationId:inv.invitationId,displayName:'Volunteer',consent:true}),{code:'not_found'});
 await join(s,id,a);assert.equal((await s.list(a)).length,1);assert.deepEqual(await s.list(b),[]);
 assert(!JSON.stringify(await s.view(a,id)).includes(a.emailKey));
 assert.equal(store.coordinationAudit.some(x=>x.action==='team_accept'),true);
});
test('captain scope cannot cross teams, promote itself or read old plans; leaving revokes access',async()=>{
 const {service:s,id}=await setup();
 await s.change(owner,id,'plan',{weekOf:'2026-10-12',summary:'Historical team plan'});
 const later=new Coordination(s.store,()=>now+1000);await join(later,id,a);await join(later,id,b);
 assert.equal((await later.view(a,id)).plans.length,0);
 await assert.rejects(()=>later.change(a,id,'membership',{accountId:a.id,role:'captain'}),{code:'coordination_forbidden'});
 await later.change(owner,id,'membership',{accountId:a.id,role:'captain'});
 const other=await later.create(owner,{name:'Other team',region:'Another region'});
 await assert.rejects(()=>later.view(a,other.id),{code:'not_found'});
 await assert.rejects(()=>later.change(a,id,'membership',{accountId:b.id,role:'captain'}),{code:'coordination_forbidden'});
 await later.change(a,id,'membership',{accountId:b.id,role:'removed'});
 await assert.rejects(()=>later.view(b,id),{code:'not_found'});
 await later.change(a,id,'leave',{});
 await assert.rejects(()=>later.change(a,id,'plan',{weekOf:'2026-10-19',summary:'Forbidden'}),{code:'not_found'});
});
test('published events serialize capacity, replay, cancellation and FIFO waitlist promotion',async()=>{
 const {service:s,id}=await setup();await join(s,id,a);await join(s,id,b);
 const eid=await publish(s,id);
 assert.equal((await s.view(a,id)).events[0].venue,undefined);
 assert.equal((await s.rsvp(a,id,eid,{attending:true})).status,'confirmed');
 assert.equal((await s.rsvp(a,id,eid,{attending:true})).status,'confirmed');
 assert.equal((await s.rsvp(b,id,eid,{attending:true})).status,'waitlisted');
 assert.equal((await s.view(a,id)).events[0].venue,event.venue);
 assert.equal((await s.view(b,id)).events[0].venue,undefined);
 await s.rsvp(a,id,eid,{attending:false});assert.equal((await s.view(b,id)).events[0].myRsvp,'confirmed');
 await assert.rejects(()=>s.change(owner,id,'review-event',{eventId:eid,revision:1,decision:'cancel',acknowledge:true}),{code:'stale_event'});
 await s.change(owner,id,'review-event',{eventId:eid,revision:2,decision:'cancel',acknowledge:true});
 assert.equal((await s.view(b,id)).events[0].myRsvp,'cancelled');
 await assert.rejects(()=>s.rsvp(b,id,eid,{attending:true}),{code:'event_unavailable'});
});
test('draft events, arbitrary metadata, invalid dates and permission claims are rejected',async()=>{
 const {service:s,id}=await setup();await join(s,id,a);
 const draft=await s.change(owner,id,'propose-event',event);
 assert.equal((await s.view(a,id)).events.length,0);
 await assert.rejects(()=>s.rsvp(a,id,draft.eventId,{attending:true}),{code:'event_unavailable'});
 await assert.rejects(()=>s.change(a,id,'review-event',{eventId:draft.eventId,revision:1,decision:'publish',acknowledge:true}),{code:'coordination_forbidden'});
 for(const patch of [{capacity:0},{timeZone:'Made/Up'},{startsAt:'2026-11-01T01:30:00'},{endsAt:'2026-10-15T00:00:00Z'},{attendees:['Private data']},{title:'<script>alert(1)</script>'}]){
  await assert.rejects(()=>s.change(owner,id,'propose-event',{...event,...patch}));
 }
 await assert.rejects(()=>s.rsvp(a,id,draft.eventId,{attending:true,accountId:b.id}),{code:'unknown_field'});
});
test('failed mutation rolls back and removing a member frees their reserved place',async()=>{
 const {service:s,id,store}=await setup();await join(s,id,a);await join(s,id,b);const eid=await publish(s,id);
 await s.rsvp(a,id,eid,{attending:true});await s.rsvp(b,id,eid,{attending:true});
 const before=await store.getTeam(id);
 await assert.rejects(()=>s.change(owner,id,'archive',{confirm:'wrong name'}));assert.deepEqual(await store.getTeam(id),before);
 await s.change(owner,id,'membership',{accountId:a.id,role:'removed'});
 assert.equal((await s.view(b,id)).events[0].myRsvp,'confirmed');
 await s.change(owner,id,'archive',{confirm:'Test team'});assert.deepEqual(await s.list(b),[]);
 await assert.rejects(()=>s.view(b,id),{code:'not_found'});
});
