import {assert,exactKeys} from '../../../packages/core/validation.mjs';
import {operationDefinition,operationId,operationReadiness,operationReport,operationKinds} from '../../../packages/core/operations.mjs';
import {staffCan} from '../../../packages/core/staff-permissions.mjs';
const uuid=x=>{assert(typeof x==='string'&&/^[a-f0-9]{8}-[a-f0-9]{4}-[1-8][a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i.test(x),'invalid_account_id','Use a verified account identifier.');return x;};
export function registerOperations(app,{store,config,account,writeSession,clock}){
 const ready=()=>assert(config.staffIdentity&&typeof store.withOperationTask==='function','operations_unavailable','Operational tasks require the configured staff identity release.',503);
 async function staff(req,scope,write=true){ready();const s=await (write?writeSession(req):account(req)),role=await store.adminRole(s.account,config.adminOwnerEmailKey);assert(staffCan(role,scope),'staff_forbidden','Your current role does not permit this action.',403);assert(await store.staffMfaValid(s.account.id,s.hash,clock()),'mfa_required','Verify your staff passkey first.',403);return {s,role};}
 app.get('/api/operations/:kind',async req=>{ready();const s=await account(req);assert(operationKinds.includes(req.params.kind),'invalid_operation_kind','Choose an available catalog.');const after=req.query?.after===undefined?'':operationId(req.query.after),page=await store.listOperations(req.params.kind,after);if(req.params.kind==='task'){const scopes=await store.operationPublicScopes(page.items.filter(t=>t.restricted).map(t=>t.moduleId));page.items=page.items.map(t=>({...t,...(t.restricted?{scope:scopes[t.moduleId]||null}:{})}));const role=await store.adminRole(s.account,config.adminOwnerEmailKey),canReview=staffCan(role,'task:review')&&await store.staffMfaValid(s.account.id,s.hash,clock());if(!canReview)page.items=page.items.map(({reviewers,...safe})=>safe);}return page;});
 app.post('/api/staff/operations/:kind',async req=>{
  const kind=req.params.kind;assert(operationKinds.includes(kind),'invalid_operation_kind','Choose an available catalog.');const {s}=await staff(req,kind==='training'?'training:manage':kind==='tool'?'tools:manage':'task:manage');
  const b=exactKeys(req.body,['definition','expected']);assert(b.expected===null||Number.isSafeInteger(b.expected)&&b.expected>0,'invalid_operation_version','Reload the current definition.');
  return {definition:await store.saveOperation(kind,operationDefinition(kind,b.definition),b.expected,s.account.id)};
 });
 app.get('/api/operations/mine/claims',async req=>{ready();const s=await account(req);return {claims:await store.ownClaims(s.account.id),training:await store.ownTraining(s.account.id)};});
 app.post('/api/staff/operations/training/:id/attest',async req=>{
  const {s}=await staff(req,'training:manage'),b=exactKeys(req.body,['accountId','revision','expiresAt','evidenceDigest','revoked']);
  const target=uuid(b.accountId);assert(target!==s.account.id,'independent_training','A different authorized trainer must verify training.',403);
  assert(Number.isSafeInteger(b.revision)&&b.revision>0&&/^[a-f0-9]{64}$/.test(b.evidenceDigest)&&typeof b.revoked==='boolean'&&Date.parse(b.expiresAt)>clock()&&Date.parse(b.expiresAt)<=clock()+366*86400000,'invalid_training_evidence','Record current source-bound training evidence and bounded expiry.');
  return {training:await store.attestTraining(target,operationId(req.params.id),{revision:b.revision,expiresAt:new Date(b.expiresAt).toISOString(),evidenceDigest:b.evidenceDigest,revoked:b.revoked},s.account.id)};
 });
 app.post('/api/operations/tools/:id/consent',async req=>{ready();const s=await writeSession(req),b=exactKeys(req.body,['revision','allowed']);assert(Number.isSafeInteger(b.revision)&&b.revision>0&&typeof b.allowed==='boolean','invalid_tool_consent','Choose the exact current tool permission.');return store.setToolConsent(s.account.id,operationId(req.params.id),b.revision,b.allowed);});
 app.post('/api/operations/tasks/:id/:action',async req=>{
  ready();const s=await writeSession(req),action=req.params.action;
  assert(['claim','release','report','handoff'].includes(action),'invalid_task_action','Choose a supported task action.');
  const b=exactKeys(req.body,['revision',...(action==='report'?['report']:[])]);assert(Number.isSafeInteger(b.revision)&&b.revision>0,'invalid_task_revision','Reload the current task.');
  assert(await store.rate('operation-task:'+s.account.id,60,clock()+60000),'rate_limited','Please wait before retrying.',429);
  return store.withOperationTask(operationId(req.params.id),s.account.id,async tx=>{
   const {task,claim}=tx;assert(task.revision===b.revision,'stale_task','Task requirements changed. Reload them.',409);
   if(action==='release'){assert(claim&&!['verified','released'].includes(claim.status),'invalid_task_state','No releasable assignment.',409);await tx.save({...claim,status:'released',releasedAt:new Date(clock()).toISOString()});await tx.audit(s.account.id,'task_released');return {released:true};}
   const decision=operationReadiness(task,tx.context,clock());assert(decision.allowed,'task_unavailable',decision.reason,403);
   if(action==='claim'){
    assert(!claim||claim.status==='released'||claim.status==='rejected','task_already_claimed','You already have this assignment.',409);
    assert(tx.claims.filter(c=>!['released','rejected'].includes(c.status)).length<task.capacity,'task_full','This assignment is full.',409);
    const record={revision:task.revision,status:'claimed',claimedAt:new Date(clock()).toISOString()};await tx.save(record);await tx.audit(s.account.id,'task_claimed');return {claim:record};
   }
   assert(claim&&claim.revision===task.revision&&claim.status==='claimed','invalid_task_state','Claim this current task before continuing.',409);
   if(action==='report'){const record={...claim,status:'reported',report:operationReport(b.report),reportedAt:new Date(clock()).toISOString()};await tx.save(record);await tx.audit(s.account.id,'task_reported');return {claim:record,notice:'Signed-in aggregate report; it is self-reported until separately reviewed. Never include supporter identities.'};}
   assert(task.restricted&&tx.context.tool&&tx.consent?.allowed&&tx.consent.revision===tx.context.tool.revision,'tool_permission_required','Review the current approved tool and opt in before opening it.',403);
   await tx.audit(s.account.id,'task_tool_handoff');return {url:tx.context.tool.url,notice:'No account, report or supporter data is sent by this link. External tool accounts and retained copies have their own access lifecycle.'};
  });
 });
 app.post('/api/staff/operations/tasks/:id/review',async req=>{
  const {s,role}=await staff(req,'task:review'),b=exactKeys(req.body,['accountId','revision','decision']);uuid(b.accountId);
  assert(['verified','rejected'].includes(b.decision)&&Number.isSafeInteger(b.revision),'invalid_task_review','Choose a current report and review decision.');assert(b.accountId!==s.account.id,'independent_report_review','You cannot verify your own report.',403);
  return store.withOperationTask(operationId(req.params.id),b.accountId,async tx=>{
   assert(role==='owner'||role==='coordinator'||tx.task.reviewers.includes(s.account.id),'task_review_scope','This task is outside your assigned review scope.',403);
   assert(tx.task.revision===b.revision&&tx.claim?.revision===b.revision&&tx.claim.status==='reported','stale_report','The current report is not ready for review.',409);
   const record={...tx.claim,status:b.decision,reviewedBy:s.account.id,reviewedAt:new Date(clock()).toISOString()};await tx.save(record);await tx.audit(s.account.id,'task_report_'+b.decision);return {claim:record};
  });
 });
 app.get('/api/staff/operations/tasks/:id/reports',async req=>{
  const {s,role}=await staff(req,'task:review',false);return store.withOperationTask(operationId(req.params.id),s.account.id,async tx=>{assert(role==='owner'||role==='coordinator'||tx.task.reviewers.includes(s.account.id),'task_review_scope','This task is outside your review scope.',403);return {task:tx.task,claims:tx.claims.map(c=>({accountId:c.accountId,revision:c.revision,status:c.status,report:c.report,reviewedAt:c.reviewedAt}))};});
 });
}
