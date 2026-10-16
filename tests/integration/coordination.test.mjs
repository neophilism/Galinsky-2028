import test from 'node:test';
import assert from 'node:assert/strict';
import {randomBytes,randomUUID} from 'node:crypto';
import {readFile} from 'node:fs/promises';
import {createApp} from '../../apps/api/src/app.mjs';
import {MemoryStore} from '../../apps/api/src/memory-store.mjs';
import {databasePool,PostgresStore} from '../../apps/api/src/postgres-store.mjs';
import {Coordination} from '../../packages/core/coordination.mjs';
import {emailKey,randomToken,tokenHash} from '../../packages/core/auth.mjs';
const pepper=randomBytes(32).toString('hex'),key=emailKey('owner@example.test',pepper);
const config={portalOrigin:'http://localhost:4322',publicOrigin:'http://localhost:4321',coordination:true,adminLoginReady:true,adminOwnerEmailKey:key,pepper,production:false};
async function account(store,owner=false){const id=randomUUID(),token=randomToken(),csrf=randomToken();store.accounts.set(id,{id,emailKey:owner?key:emailKey(id+'@example.test',pepper),verified:true});store.sessions.set(tokenHash(token),{hash:tokenHash(token),csrf,expires:Date.now()+3600000,accountId:id});return{id,headers:{origin:config.portalOrigin,'content-type':'application/json',cookie:'g28-local='+token,'x-csrf-token':csrf}};}
test('HTTP team operations require session, CSRF, origin and current scoped grants',async()=>{
 const store=new MemoryStore(),app=createApp({store,config});
 try{
  const owner=await account(store,true),other=await account(store);
  const create=h=>app.inject({method:'POST',url:'/api/teams',headers:h,payload:{name:'A team',region:'Example'}});
  assert.equal((await app.inject({url:'/api/teams'})).statusCode,401);
  assert.equal((await create(other.headers)).statusCode,403);
  assert.equal((await create(Object.fromEntries(Object.entries(owner.headers).filter(([k])=>k!=='x-csrf-token')))).statusCode,403);
  assert.equal((await create({...owner.headers,origin:'https://evil.test'})).statusCode,403);
  const created=await create(owner.headers);assert.equal(created.statusCode,200);const id=created.json().id;
  assert.equal((await app.inject({url:'/api/teams/'+id,headers:other.headers})).statusCode,404);
  assert.equal((await app.inject({url:'/api/teams/not-a-uuid',headers:owner.headers})).statusCode,400);
  const inv=await app.inject({method:'POST',url:`/api/teams/${id}/invite`,headers:owner.headers,payload:{email:other.id+'@example.test'}});assert.equal(inv.statusCode,200);
  const invitations=(await app.inject({url:'/api/team-invitations',headers:other.headers})).json().invitations;
  assert.equal(invitations.length,1);
  const join=await app.inject({method:'POST',url:`/api/teams/${id}/accept`,headers:other.headers,payload:{invitationId:invitations[0].id,displayName:'Sample volunteer',consent:true}});assert.equal(join.statusCode,200);
  const data=(await app.inject({url:'/api/account/export',headers:other.headers})).json();assert.equal(data.coordination.length,1);assert(!JSON.stringify(data).includes(key));
  const closed=await app.inject({method:'POST',url:'/api/account/close',headers:other.headers,payload:{confirm:'close my account'}});assert.equal(closed.statusCode,200);
  assert.equal((await store.getTeam(id)).members.length,0);
 }finally{await app.close();}
});
test('unreleased coordination does not collect requests',async()=>{
 const store=new MemoryStore(),app=createApp({store,config:{...config,coordination:false}});
 const r=await app.inject({method:'POST',url:'/api/teams',headers:{origin:config.portalOrigin,'content-type':'application/json'},payload:{name:'Must not be stored',region:'X'}});
 assert.equal(r.statusCode,503);assert.deepEqual(await store.listTeams(),[]);await app.close();
});
test('Postgres team transaction survives reload and concurrent capacity/closure',{skip:!process.env.TEST_DATABASE_URL},async()=>{
 const url=process.env.TEST_DATABASE_URL;assert(['127.0.0.1','localhost'].includes(new URL(url).hostname));
 const pool=databasePool(url),store=new PostgresStore(pool);const ids=[];
 try{
  for(const f of ['001_foundation','002_self_reported_task_progress','003_material_reading','005_volunteer_role_preferences','006_account_bookmarks','014_volunteer_coordination'])await pool.query(await readFile('db/migrations/'+f+'.sql','utf8'));
  async function add(owner=false){const id=randomUUID(),emailKey=randomBytes(32).toString('hex');await pool.query('INSERT INTO g28.accounts(id,email_key,delivery_envelope,verified_at,terms_version) VALUES($1,$2,$3,now(),$4)',[id,emailKey,'synthetic-envelope','test']);ids.push(id);return{id,emailKey,owner};}
  const owner=await add(true),people=await Promise.all(Array.from({length:10},()=>add()));
  const s=new Coordination(store),team=await s.create(owner,{name:'Database concurrency test',region:'Synthetic'});
  for(const p of people){const i=await s.change(owner,team.id,'invite',{emailKey:p.emailKey});await s.change(p,team.id,'accept',{invitationId:i.invitationId,displayName:'Synthetic participant',consent:true});}
  const event=await s.change(owner,team.id,'propose-event',{title:'Future orientation',startsAt:new Date(Date.now()+86400000).toISOString(),endsAt:new Date(Date.now()+90000000).toISOString(),timeZone:'UTC',capacity:2,accessibility:'Accessible',venue:'Synthetic private venue',safety:'Synthetic orientation'});
  await s.change(owner,team.id,'review-event',{eventId:event.eventId,revision:1,decision:'publish',acknowledge:true});
  const results=await Promise.all(people.map(p=>s.rsvp(p,team.id,event.eventId,{attending:true})));
  assert.equal(results.filter(r=>r.status==='confirmed').length,2);assert.equal(results.filter(r=>r.status==='waitlisted').length,8);
  const fresh=new Coordination(new PostgresStore(pool));assert.equal((await fresh.view(owner,team.id)).memberCount,10);
  await Promise.all(people.map(p=>s.rsvp(p,team.id,event.eventId,{attending:true})));
  assert.equal((await fresh.view(owner,team.id)).events[0].confirmed,2);
  assert.equal((await store.accountActivityExport(people[0].id)).coordination.length,1);
  await store.closeAccount(people[0].id);
  const saved=await store.getTeam(team.id);assert(!JSON.stringify(saved).includes(people[0].id));
  await assert.rejects(()=>s.rsvp(people[0],team.id,event.eventId,{attending:true}));
  assert((await pool.query('SELECT id FROM g28.audit_events WHERE object_id=$1',[team.id])).rowCount>0);
  await pool.query('DELETE FROM g28.coordination_teams WHERE id=$1',[team.id]);
 }finally{await pool.query('DELETE FROM g28.accounts WHERE id=ANY($1::uuid[])',[ids]);await store.close();}
});
