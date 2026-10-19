import {randomUUID} from 'node:crypto';
import {assert} from '../../../packages/core/validation.mjs';
const audit=(c,actor,action,object)=>c.query('INSERT INTO g28.audit_events(id,actor_subject,action,object_id,result) VALUES($1,$2,$3,$4,$5)',[randomUUID(),actor,action,object,'success']);
export const postgresOperations={
 async operationPublicScopes(ids){
  if(!ids.length)return {};
  const q=await this.pool.query("SELECT DISTINCT ON (id) id,revision,record->>'status' AS status,record->>'jurisdiction' AS jurisdiction,record->>'election' AS election,record->>'activity' AS activity,record->>'validUntil' AS until FROM g28.activity_modules WHERE id=ANY($1::text[]) ORDER BY id,revision DESC",[ids]);return Object.fromEntries(q.rows.map(r=>[r.id,r]));
 },
 async listOperations(kind,after=''){
  const q=await this.pool.query('SELECT record FROM g28.operation_definitions WHERE kind=$1 AND id>$2 ORDER BY id LIMIT 51',[kind,after]);
  return {items:q.rows.slice(0,50).map(r=>r.record),next:q.rowCount>50?q.rows[49].record.id:null};
 },
 async saveOperation(kind,input,expected,actor){
  const c=await this.pool.connect();try{await c.query('BEGIN');await c.query('SELECT pg_advisory_xact_lock(hashtextextended($1,282030))',[kind+':'+input.id]);
   const current=(await c.query('SELECT revision FROM g28.operation_definitions WHERE kind=$1 AND id=$2',[kind,input.id])).rows[0];
   assert((current?.revision??null)===expected,'stale_operation','This definition changed. Reload it before saving.',409);
   const record={...input,revision:(current?.revision||0)+1};
   await c.query('INSERT INTO g28.operation_definitions(kind,id,revision,record) VALUES($1,$2,$3,$4) ON CONFLICT(kind,id) DO UPDATE SET revision=EXCLUDED.revision,record=EXCLUDED.record',[kind,input.id,record.revision,record]);
   await audit(c,actor,'operation_'+kind+'_save',input.id);await c.query('COMMIT');return record;
  }catch(e){await c.query('ROLLBACK');throw e;}finally{c.release();}
 },
 async attestTraining(accountId,trainingId,input,actor){
  const c=await this.pool.connect();try{await c.query('BEGIN');
   const t=(await c.query("SELECT record FROM g28.operation_definitions WHERE kind='training' AND id=$1 FOR SHARE",[trainingId])).rows[0]?.record;
   assert(t&&t.revision===input.revision,'stale_training','The training definition changed.',409);
   assert((await c.query('SELECT 1 FROM g28.accounts WHERE id=$1',[accountId])).rowCount,'account_not_found','Verified account not found.',404);
   const record={...input,trainingId,recordedBy:actor,recordedAt:new Date().toISOString()};
   await c.query('INSERT INTO g28.training_attestations(account_id,training_id,record) VALUES($1,$2,$3) ON CONFLICT(account_id,training_id) DO UPDATE SET record=EXCLUDED.record',[accountId,trainingId,record]);
   await audit(c,actor,'training_attestation',trainingId);await c.query('COMMIT');return record;
  }catch(e){await c.query('ROLLBACK');throw e;}finally{c.release();}
 },
 async ownTraining(accountId){return (await this.pool.query('SELECT record FROM g28.training_attestations WHERE account_id=$1 ORDER BY training_id',[accountId])).rows.map(r=>r.record);},
 async ownClaims(accountId){return (await this.pool.query('SELECT task_id,record FROM g28.operation_claims WHERE account_id=$1 ORDER BY task_id',[accountId])).rows.map(r=>({taskId:r.task_id,...r.record}));},
 async setToolConsent(accountId,toolId,revision,allowed){
  const c=await this.pool.connect();try{await c.query('BEGIN');const t=(await c.query("SELECT revision FROM g28.operation_definitions WHERE kind='tool' AND id=$1 FOR SHARE",[toolId])).rows[0];assert(t&&t.revision===revision,'stale_tool','Reload the current tool before choosing.',409);
   await c.query('INSERT INTO g28.tool_consents(account_id,tool_id,revision,allowed) VALUES($1,$2,$3,$4) ON CONFLICT(account_id,tool_id) DO UPDATE SET revision=EXCLUDED.revision,allowed=EXCLUDED.allowed',[accountId,toolId,revision,allowed]);
   await audit(c,accountId,allowed?'tool_opt_in':'tool_opt_out',toolId);await c.query('COMMIT');return {saved:true};
  }catch(e){await c.query('ROLLBACK');throw e;}finally{c.release();}
 },
 async withOperationTask(taskId,accountId,change){
  const c=await this.pool.connect();try{await c.query('BEGIN');await c.query('SELECT pg_advisory_xact_lock(hashtextextended($1,282030))',['task:'+taskId]);
   const task=(await c.query("SELECT record FROM g28.operation_definitions WHERE kind='task' AND id=$1",[taskId])).rows[0]?.record;
   assert(task,'task_not_found','Task not found.',404);
   const claims=(await c.query('SELECT account_id,record FROM g28.operation_claims WHERE task_id=$1 FOR UPDATE',[taskId])).rows.map(r=>({accountId:r.account_id,...r.record}));
   const claim=claims.find(r=>r.accountId===accountId)||null;
   const material=(await c.query('SELECT record,revision,status,audience FROM g28.materials WHERE id=$1 FOR SHARE',[task.materialId])).rows[0];
   const training=(await c.query("SELECT d.record FROM g28.operation_definitions d JOIN g28.materials m ON m.id=d.record->>'materialId' AND m.revision=(d.record->>'materialRevision')::integer AND m.status='published' AND m.audience='volunteer' WHERE d.kind='training' FOR SHARE OF d,m")).rows.map(r=>r.record);
   const attestations=(await c.query('SELECT record FROM g28.training_attestations WHERE account_id=$1 FOR SHARE',[accountId])).rows.map(r=>r.record);
   let module=null,tool=null,consent=null;
   if(task.restricted){
    await c.query('SELECT pg_advisory_xact_lock(hashtextextended($1,282028))',[task.moduleId]);
    module=(await c.query('SELECT record FROM g28.activity_modules WHERE id=$1 ORDER BY revision DESC LIMIT 1',[task.moduleId])).rows[0]?.record;
    tool=(await c.query("SELECT record FROM g28.operation_definitions WHERE kind='tool' AND id=$1 FOR SHARE",[task.toolId])).rows[0]?.record;
    consent=(await c.query('SELECT revision,allowed FROM g28.tool_consents WHERE account_id=$1 AND tool_id=$2 FOR SHARE',[accountId,task.toolId])).rows[0];
   }
   const result=await change({task,claims,claim,context:{material,training,attestations,module,tool},consent,
    async save(record){const {accountId:ignored,...stored}=record;await c.query('INSERT INTO g28.operation_claim_history(task_id,account_id,record) VALUES($1,$2,$3)',[taskId,accountId,stored]);await c.query('INSERT INTO g28.operation_claims(task_id,account_id,record) VALUES($1,$2,$3) ON CONFLICT(task_id,account_id) DO UPDATE SET record=EXCLUDED.record',[taskId,accountId,stored]);},
    audit:(actor,action)=>audit(c,actor,action,taskId)});
   await c.query('COMMIT');return result;
  }catch(e){await c.query('ROLLBACK');throw e;}finally{c.release();}
 }
};
