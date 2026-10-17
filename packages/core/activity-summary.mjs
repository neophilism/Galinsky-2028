import {activityDecision} from './activity.mjs';

// Read-only projection of published activity module prerequisites. Do not
// return verifier identities, source documents, private approvals or tokens.
const safe=value=>typeof value==='string'&&value.length>0&&value.length<=120&&
 !/[\x00-\x1f\x7f<>]/.test(value);
export function summarizePublishedModule(module,now=new Date()){
 if(!module||module.status!=='published')return null;
 for(const field of ['id','jurisdiction','election','activity'])if(!safe(module[field]))return null;
 const until=Date.parse(module.validUntil);
 if(!Number.isFinite(until))return null;
 const requirement={jurisdiction:module.jurisdiction,election:module.election,activity:module.activity,
  tool:Array.isArray(module.approvedTools)?module.approvedTools[0]:undefined,
  completedTraining:Array.isArray(module.training)?module.training:[]};
 // The hypothetical completion checks *administrative* publication validity;
 // no user-specific training, authorization or tool access is granted.
 const decision=activityDecision(module,requirement,now);
 return {id:module.id,jurisdiction:module.jurisdiction,election:module.election,
  activity:module.activity,revision:module.revision,validUntil:new Date(until).toISOString(),
  publishedCurrent:decision.allowed,reason:decision.allowed?
   'Current published requirements exist. Individual training and activity authorization are still required.':decision.reason,
  requiredTrainingCount:Array.isArray(module.training)?module.training.length:0,
  activityAuthorized:false};
}
