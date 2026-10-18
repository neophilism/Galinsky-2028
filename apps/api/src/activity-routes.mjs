import {assert,exactKeys,id} from '../../../packages/core/validation.mjs';
import {staffCan,staffScopes} from '../../../packages/core/staff-permissions.mjs';
export function registerActivityReview(app,{store,config,clock,account,writeSession}){
 async function actor(req,scope,{write=false}={}){
  assert(config.staffIdentity,'staff_unavailable','Verified staff identity is required.',503);
  const s=await (write?writeSession(req):account(req)),role=await store.adminRole(s.account,config.adminOwnerEmailKey);
  assert(scope==='read'?['owner','editor','publisher','module-verifier','module-approver','coordinator','safety-reviewer','security-administrator','auditor'].includes(role):staffCan(role,scope),
   'staff_forbidden','Your staff role does not permit this activity action.',403);
  assert(await store.staffMfaValid(s.account.id,s.hash,clock()),'mfa_required','Verify your staff passkey first.',403);
  assert(await store.rate('activity-review:'+s.account.id,60,clock()+60000),'rate_limited','Please wait before retrying.',429);
  return {id:s.account.id,verified:true,scopes:role==='owner'?['activity:edit','activity:verify','activity:publish']:staffScopes(role)};
 }
 app.get('/api/staff/activity',async req=>{
  const who=await actor(req,'read');return {modules:await store.listActivityReviewDrafts(),scopes:who.scopes};
 });
 app.post('/api/staff/activity',async(req,reply)=>{
  const who=await actor(req,'activity:edit',{write:true}),b=exactKeys(req.body,['draft']);
  return reply.code(201).send({module:await store.createActivityReviewDraft(b.draft,who,new Date(clock()))});
 });
 app.post('/api/staff/activity/:id/:action',async req=>{
  const action=req.params.action;
  assert(['revise','verify','publish','revoke'].includes(action),'invalid_activity_action','Choose a supported activity action.');
  const who=await actor(req,action==='revise'?'activity:edit':action==='verify'?'activity:verify':'activity:publish',{write:true});
  const b=exactKeys(req.body,['expected',...(action==='revise'?['draft']:action==='verify'?['evidenceDigest']:action==='revoke'?['reason']:[])]);
  exactKeys(b.expected,['revision','stateVersion']);
  assert(Number.isSafeInteger(b.expected.revision)&&Number.isSafeInteger(b.expected.stateVersion),'invalid_activity_version','Reload the current activity revision.');
  const operation={type:action,...(action==='revise'?{draft:b.draft}:action==='verify'?{evidenceDigest:b.evidenceDigest}:action==='revoke'?{reason:b.reason}:{})};
  return {module:await store.transitionActivityReview(id(req.params.id),operation,who,b.expected,new Date(clock()))};
 });
}
