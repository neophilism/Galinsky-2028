import {randomUUID} from 'node:crypto';
import {assert} from '../../../packages/core/validation.mjs';
import {nextHelpStatus,MAX_OPEN_HELP_REQUESTS} from '../../../packages/core/help-requests.mjs';

// Neither public/volunteer responses nor the operator inbox return account ID,
// email lookup hash, session data or the encrypted delivery address.
const publicRecord=r=>r&&({
 id:r.id,kind:r.kind,area:r.area,status:r.status,
 createdAt:new Date(r.created_at??r.createdAt).toISOString(),
 updatedAt:new Date(r.updated_at??r.updatedAt).toISOString()
});
const active=status=>status==='received'||status==='acknowledged';
export const postgresHelp={
 async listStoredHelpRequests(accountId){
  // Keep data-access exports complete even after intake is switched off.
  // Older releases may not yet have migration 015; fail open for export
  // availability, never for help intake or cross-account reads.
  const table=await this.pool.query("SELECT to_regclass('g28.help_requests') AS name");
  return table.rows[0]?.name?this.listHelpRequests(accountId):[];
 },
 async createHelpRequest(accountId,details){
  const client=await this.pool.connect();
  try{
   await client.query('BEGIN');
   // Serialize requests from the same account so concurrent calls cannot
   // bypass the open-case cap or race against account closure.
   const owner=await client.query('SELECT id FROM g28.accounts WHERE id=$1 FOR UPDATE',[accountId]);
   assert(owner.rowCount===1,'authentication_required','Your account is no longer available.',401);
   const pending=await client.query("SELECT count(*)::integer AS count FROM g28.help_requests WHERE account_id=$1 AND status IN ('received','acknowledged')",[accountId]);
   assert(Number(pending.rows[0].count)<MAX_OPEN_HELP_REQUESTS,'help_limit','Resolve or withdraw an existing request before opening another.',429);
   const saved=await client.query(
    'INSERT INTO g28.help_requests(id,account_id,kind,area) VALUES($1,$2,$3,$4) RETURNING *',
    [randomUUID(),accountId,details.kind,details.area]);
   await client.query('COMMIT');
   return publicRecord(saved.rows[0]);
  }catch(error){await client.query('ROLLBACK');throw error;}finally{client.release();}
 },
 async listHelpRequests(accountId){
  const result=await this.pool.query(
   'SELECT id,kind,area,status,created_at,updated_at FROM g28.help_requests WHERE account_id=$1 ORDER BY created_at DESC,id DESC LIMIT 40',[accountId]);
  return result.rows.map(publicRecord);
 },
 async listStaffHelpRequests(){
  const result=await this.pool.query(
   "SELECT id,kind,area,status,created_at,updated_at FROM g28.help_requests WHERE status IN ('received','acknowledged') ORDER BY created_at,id LIMIT 100");
  return result.rows.map(publicRecord);
 },
 async changeHelpRequest(id,accountId,action,role,actorId){
  const client=await this.pool.connect();
  try{
   await client.query('BEGIN');
   const record=await client.query(
    'SELECT id,kind,area,status,created_at,updated_at FROM g28.help_requests WHERE id=$1'+(role==='volunteer'?' AND account_id=$2':'')+' FOR UPDATE',
    role==='volunteer'?[id,accountId]:[id]);
   assert(record.rowCount===1,'help_not_found','The request was not found.',404);
   const next=nextHelpStatus(record.rows[0].status,action,role);
   const updated=await client.query(
    'UPDATE g28.help_requests SET status=$2,updated_at=CASE WHEN status=$2 THEN updated_at ELSE now() END WHERE id=$1 RETURNING *',
    [id,next]);
   if(role==='staff'&&next!==record.rows[0].status){
    // Only verified owner actions are allowed by the HTTP route; audit only
    // the actor and request UUID, never volunteer identity or narrative.
    await client.query(
     'INSERT INTO g28.audit_events(id,actor_subject,action,object_id,result) VALUES($1,$2,$3,$4,$5)',
     [randomUUID(),actorId,'help_'+action,id,'success']);
   }
   await client.query('COMMIT');
   return publicRecord(updated.rows[0]);
  }catch(error){await client.query('ROLLBACK');throw error;}finally{client.release();}
 }
};

export const memoryHelp={
 async listStoredHelpRequests(accountId){return this.listHelpRequests(accountId);},
 async createHelpRequest(accountId,details){
  assert(this.accounts.has(accountId),'authentication_required','Your account is no longer available.',401);
  this.helpRequests??=new Map();
  const current=[...this.helpRequests.values()].filter(r=>r.accountId===accountId&&active(r.status));
  assert(current.length<MAX_OPEN_HELP_REQUESTS,'help_limit','Resolve or withdraw an existing request before opening another.',429);
  const now=new Date().toISOString(),record={
   id:randomUUID(),accountId,kind:details.kind,area:details.area,status:'received',createdAt:now,updatedAt:now
  };
  this.helpRequests.set(record.id,record);
  return publicRecord(record);
 },
 async listHelpRequests(accountId){
  return [...(this.helpRequests?.values()||[])].filter(r=>r.accountId===accountId)
   .sort((a,b)=>b.createdAt.localeCompare(a.createdAt)||b.id.localeCompare(a.id)).slice(0,40).map(publicRecord);
 },
 async listStaffHelpRequests(){
  return [...(this.helpRequests?.values()||[])].filter(r=>active(r.status))
   .sort((a,b)=>a.createdAt.localeCompare(b.createdAt)||a.id.localeCompare(b.id)).slice(0,100).map(publicRecord);
 },
 async changeHelpRequest(id,accountId,action,role,actorId){
  const record=this.helpRequests?.get(id);
  assert(record&&(role!=='volunteer'||record.accountId===accountId),'help_not_found','The request was not found.',404);
  const next=nextHelpStatus(record.status,action,role);
  if(next!==record.status){
   record.status=next;record.updatedAt=new Date().toISOString();
   if(role==='staff'){this.helpAudit??=[];this.helpAudit.push({actorId,action,id});}
  }
  return publicRecord(record);
 }
};
