import Fastify from 'fastify';
import {randomUUID,timingSafeEqual} from 'node:crypto';
import {DomainError,assert,email,exactKeys,id} from '../../../packages/core/validation.mjs';
import {randomToken,tokenHash,emailKey,validToken,sealDelivery,sessionCookie,readCookie} from '../../../packages/core/auth.mjs';
import {roles,recommendRole} from '../../../packages/core/roles.mjs';
import {forms} from '../../../packages/core/forms.mjs';
import {materialSearch,canReadMaterial,publicMaterial} from '../../../packages/core/content.mjs';
import {readableVersion,matchesReading} from '../../../packages/core/material-reading.mjs';
import {starterTasks,taskDecision} from '../../../packages/core/tasks.mjs';
import {previewAuthorized,PREVIEW_REALM,PREVIEW_ROBOTS} from '../../../packages/core/preview-gate.mjs';
export function createApp({store,config,clock=()=>Date.now()}){
 const app=Fastify({logger:false,bodyLimit:32768,trustProxy:false,requestTimeout:15000});
 if(config.production&&!config.previewGate)throw Error('Production portal must be behind the private preview password gate.');
 if(config.previewGate)app.addHook('onRequest',async(req,reply)=>{
  reply.header('Cache-Control','private, no-store').header('Vary','Authorization').header('X-Robots-Tag',PREVIEW_ROBOTS);
  if(!previewAuthorized(req.headers.authorization,config.previewGate))return reply.code(401).header('WWW-Authenticate',PREVIEW_REALM).type('text/plain').send('Private preview. Enter your access credentials.');
 });
 const cookieName=config.production?'__Host-g28':'g28-local';const bindingCookie=config.production?'__Host-g28-login':'g28-local-login';
 app.addHook('onRequest',async(req,reply)=>{
  reply.header('Cache-Control','no-store').header('X-Content-Type-Options','nosniff').header('Referrer-Policy','no-referrer').header('X-Frame-Options','DENY');
  reply.header('Content-Security-Policy',"default-src 'self'; script-src 'self'; style-src 'self'; connect-src 'self'; img-src 'self' data:; object-src 'none'; base-uri 'none'; form-action 'self'; frame-ancestors 'none'");
  if(config.production)reply.header('Strict-Transport-Security','max-age=31536000');
  if(req.url.startsWith('/api/protected/')||req.url.startsWith('/api/admin/')||req.url.startsWith('/api/payments/'))return reply.code(503).send({error:'release_unavailable',message:'This function is not released. No submission has been stored.'});
  if(!['GET','HEAD','OPTIONS'].includes(req.method)){
   assert(req.headers.origin===config.portalOrigin,'origin_mismatch','Open this action in the volunteer application.',403);
   assert(!req.headers['sec-fetch-site']||['same-origin','none'].includes(req.headers['sec-fetch-site']),'cross_site','Cross-site actions are not accepted.',403);
   assert(req.headers['content-type']?.split(';')[0]==='application/json','content_type','Use a JSON request.',415);
  }
 });
 app.setErrorHandler((err,req,reply)=>{const known=err instanceof DomainError;const status=known?err.status:err.statusCode===413?413:400<=err.statusCode&&err.statusCode<500?err.statusCode:500;reply.code(status).send({error:known?err.code:status===500?'internal_error':'invalid_request',message:known?err.message:status===500?'The request could not be completed. Please try again.':'The request was not accepted.'});});
 async function account(req){const t=readCookie(req.headers.cookie,cookieName);assert(validToken(t),'authentication_required','Sign in to your volunteer workspace.',401);const s=await store.session(tokenHash(t),clock());assert(s,'authentication_required','Your session has expired. Please sign in again.',401);return s;}
 async function writeSession(req){const s=await account(req);const supplied=req.headers['x-csrf-token'];assert(typeof supplied==='string'&&supplied.length===s.csrf.length&&timingSafeEqual(Buffer.from(supplied),Buffer.from(s.csrf)),'csrf','Reload the workspace and try again.',403);return s;}
 app.get('/healthz',async()=>({ok:true,service:'galinsky-2028-api',version:'0.1.0',commit:config.commit??null}));
 app.get('/readyz',async(req,reply)=>{try{await store.healthy();return {ready:true};}catch{return reply.code(503).send({ready:false});}});
 app.get('/api/config',async()=>({publicOrigin:config.publicOrigin,signupEnabled:config.signup,features:{materials:true,worksheets:true,protectedSubmissions:false,staff:false,payments:false},notice:config.signup?null:'Account registration opens when verified email delivery is connected.'}));
 app.post('/api/auth/request',async(req,reply)=>{
  assert(config.signup,'signup_unavailable','Account registration is not open yet. No account has been created.',503);
  const b=exactKeys(req.body,['email','marketing','termsAccepted']);const address=email(b.email);assert(b.termsAccepted===true,'terms_required','Review the participation and privacy notices before continuing.');assert(b.marketing===undefined||typeof b.marketing==='boolean','invalid_consent','Choose whether to receive optional campaign updates.');
  const key=emailKey(address,config.pepper),now=clock(),until=now+900000;
  const byEmail=await store.rate('email:'+key,4,until);const byIp=await store.rate('ip:'+emailKey(req.ip,config.pepper),20,until);
  const response={message:'When delivery is available, a sign-in link will arrive shortly. Open it in this browser. Check your spam folder before requesting another link.'};
  if(!byEmail||!byIp)return reply.code(202).send(response);
  const token=randomToken(),binding=randomToken();const deliveryEnvelope=sealDelivery({email:address},config.deliveryKey);
  const record={hash:tokenHash(token),binding:tokenHash(binding),emailKey:key,deliveryEnvelope,marketing:b.marketing===true,termsVersion:config.termsVersion,expires:until};
  const job={id:randomUUID(),kind:'account_login',envelope:sealDelivery({email:address,url:`${config.portalOrigin}/verify#token=${token}`,expires:until},config.deliveryKey)};
  await store.requestLogin(record,job);
  reply.header('Set-Cookie',`${bindingCookie}=${binding}; Path=/; HttpOnly; SameSite=Lax; Max-Age=900${config.production?'; Secure':''}`);
  return reply.code(202).send(response);
 });
 app.post('/api/auth/verify',async(req,reply)=>{
  assert(config.signup,'signup_unavailable','Account registration is not open yet.',503);
  const b=exactKeys(req.body,['token']);const binding=readCookie(req.headers.cookie,bindingCookie);
  assert(validToken(b.token)&&validToken(binding),'invalid_link','This link is invalid or belongs to another browser. Request a new link in this browser.');
  const token=randomToken();const s={hash:tokenHash(token),csrf:randomToken(),expires:clock()+86400000};
  const a=await store.consumeLogin(tokenHash(b.token),tokenHash(binding),s,clock());assert(a,'invalid_link','This link has expired or has already been used. Request a new link.');
  reply.header('Set-Cookie',[sessionCookie(token,{secure:config.production}),`${bindingCookie}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0${config.production?'; Secure':''}`]);return {verified:true};
 });
 app.get('/api/session',async req=>{const s=await account(req);return {account:{id:s.account.id,verified:true,marketing:s.account.marketing,role:'volunteer'},csrf:s.csrf,expires:s.expires};});
 app.post('/api/auth/logout',async(req,reply)=>{const s=await writeSession(req);await store.logout(s.hash);reply.header('Set-Cookie',sessionCookie('',{secure:config.production,maxAge:0}));return {signedOut:true};});
 app.get('/api/account/role-preferences',async req=>{
  const s=await account(req);
  return {preferences:await store.getRolePreferences(s.account.id)};
 });
 app.post('/api/account/role-preferences',async req=>{
  const s=await writeSession(req);
  const b=exactKeys(req.body,['roleId','minutes','willingToTrain']);
  assert(typeof b.roleId==='string'&&roles.some(r=>r.id===b.roleId),'invalid_role','Choose one of the twelve available volunteer roles.');
  assert(Number.isSafeInteger(b.minutes)&&[15,30,120,240].includes(b.minutes),'invalid_time','Select one of the provided time options.');
  assert(typeof b.willingToTrain==='boolean','invalid_training','Choose whether you are willing to train.');
  const preferences={roleId:b.roleId,minutes:b.minutes,willingToTrain:b.willingToTrain};
  await store.setRolePreferences(s.account.id,preferences);
  return {saved:true,preferences,activityAuthorized:false};
 });
 app.get('/api/account/export',async(req,reply)=>{
  const s=await account(req);
  const data=await store.accountActivityExport(s.account.id);
  assert(data,'authentication_required','Your account is no longer available.',401);
  // No email ciphertext, login tokens, rate-limit identifiers, or third-party
  // records may be included. Finance/legal retention is a separate process.
  return reply.header('Cache-Control','private, no-store')
   .header('Content-Disposition','attachment; filename="galinsky-volunteer-account.json"')
   .type('application/json; charset=utf-8')
   .send({schemaVersion:1,exportedAt:new Date(clock()).toISOString(),...data,
    limitations:'This export includes volunteer account activity stored in this application. Required finance and legally retained records, if any, are handled separately.'});
 });
 app.post('/api/account/revoke-sessions',async(req,reply)=>{
  const s=await writeSession(req);
  const b=exactKeys(req.body,['confirm']);
  assert(b.confirm==='sign out everywhere','confirmation','Confirm signing out all devices.');
  await store.revokeAllSessions(s.account.id);
  reply.header('Set-Cookie',sessionCookie('',{secure:config.production,maxAge:0}));
  return {signedOutAll:true};
 });
 app.post('/api/account/consent',async req=>{const s=await writeSession(req);const b=exactKeys(req.body,['marketing']);assert(typeof b.marketing==='boolean','invalid_consent','Select a valid preference.');await store.consent(s.account.id,b.marketing);return {saved:true};});
 app.post('/api/account/close',async(req,reply)=>{const s=await writeSession(req);const b=exactKeys(req.body,['confirm']);assert(b.confirm==='close my account','confirmation','Confirm account closure.');await store.closeAccount(s.account.id);reply.header('Set-Cookie',sessionCookie('',{secure:config.production,maxAge:0}));return {closed:true};});
 app.get('/api/account/bookmarks',async req=>{
  const s=await account(req);
  const ids=await store.listBookmarks(s.account.id);
  const current=await store.listMaterials();
  const approved=new Set(current.filter(m=>canReadMaterial(m,s.account)).map(m=>m.id));
  return {materialIds:ids.filter(x=>approved.has(x))};
 });
 app.post('/api/materials/:id/bookmark',async req=>{
  const s=await writeSession(req);
  const materialId=id(req.params.id);
  const b=exactKeys(req.body,['saved']);
  assert(typeof b.saved==='boolean','invalid_bookmark','Choose whether to save this guide.');
  const item=(await store.listMaterials()).find(m=>m.id===materialId);
  assert(item&&canReadMaterial(item,s.account),'not_found','This guide is not available.',404);
  await store.setBookmark(s.account.id,materialId,b.saved);
  return {materialId,saved:b.saved,storedInAccount:true};
 });
 app.get('/api/materials',async req=>{const s=await account(req);const list=materialSearch(await store.listMaterials(),String(req.query.q||''),String(req.query.category||'all'),s.account);return {materials:list.map(m=>{const x=publicMaterial(m);delete x.body;return x;}),notice:list.length?null:'Current materials are being prepared and reviewed. Unreviewed historical files are not published as current guidance.'};});
 app.get('/api/materials/:id',async req=>{
  const session=await account(req);
  const key=id(req.params.id);
  const m=(await store.listMaterials()).find(m=>m.id===key);
  assert(m&&canReadMaterial(m,session.account),'not_found','This material is not available.',404);
  const ack=await store.readMaterialAck(session.account.id,m.id);
  return {...publicMaterial(m),acknowledged:matchesReading(m,session.account,ack),readingNotice:'Reading this guide is not training certification or authorization for regulated activity.'};
 });
 app.post('/api/materials/:id/reading',async req=>{
  const session=await writeSession(req);
  const body=exactKeys(req.body,['revision','acknowledged']);
  assert(Number.isSafeInteger(body.revision)&&body.revision>0&&typeof body.acknowledged==='boolean','invalid_reading','Choose the current revision and reading acknowledgment.');
  const key=id(req.params.id);
  const m=(await store.listMaterials()).find(m=>m.id===key);
  assert(m&&canReadMaterial(m,session.account),'not_found','This material is not available.',404);
  assert(body.revision===m.revision,'stale_material','The guide changed. Read the current version before acknowledging.',409);
  const record=body.acknowledged?readableVersion(m,session.account):null;
  await store.setMaterialAck(session.account.id,m.id,record);
  return {materialId:key,revision:m.revision,acknowledged:body.acknowledged,trainingCertified:false,activityAuthorized:false};
 });
 app.get('/api/materials/:id/download',async(req,reply)=>{const s=await account(req);const key=id(req.params.id);const m=(await store.listMaterials()).find(m=>m.id===key);assert(m&&canReadMaterial(m,s.account),'not_found','This material is not available.',404);return reply.header('Content-Disposition',`attachment; filename="${key}-v${m.revision}.md"`).type('text/plain; charset=utf-8').send(m.body);});
 app.get('/api/roles',async()=>({roles}));
 app.get('/api/role-recommendation',async req=>recommendRole({interest:String(req.query.interest||'network'),minutes:Number(req.query.minutes)||30,willingToTrain:req.query.training!=='no'}));
 app.get('/api/forms',async req=>{await account(req);return {forms};});
 app.get('/api/tasks',async req=>{
  const s=await account(req);
  const done=new Set(await store.listTaskCompletion(s.account.id));
  const tasks=starterTasks.map(t=>({...t,completed:!t.restricted&&done.has(t.id),decision:taskDecision(t,s.account,null,{},new Date(clock()))}));
  return {tasks,completed:tasks.filter(t=>t.completed).length,total:tasks.filter(t=>!t.restricted).length,tracking:'Account-only checklist. Completion is self-reported, not verified campaign work.'};
 });
 app.post('/api/tasks/:id/completion',async req=>{
  const s=await writeSession(req);
  const b=exactKeys(req.body,['completed']);assert(typeof b.completed==='boolean','invalid_status','Choose complete or not complete.');
  const task=starterTasks.find(t=>t.id===id(req.params.id));
  assert(task,'not_found','This checklist action does not exist.',404);
  assert(!task.restricted,'restricted_action','Restricted campaign activity cannot be self-certified as completed.',403);
  const decision=taskDecision(task,s.account,null,{},new Date(clock()));
  assert(decision.allowed,'inactive_task',decision.reason,403);
  await store.setTaskCompletion(s.account.id,task.id,b.completed);
  return {id:task.id,completed:b.completed,verified:false};
 });
 app.get('/api/activity-status',async req=>{await account(req);return {modules:[],notice:'No regulated activity module is currently active. Reading a playbook does not authorize the activity.'};});
 return app;
}
