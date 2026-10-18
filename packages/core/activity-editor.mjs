import {assert,exactKeys,safeText,httpsUrl} from './validation.mjs';
import {activityDecision} from './activity.mjs';

// A state machine for planned, versioned campaign activity modules.
// It does NOT grant a volunteer permission, enable production staff access
// or publish material by itself. Authorization and storage come later.
const FIELDS=['id','jurisdiction','election','activity','validFrom','validUntil','training','approvedTools','sources'];
const HASH=/^[a-f0-9]{64}$/i;
const REVOCATION_REASONS=['source_withdrawn','activity_suspended','jurisdiction_changed','tool_revoked','other_review_required'];
const own=(x,scope)=>x?.verified===true&&typeof x?.id==='string'&&x.id.length>0&&
 Array.isArray(x.scopes)&&x.scopes.includes(scope);
const dateValue=(value,name)=>{
 assert(typeof value==='string'&&/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d(?:\.\d{1,3})?Z$/.test(value)&&Number.isFinite(Date.parse(value)),
  'invalid_activity_date','An exact UTC '+name+' time is required.');
 return new Date(value).toISOString();
};
const uniqueText=(values,maxItems,name)=>{
 assert(Array.isArray(values)&&values.length>0&&values.length<=maxItems,
  'invalid_activity_list','Choose a bounded nonempty '+name+' list.');
 const normalized=values.map(item=>safeText(item,120).trim());
 assert(normalized.every(Boolean)&&new Set(normalized).size===normalized.length,
  'invalid_activity_list','List entries must be distinct and nonempty.');
 return normalized;
};
const staff=(actor,scope)=>assert(own(actor,scope),'staff_permission_required','Verified, scoped staff access is required.',403);

export function validateActivitySource(input,now=new Date()){
 const b=exactKeys(input,['url','checkedAt','digest']);
 const parsed=new URL(httpsUrl(b.url));
 assert(!parsed.username&&!parsed.password&&!parsed.port&&!parsed.search&&!parsed.hash,
  'invalid_activity_source','An official stable HTTPS source URL is required.');
 assert(parsed.hostname.includes('.')&&!parsed.hostname.endsWith('.local')&&
  !['localhost','127.0.0.1'].includes(parsed.hostname)&&!/^\d+\.\d+\.\d+\.\d+$/.test(parsed.hostname),
  'invalid_activity_source','A public official source hostname is required.');
 assert(typeof b.digest==='string'&&HASH.test(b.digest),
  'invalid_activity_digest','A checked source file digest is required.');
 const checkedAt=dateValue(b.checkedAt,'source checked');
 const checked=Date.parse(checkedAt),current=+now;
 assert(checked<=current+60000&&checked>=current-30*86400000,
  'stale_activity_source','Reverify official sources within the last 30 days.');
 return {url:parsed.toString(),checkedAt,digest:b.digest.toLowerCase()};
}

export function validateActivityDraft(input,now=new Date()){
 const b=exactKeys(input,FIELDS);
 assert(typeof b.id==='string'&&/^[a-z][a-z0-9-]{2,79}$/.test(b.id),
  'invalid_activity_id','Use a stable activity identifier.');
 const jurisdiction=safeText(b.jurisdiction,120).trim(),
  election=safeText(b.election,120).trim(),activity=safeText(b.activity,120).trim();
 assert(jurisdiction&&election&&activity,'invalid_activity_scope','All activity scope fields are required.');
 const validFrom=dateValue(b.validFrom,'valid-from');
 const validUntil=dateValue(b.validUntil,'valid-until');
 assert(Date.parse(validUntil)>Date.parse(validFrom)&&Date.parse(validUntil)>+now,
  'invalid_activity_window','The activity window must end in the future and follow its start.');
 assert(Array.isArray(b.sources)&&b.sources.length>=1&&b.sources.length<=8,
  'invalid_activity_sources','One to eight verified official sources are required.');
 const sources=b.sources.map(s=>validateActivitySource(s,now));
 assert(new Set(sources.map(s=>s.url)).size===sources.length,
  'invalid_activity_sources','Official source URLs must be distinct.');
 return {id:b.id,jurisdiction,election,activity,validFrom,validUntil,
  training:uniqueText(b.training,24,'training'),
  approvedTools:uniqueText(b.approvedTools,12,'approved tools'),sources};
}

