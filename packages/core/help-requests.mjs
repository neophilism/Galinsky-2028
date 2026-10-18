import {assert,exactKeys} from './validation.mjs';

// The first release deliberately handles structured, NON-SENSITIVE help
// metadata only. There is no incident narrative, attachment or message field.
// Protected incidents require the separate recipient-key/E2EE release.
export const HELP_KINDS=Object.freeze([
 'account_correction','material_correction','accessibility','privacy_question'
]);
export const HELP_AREAS=Object.freeze([
 'account','portal','materials','issues','homepage','volunteer'
]);
export const MAX_OPEN_HELP_REQUESTS=3;
export const HELP_NOTE='Requests contain only a category and page area. No free-text, evidence, medical details or emergency reports are accepted. This is not an emergency service; return here for status. No reply time is promised.';

const own=(value,allowed)=>allowed.includes(value);
export function normalizeHelpRequest(input){
 const b=exactKeys(input,['kind','area']);
 assert(typeof b.kind==='string'&&own(b.kind,HELP_KINDS),
  'invalid_help_kind','Choose an available help or correction category.');
 assert(typeof b.area==='string'&&own(b.area,HELP_AREAS),
  'invalid_help_area','Choose the campaign area affected.');
 if(b.kind==='material_correction')
  assert(['materials','issues'].includes(b.area),'invalid_help_area','Choose materials or issues for a published-content correction.');
 if(b.kind==='account_correction')
  assert(['account','portal'].includes(b.area),'invalid_help_area','Choose account or portal for an account-data correction.');
 if(b.kind==='privacy_question')
  assert(['account','portal'].includes(b.area),'invalid_help_area','Choose account or portal for a privacy request.');
 return {kind:b.kind,area:b.area};
}

export function nextHelpStatus(current,action,role){
 assert(['volunteer','staff'].includes(role),'help_forbidden','This action is not available.',403);
 const transitions=role==='volunteer'
  ? {withdraw:{received:'withdrawn',acknowledged:'withdrawn',withdrawn:'withdrawn'}}
  : {acknowledge:{received:'acknowledged',acknowledged:'acknowledged'},
     resolve:{acknowledged:'resolved',resolved:'resolved'}};
 const next=transitions[action]?.[current];
 assert(next,'help_status_conflict','The request changed or cannot be updated in this state.',409);
 return next;
}
