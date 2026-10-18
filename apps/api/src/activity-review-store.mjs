import {randomUUID} from 'node:crypto';
import {assert} from '../../../packages/core/validation.mjs';
import {createActivityDraft,reviseActivityDraft,verifyActivityDraft,publishActivityDraft,revokeActivityModule} from '../../../packages/core/activity-editor.mjs';

// Internal, not an HTTP handler. Callers must derive verified staff identity and
// exact scopes from a real authenticated session, never a request body.
// Reader uses the newest revision only; a newer draft/revocation cannot
// silently fall back to earlier approved fieldwork guidance.
export function transitionActivityRecord(latest,operation,actor,expected,now=new Date()){
 assert(operation&&typeof operation==='object','invalid_activity_action','An activity action is required.');
 switch(operation.type){
  case 'revise': return reviseActivityDraft(latest,operation.draft,actor,expected,now);
  case 'verify': return verifyActivityDraft(latest,actor,operation.evidenceDigest,expected);
  case 'publish': return publishActivityDraft(latest,actor,expected,now);
  case 'revoke': return revokeActivityModule(latest,actor,expected,operation.reason);
  default: assert(false,'invalid_activity_action','Choose a supported activity action.');
 }
}
const idValue=id=>{
 assert(typeof id==='string'&&/^[a-z][a-z0-9-]{2,79}$/.test(id),'invalid_activity_id','Invalid activity ID.');
 return id;
};
const audit=async(db,actor,action,id)=>db.query(
 'INSERT INTO g28.audit_events(id,actor_subject,action,object_id,result) VALUES($1,$2,$3,$4,$5)',
 [randomUUID(),actor.id,'activity_'+action,id,'success']
);
export const postgresActivityReview={
 async createActivityReviewDraft(draft,actor,now=new Date()){
  const created=createActivityDraft(draft,actor,now),client=await this.pool.connect();
  try{
   await client.query('BEGIN');
   await client.query('SELECT pg_advisory_xact_lock(hashtextextended($1,282028))',[created.id]);
   const previous=await client.query('SELECT 1 FROM g28.activity_modules WHERE id=$1 LIMIT 1',[created.id]);
   assert(previous.rowCount===0,'duplicate_activity_id','This activity already exists.',409);
   await client.query('INSERT INTO g28.activity_modules(id,revision,record) VALUES($1,$2,$3)',[created.id,created.revision,created]);
   await audit(client,actor,'create',created.id);
   await client.query('COMMIT');
   return structuredClone(created);
  }catch(e){await client.query('ROLLBACK');throw e;}finally{client.release();}
 },
 async getLatestActivityReview(id){
  const record=await this.pool.query('SELECT record FROM g28.activity_modules WHERE id=$1 ORDER BY revision DESC LIMIT 1',[idValue(id)]);
  return record.rows[0]?.record??null;
 },
 async transitionActivityReview(id,operation,actor,expected,now=new Date()){
  id=idValue(id);
  const client=await this.pool.connect();
  try{
   await client.query('BEGIN');
   await client.query('SELECT pg_advisory_xact_lock(hashtextextended($1,282028))',[id]);
   const result=await client.query('SELECT revision,record FROM g28.activity_modules WHERE id=$1 ORDER BY revision DESC LIMIT 1 FOR UPDATE',[id]);
   assert(result.rowCount===1,'activity_not_found','This activity was not found.',404);
   const current=result.rows[0].record;
   const next=transitionActivityRecord(current,operation,actor,expected,now);
   if(next.revision===current.revision){
    // A reviewer/publisher updates only review metadata under the current
    // advisory lock. The exact module SOURCE fields never change here.
    const updated=await client.query(
     "UPDATE g28.activity_modules SET record=$3 WHERE id=$1 AND revision=$2 AND (record->>'stateVersion')::integer=$4",
     [id,current.revision,next,current.stateVersion]
    );
    assert(updated.rowCount===1,'stale_activity_edit','This activity changed.',409);
   }else{
    // New content or revocation is a separate immutable source revision.
    assert(next.revision===current.revision+1,'invalid_activity_state','Invalid revision progression.');
    await client.query('INSERT INTO g28.activity_modules(id,revision,record) VALUES($1,$2,$3)',[id,next.revision,next]);
   }
   await audit(client,actor,operation.type,id);
   await client.query('COMMIT');
   return structuredClone(next);
  }catch(e){await client.query('ROLLBACK');throw e;}finally{client.release();}
 }
};
export const memoryActivityReview={
 async createActivityReviewDraft(draft,actor,now=new Date()){
  const created=createActivityDraft(draft,actor,now);
  this.activityReviews??=new Map();
  assert(!this.activityReviews.has(created.id),'duplicate_activity_id','This activity already exists.',409);
  this.activityReviews.set(created.id,[structuredClone(created)]);
  this.activityReviewAudit??=[];this.activityReviewAudit.push({actor:actor.id,action:'create',id:created.id});
  return structuredClone(created);
 },
 async getLatestActivityReview(id){
  return structuredClone(this.activityReviews?.get(idValue(id))?.at(-1)??null);
 },
 async transitionActivityReview(id,operation,actor,expected,now=new Date()){
  id=idValue(id);
  const history=this.activityReviews?.get(id);
  assert(history&&history.length,'activity_not_found','This activity was not found.',404);
  const old=history.at(-1),next=transitionActivityRecord(old,operation,actor,expected,now);
  if(next.revision===old.revision)history[history.length-1]=structuredClone(next);
  else history.push(structuredClone(next));
  this.activityReviewAudit??=[];this.activityReviewAudit.push({actor:actor.id,action:operation.type,id});
  return structuredClone(next);
 }
};