export function createActivityDraft(input,actor,now=new Date()){
 staff(actor,'activity:edit');
 const draft=validateActivityDraft(input,now);
 return {...draft,revision:1,stateVersion:1,status:'draft',
  authoredBy:actor.id,verifiers:[],approval:null,revocation:null};
}

export function reviseActivityDraft(latest,input,actor,expected,now=new Date()){
 staff(actor,'activity:edit');
 assert(latest&&Number.isSafeInteger(latest.revision),'invalid_activity_state','Current module revision is required.');
 assert(latest.revision===expected?.revision&&latest.stateVersion===expected?.stateVersion,
  'stale_activity_edit','This activity record changed. Refresh before editing.',409);
 const draft=validateActivityDraft(input,now);
 assert(draft.id===latest.id,'activity_id_immutable','Module identity cannot be changed.');
 return {...draft,revision:latest.revision+1,stateVersion:1,status:'draft',
  authoredBy:actor.id,verifiers:[],approval:null,revocation:null};
}
export function verifyActivityDraft(latest,actor,evidenceDigest,expected){
 staff(actor,'activity:verify');
 assert(latest?.status==='draft','invalid_activity_state','Only a draft can be verified.',409);
 assert(latest.revision===expected?.revision&&latest.stateVersion===expected?.stateVersion,
  'stale_activity_edit','This activity record changed. Refresh before reviewing.',409);
 assert(actor.id!==latest.authoredBy,'independent_activity_review',
  'The draft author cannot independently verify their own work.',403);
 assert(typeof evidenceDigest==='string'&&HASH.test(evidenceDigest),
  'invalid_review_evidence','The verifier must record a source-bound evidence digest.');
 assert(!(latest.verifiers||[]).some(v=>v.id===actor.id),
  'duplicate_activity_verifier','This reviewer already verified this revision.',409);
 return {...latest,stateVersion:latest.stateVersion+1,verifiers:[
  ...(latest.verifiers||[]),{id:actor.id,revision:latest.revision,evidence:evidenceDigest.toLowerCase()}
 ]};
}
export function publishActivityDraft(latest,actor,expected,now=new Date()){
 staff(actor,'activity:publish');
 assert(latest?.status==='draft','invalid_activity_state','Only a draft can be published.',409);
 assert(latest.revision===expected?.revision&&latest.stateVersion===expected?.stateVersion,
  'stale_activity_edit','This activity record changed. Refresh before publication.',409);
 const verifiers=latest.verifiers||[];
 assert(new Set(verifiers.filter(v=>v.revision===latest.revision&&HASH.test(v.evidence||'')).map(v=>v.id)).size>=2,
  'missing_review','Two independent verifiers must review the exact current revision.');
 assert(verifiers.every(v=>v.id!==actor.id),
  'independent_activity_approval','The publisher cannot act as one of the independent verifiers.',403);
 // Check source currency AGAIN at publication time.
 const fields=Object.fromEntries(FIELDS.map(k=>[k,latest[k]]));
 const validated=validateActivityDraft(fields,now);
 const candidate={...latest,...validated,status:'published',approval:{by:actor.id,revision:latest.revision},
  stateVersion:latest.stateVersion+1};
 const check=activityDecision(candidate,{
  jurisdiction:candidate.jurisdiction,election:candidate.election,activity:candidate.activity,
  tool:candidate.approvedTools[0],completedTraining:candidate.training
 },now);
 assert(check.allowed,'activity_publication_denied',
  'Module publication prerequisites are incomplete: '+check.reason,409);
 // Published requirements still do not authorize a real participant.
 return candidate;
}
export function revokeActivityModule(latest,actor,expected,reason){
 staff(actor,'activity:publish');
 assert(latest?.status==='published','invalid_activity_state','Only the latest published module can be revoked.',409);
 assert(latest.revision===expected?.revision&&latest.stateVersion===expected?.stateVersion,
  'stale_activity_edit','This activity record changed. Refresh before revocation.',409);
 assert(REVOCATION_REASONS.includes(reason),'invalid_revocation_reason','Choose a standard revocation reason.');
 return {...latest,revision:latest.revision+1,stateVersion:1,status:'revoked',
  authoredBy:actor.id,verifiers:[],approval:null,revocation:{reason}};
}
export const publicActivityDraftFields=FIELDS;
