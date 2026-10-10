import {assert} from './validation.mjs';
/** An ACTIVE string alone never authorizes an activity. All evidence and scope must match. */
export function activityDecision(module,request,now=new Date()){
 const deny=reason=>({allowed:false,state:'inactive',reason});
 if(!module)return deny('No current approved activity module is available.');
 if(module.status!=='published')return deny('This module has not been published.');
 for(const key of ['jurisdiction','election','activity'])if(module[key]!==request[key])return deny(`The ${key} does not match this activity.`);
 const start=Date.parse(module.validFrom),end=Date.parse(module.validUntil);
 if(!Number.isFinite(start)||!Number.isFinite(end)||start>+now||end<=+now||end<=start)return deny('The module is not currently valid.');
 const verifiers=module.verifiers||[];
 if(verifiers.length<2||new Set(verifiers.map(v=>v.id)).size<2||verifiers.some(v=>!v.id||v.revision!==module.revision||!v.evidence))return deny('Two distinct verifiers must review this exact revision.');
 if(!module.approval?.by||module.approval.revision!==module.revision)return deny('Campaign publication approval is required for this revision.');
 if(!module.sources?.length||module.sources.some(s=>!s.url?.startsWith('https://')||!s.checkedAt))return deny('Current official source evidence is required.');
 if(!module.approvedTools?.includes(request.tool))return deny('Use an approved tool for this activity.');
 if((module.training||[]).some(t=>!request.completedTraining?.includes(t)))return deny('Complete the current required training first.');
 return {allowed:true,state:'active',reason:'The supplied module, training and tool match this activity.',revision:module.revision};
}
export function transitionModule(draft,action,actor){
 assert(actor?.id,'unauthorized','Sign in with an authorized staff identity.',401);
 if(action.type==='verify'){
  assert(actor.scopes?.includes('activity:verify'),'forbidden','Verifier permission required.',403);
  assert(draft.status==='draft','invalid_state','Only a draft can be verified.');
  return {...draft,verifiers:[...(draft.verifiers||[]).filter(v=>v.id!==actor.id),{id:actor.id,revision:draft.revision,evidence:action.evidence}]};
 }
 if(action.type==='publish'){
  assert(actor.scopes?.includes('activity:publish'),'forbidden','Publication permission required.',403);
  assert(new Set((draft.verifiers||[]).filter(v=>v.revision===draft.revision&&v.evidence).map(v=>v.id)).size>=2,'missing_review','Two distinct verifiers must review this revision.');
  return {...draft,status:'published',approval:{by:actor.id,revision:draft.revision}};
 }
 throw new Error('Unsupported module transition');
}
