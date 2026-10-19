import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID,createHash} from 'node:crypto';
import {readFile} from 'node:fs/promises';
import {PostgresStore,databasePool} from '../../apps/api/src/postgres-store.mjs';
import {createApp} from '../../apps/api/src/app.mjs';
import {randomToken,tokenHash} from '../../packages/core/auth.mjs';
const url=process.env.TEST_DATABASE_URL;
test('treasury export HTTP requires current independent finance authority, step-up and CSRF; SQL output and audit commit atomically',{skip:!url},async()=>{
 assert(['localhost','127.0.0.1'].includes(new URL(url).hostname));
 const pool=databasePool(url),store=new PostgresStore(pool),now=Date.now(),prefix='export-'+randomUUID().slice(0,8),origin='http://localhost:4322',accounts=[],keys=[];
 const config={staffIdentity:true,adminLoginReady:true,adminOwnerEmailKey:tokenHash(prefix+'-owner'),portalOrigin:origin,publicOrigin:'http://localhost:4321'},app=createApp({store,config,clock:()=>now});
 async function actor(role){const id=randomUUID(),key=role==='owner'?config.adminOwnerEmailKey:tokenHash(id),token=randomToken(),hash=tokenHash(token),csrf=randomToken();accounts.push(id);keys.push(key);await pool.query("INSERT INTO g28.accounts(id,email_key,delivery_envelope,verified_at,terms_version) VALUES($1,$2,'synthetic',now(),'synthetic')",[id,key]);await pool.query('INSERT INTO g28.sessions(token_hash,account_id,csrf_token,expires_at) VALUES($1,$2,$3,$4)',[hash,id,csrf,new Date(now+86400000)]);if(role!=='owner')await pool.query("INSERT INTO g28.admin_grants(email_key,role,display_label,granted_by) VALUES($1,$2,'Synthetic staff',$3)",[key,role,accounts[0]]);await store.withStaffSecurity(id,s=>{s.credentials=[{id:'fixture'}];s.sessions={[hash]:{credentialId:'fixture',expires:now+900000}};});return {id,headers:{origin,cookie:'g28-local='+token,'content-type':'application/json','x-csrf-token':csrf}};}
 const input={from:'2020-01-01T00:00:00Z',until:'2020-02-01T00:00:00Z',format:'csv',purpose:'reconciliation',confirm:'export treasury ledger'};
 const send=(who,payload=input)=>app.inject({method:'POST',url:'/api/staff/treasury/export',headers:who.headers,payload});
 try{
  for(const name of ['001_foundation','004_fundraising_reconciliation','009_treasurer_vault_admin_rbac','016_staff_passkeys','017_staff_roles','020_treasury_exports'])await pool.query(await readFile('db/migrations/'+name+'.sql','utf8'));
  const owner=await actor('owner'),auditor=await actor('auditor'),editor=await actor('editor'),treasurer=await actor('treasurer');
  for(const [kind,cents]of [['captured',1000],['partially_refunded',100]])await pool.query('INSERT INTO g28.financial_provider_events(provider,event_id,payment_id,event_digest,event_kind,amount_cents,occurred_at) VALUES($1,$2,$3,$4,$5,$6,$7)',[prefix,randomUUID(),randomUUID(),'a'.repeat(64),kind,cents,'2020-01-18T12:00:00Z']);
  assert.equal((await send(auditor)).statusCode,403);assert.equal((await send(editor)).statusCode,403);
  assert.equal((await send({...owner,headers:{...owner.headers,'x-csrf-token':'wrong'}})).statusCode,403);
  assert.equal((await send(owner,{...input,donorEmail:'must-not-export@example.test'})).statusCode,400);
  const response=await send(owner);assert.equal(response.statusCode,200,response.body);assert(response.headers['content-type'].startsWith('text/csv'));assert(response.body.includes('"capturedCents","1000"'));assert(response.body.includes('"refundedCents","100"'));
  const reference=response.headers['x-export-reference'],digest=createHash('sha256').update(response.body).digest('hex');assert.equal(response.headers['x-content-sha256'],digest);
  const manifest=(await pool.query('SELECT sha256,row_count FROM g28.treasury_exports WHERE id=$1',[reference])).rows[0];assert.equal(manifest.sha256,digest);assert.equal(manifest.row_count,2);
  assert.equal((await pool.query("SELECT 1 FROM g28.audit_events WHERE object_id=$1 AND action='treasury_export'",[reference])).rowCount,1);
  const json=await send(treasurer,{...input,format:'json'});assert.equal(json.statusCode,200,json.body);assert.equal(json.json().totals[prefix].capturedCents,1000);assert(!json.body.includes('synthetic-encrypted-secret'));
  // A failed audit is a failed export. No unaudited manifest may survive.
  await pool.query("CREATE FUNCTION g28.synthetic_export_audit_failure() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN IF NEW.action='treasury_export' THEN RAISE EXCEPTION 'synthetic audit failure'; END IF; RETURN NEW; END $$");
  await pool.query('CREATE TRIGGER synthetic_export_audit_failure BEFORE INSERT ON g28.audit_events FOR EACH ROW EXECUTE FUNCTION g28.synthetic_export_audit_failure()');
  const failed=await send(owner);assert.equal(failed.statusCode,500);assert(!failed.body.includes(prefix));assert.equal((await pool.query('SELECT count(*)::integer AS count FROM g28.treasury_exports WHERE actor_id=$1',[owner.id])).rows[0].count,1);
  await pool.query('DROP TRIGGER synthetic_export_audit_failure ON g28.audit_events');await pool.query('DROP FUNCTION g28.synthetic_export_audit_failure()');
  await store.withStaffSecurity(treasurer.id,s=>{s.sessions={};});assert.equal((await send(treasurer)).statusCode,403);
 }finally{
  await app.close();await pool.query('DROP TRIGGER IF EXISTS synthetic_export_audit_failure ON g28.audit_events');await pool.query('DROP FUNCTION IF EXISTS g28.synthetic_export_audit_failure()');await pool.query('DELETE FROM g28.financial_provider_events WHERE provider=$1',[prefix]);await pool.query('DELETE FROM g28.treasury_exports WHERE actor_id=ANY($1::uuid[])',[accounts]);await pool.query('DELETE FROM g28.admin_grants WHERE email_key=ANY($1::text[])',[keys]);await pool.query('DELETE FROM g28.audit_events WHERE actor_subject=ANY($1::text[])',[accounts]);await pool.query('DELETE FROM g28.accounts WHERE id=ANY($1::uuid[])',[accounts]);await store.close();
 }
});
