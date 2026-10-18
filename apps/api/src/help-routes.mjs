import {assert,exactKeys} from '../../../packages/core/validation.mjs';
import {HELP_NOTE,normalizeHelpRequest} from '../../../packages/core/help-requests.mjs';

const uuid=value=>{
 assert(typeof value==='string'&&/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value),
  'invalid_help_id','The request identifier is invalid.');
 return value;
};

export function registerHelpRoutes(app,{store,config,account,writeSession,adminAccount,clock=()=>Date.now()}){
 const available=()=>assert(config.helpRequests===true,'help_unavailable',
  'The non-sensitive help request workflow is not released. No request has been stored.',503);
 app.get('/api/help/requests',async req=>{
  available();
  const s=await account(req);
  return {requests:await store.listHelpRequests(s.account.id),notice:HELP_NOTE};
 });
 app.post('/api/help/requests',async(req,reply)=>{
  available();
  const s=await writeSession(req);
  const details=normalizeHelpRequest(req.body);
  const ok=await store.rate('help-requests:'+s.account.id,12,clock()+86400000);
  assert(ok,'help_rate_limited','Please wait before creating more requests.',429);
  const record=await store.createHelpRequest(s.account.id,details);
  return reply.code(201).send({request:record,notice:HELP_NOTE});
 });
 app.post('/api/help/requests/:id/withdraw',async req=>{
  available();
  const s=await writeSession(req);
  exactKeys(req.body,[]);
  const record=await store.changeHelpRequest(uuid(req.params.id),s.account.id,'withdraw','volunteer',s.account.id);
  return {request:record};
 });
 app.get('/api/help/staff/requests',async req=>{
  available();
  await adminAccount(req,{roles:['owner']});
  return {requests:await store.listStaffHelpRequests(),notice:
   'Category and area only. Do not infer an incident report or a guaranteed response. No volunteer identities are shown.'};
 });
 app.post('/api/help/staff/requests/:id/:action',async req=>{
  available();
  const {session}=await adminAccount(req,{write:true,roles:['owner']});
  exactKeys(req.body,[]);
  assert(['acknowledge','resolve'].includes(req.params.action),
   'invalid_help_action','Choose a supported change.');
  const record=await store.changeHelpRequest(
   uuid(req.params.id),null,req.params.action,'staff',session.account.id);
  return {request:record};
 });
}
