import {Coordination} from '../../../packages/core/coordination.mjs';
import {assert,email,exactKeys} from '../../../packages/core/validation.mjs';
import {emailKey} from '../../../packages/core/auth.mjs';
const uuid=value=>{assert(typeof value==='string'&&/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value),'invalid_id','Invalid identifier.');return value;};
export function registerCoordination(app,{store,config,clock,account,writeSession}){
 const service=new Coordination(store,clock);
 async function actor(req,write=false){
  assert(config.coordination,'coordination_unavailable','Team coordination is not released in this environment.',503);
  const session=await (write?writeSession(req):account(req));
  const owner=config.adminLoginReady&&await store.adminRole(session.account,config.adminOwnerEmailKey)==='owner';
  if(owner&&config.staffIdentity)assert(await store.staffMfaValid(session.account.id,session.hash,clock()),'mfa_required','Verify your staff passkey in Security settings.',403);
  // This preview integration does not claim staff MFA. Production enabling is
  // rejected by config until the staff identity package is actually delivered.
  return {...session.account,owner,mfaVerified:config.staffIdentity?await store.staffMfaValid(session.account.id,session.hash,clock()):false};
 }
 app.get('/api/teams',async req=>({teams:await service.list(await actor(req))}));
 app.post('/api/teams',async req=>service.create(await actor(req,true),req.body));
 app.get('/api/team-invitations',async req=>({invitations:await service.invitations(await actor(req))}));
 app.get('/api/teams/:id',async req=>service.view(await actor(req),uuid(req.params.id)));
 app.post('/api/teams/:id/:action',async req=>{
  const who=await actor(req,true);let body=req.body;
  if(config.staffIdentity&&!['accept','leave'].includes(req.params.action))assert(who.mfaVerified,'mfa_required','Verify your staff passkey before managing a team.',403);
  if(req.params.action==='invite'){const b=exactKeys(body,['email']);body={emailKey:emailKey(email(b.email),config.pepper)};}
  return service.change(who,uuid(req.params.id),req.params.action,body);
 });
 app.post('/api/teams/:id/events/:eventId/rsvp',async req=>service.rsvp(await actor(req,true),uuid(req.params.id),uuid(req.params.eventId),req.body));
}
