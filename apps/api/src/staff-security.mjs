import {prepareAccountNotice} from './mail-notices.mjs';
import {queueNoticeSQL} from './mail-store.mjs';
import {randomUUID} from 'node:crypto';
import {STAFF_ROLES} from '../../../packages/core/staff-permissions.mjs';
import {generateRegistrationOptions,verifyRegistrationResponse,generateAuthenticationOptions,verifyAuthenticationResponse} from '@simplewebauthn/server';
import {assert,exactKeys} from '../../../packages/core/validation.mjs';

const empty=()=>({credentials:[],challenges:{},sessions:{}});
const copy=x=>structuredClone(x);
function trim(state,now){
 for(const [key,v] of Object.entries(state.challenges))if(v.expires<=now)delete state.challenges[key];
 for(const [key,v] of Object.entries(state.sessions))if(v.expires<=now)delete state.sessions[key];
}
export const postgresStaffSecurity={
 async withStaffSecurity(accountId,change,{noticeConfig=null,now=Date.now()}={}){
  const c=await this.pool.connect();
  try{
   await c.query('BEGIN');
   const a=await c.query('SELECT id FROM g28.accounts WHERE id=$1 FOR UPDATE',[accountId]);
   assert(a.rowCount===1,'authentication_required','Sign in again.',401);
   const r=await c.query('SELECT record FROM g28.staff_security WHERE account_id=$1 FOR UPDATE',[accountId]);
   const state=r.rows[0]?.record||empty(),before=JSON.stringify(state.credentials),result=await change(state);
   await c.query(`INSERT INTO g28.staff_security(account_id,record) VALUES($1,$2)
    ON CONFLICT(account_id) DO UPDATE SET record=EXCLUDED.record,updated_at=now()`,[accountId,state]);
   if(noticeConfig&&before!==JSON.stringify(state.credentials)){const a=(await c.query('SELECT email_key,delivery_envelope FROM g28.accounts WHERE id=$1',[accountId])).rows[0];await queueNoticeSQL(c,accountId,'security:'+randomUUID(),prepareAccountNotice(a,noticeConfig,'account_security',now));}
   await c.query('COMMIT');return result;
  }catch(e){await c.query('ROLLBACK');throw e;}finally{c.release();}
 },
 async staffMfaValid(accountId,sessionHash,now){
  const r=await this.pool.query('SELECT record FROM g28.staff_security WHERE account_id=$1',[accountId]);
  return validMfa(r.rows[0]?.record,sessionHash,now);
 }
};
export const memoryStaffSecurity={
 async withStaffSecurity(accountId,change,{noticeConfig=null,now=Date.now()}={}){
  this.staffSecurity??=new Map();this.staffSecurityLocks??=new Map();
  const previous=this.staffSecurityLocks.get(accountId)||Promise.resolve();
  const next=previous.catch(()=>{}).then(async()=>{
   assert(this.accounts.has(accountId),'authentication_required','Sign in again.',401);
   const state=copy(this.staffSecurity.get(accountId)||empty()),before=JSON.stringify(state.credentials),result=await change(state);
   if(noticeConfig&&before!==JSON.stringify(state.credentials)){const a=await this.deliveryAccount(accountId);await this.queueAccountNotice(accountId,'security:'+randomUUID(),prepareAccountNotice(a,noticeConfig,'account_security',now));}
   this.staffSecurity.set(accountId,state);return result;
  });
  this.staffSecurityLocks.set(accountId,next);
  try{return await next;}finally{if(this.staffSecurityLocks.get(accountId)===next)this.staffSecurityLocks.delete(accountId);}
 },
 async staffMfaValid(accountId,sessionHash,now){return this.accounts.has(accountId)&&validMfa(this.staffSecurity?.get(accountId),sessionHash,now);}
};
function validMfa(state,sessionHash,now){
 const current=state?.sessions?.[sessionHash];
 return Boolean(current&&current.expires>now&&state.credentials.some(c=>c.id===current.credentialId));
}
export function registerStaffSecurity(app,{store,config,clock,account,writeSession,webauthn={generateRegistrationOptions,verifyRegistrationResponse,generateAuthenticationOptions,verifyAuthenticationResponse}}){
 const origin=config.portalOrigin,rpID=new URL(origin).hostname;
 const enabled=()=>assert(config.staffIdentity===true,'staff_unavailable','Staff device verification is not enabled.',503);
 async function actor(req,write=false){
  enabled();const s=await (write?writeSession(req):account(req));
  const role=config.adminLoginReady&&await store.adminRole(s.account,config.adminOwnerEmailKey);
  assert(['owner',...STAFF_ROLES].includes(role),'staff_forbidden','A current staff invitation is required.',403);
  assert(await store.rate('staff-security:'+s.account.id,30,clock()+60000),'rate_limited','Please wait before retrying.',429);
  return s;
 }
 const metadata=(state,s)=>({credentials:state.credentials.map(c=>({id:c.id,label:c.label,createdAt:c.createdAt})),verified:validMfa(state,s.hash,clock()),stepUpSeconds:900});
 app.get('/api/staff/security',async req=>{const s=await actor(req);return store.withStaffSecurity(s.account.id,st=>metadata(st,s));});
 app.post('/api/staff/security/register/options',async req=>{
  const s=await actor(req,true);exactKeys(req.body,[]);
  return store.withStaffSecurity(s.account.id,async state=>{
   trim(state,clock());
   assert(state.credentials.length<8,'device_limit','Remove an unused passkey before adding another.',409);
   if(state.credentials.length)assert(validMfa(state,s.hash,clock()),'mfa_required','Verify an existing passkey first.',403);
   else assert(s.expires-clock()>86400000-600000,'fresh_login_required','Request a new email sign-in link before enrolling your first passkey.',403);
   const options=await webauthn.generateRegistrationOptions({rpName:'Campaign staff',rpID,
    supportedAlgorithmIDs:[-7,-257],userName:s.account.id,userID:new TextEncoder().encode(s.account.id),attestationType:'none',
    authenticatorSelection:{residentKey:'preferred',userVerification:'required'},
    excludeCredentials:state.credentials.map(c=>({id:c.id,transports:c.transports}))});
   state.challenges[s.hash]={kind:'register',challenge:options.challenge,expires:clock()+300000};return options;
  });
 });
 app.post('/api/staff/security/register/verify',async req=>{
  const s=await actor(req,true),body=exactKeys(req.body,['response','label']);
  assert(typeof body.label==='string'&&body.label.trim().length>=2&&body.label.length<=80&&!/[\x00-\x1f]/.test(body.label),'invalid_label','Choose a short device label.');
  // Consume the challenge in a separate committed transaction, even if proof
  // validation fails. Errors never reopen a used challenge for another attempt.
  const challenge=await consume(s,'register');
  let result;try{result=await webauthn.verifyRegistrationResponse({response:body.response,expectedChallenge:challenge,expectedOrigin:origin,expectedRPID:rpID,requireUserVerification:true});}catch{assert(false,'invalid_device_proof','Passkey verification failed. Start again.',403);}
  assert(result?.verified&&result.registrationInfo?.userVerified,'invalid_device_proof','A verified authenticator is required.',403);
  return store.withStaffSecurity(s.account.id,state=>{
   const c=result.registrationInfo.credential;
   assert(state.credentials.length<8&&!state.credentials.some(x=>x.id===c.id),'duplicate_device','This passkey is already enrolled or the device limit was reached.',409);
   // A second enrollment must still have fresh existing-device authority after
   // the browser ceremony; removing keys in another session invalidates it.
   if(state.credentials.length)assert(validMfa(state,s.hash,clock()),'mfa_required','Verify an existing passkey again.',403);
   state.credentials.push({id:c.id,publicKey:Buffer.from(c.publicKey).toString('base64url'),counter:c.counter,transports:c.transports||[],label:body.label.trim(),createdAt:new Date(clock()).toISOString()});
   state.sessions[s.hash]={credentialId:c.id,expires:Math.min(s.expires,clock()+900000)};
   return metadata(state,s);
  },{noticeConfig:config.mailReady?config:null,now:clock()});
 });
 app.post('/api/staff/security/authenticate/options',async req=>{
  const s=await actor(req,true);exactKeys(req.body,[]);
  return store.withStaffSecurity(s.account.id,async state=>{
   trim(state,clock());assert(state.credentials.length,'device_required','Enroll a passkey first.',409);
   const options=await webauthn.generateAuthenticationOptions({rpID,userVerification:'required',allowCredentials:state.credentials.map(c=>({id:c.id,transports:c.transports}))});
   state.challenges[s.hash]={kind:'authenticate',challenge:options.challenge,expires:clock()+300000};return options;
  });
 });
 app.post('/api/staff/security/authenticate/verify',async req=>{
  const s=await actor(req,true),body=exactKeys(req.body,['response']),challenge=await consume(s,'authenticate');
  return store.withStaffSecurity(s.account.id,async state=>{
   const c=state.credentials.find(c=>c.id===body.response?.id);assert(c,'unknown_device','This passkey is not enrolled for your account.',403);
   let result;try{result=await webauthn.verifyAuthenticationResponse({response:body.response,expectedChallenge:challenge,expectedOrigin:origin,expectedRPID:rpID,requireUserVerification:true,credential:{id:c.id,publicKey:new Uint8Array(Buffer.from(c.publicKey,'base64url')),counter:c.counter,transports:c.transports}});}catch{assert(false,'invalid_device_proof','Passkey verification failed. Start again.',403);}
   assert(result?.verified&&result.authenticationInfo?.userVerified,'invalid_device_proof','User verification is required.',403);
   c.counter=result.authenticationInfo.newCounter;
   state.sessions[s.hash]={credentialId:c.id,expires:Math.min(s.expires,clock()+900000)};return metadata(state,s);
  });
 });
 app.post('/api/staff/security/revoke',async req=>{
  const s=await actor(req,true),b=exactKeys(req.body,['id']);
  return store.withStaffSecurity(s.account.id,state=>{
   assert(validMfa(state,s.hash,clock()),'mfa_required','Verify an enrolled passkey before revoking a device.',403);
   assert(typeof b.id==='string'&&state.credentials.some(c=>c.id===b.id),'unknown_device','This device was not found.',404);
   state.credentials=state.credentials.filter(c=>c.id!==b.id);
   for(const [hash,v] of Object.entries(state.sessions))if(v.credentialId===b.id)delete state.sessions[hash];
   state.challenges={};return metadata(state,s);
  },{noticeConfig:config.mailReady?config:null,now:clock()});
 });
 async function consume(s,kind){return store.withStaffSecurity(s.account.id,state=>{
  const c=state.challenges[s.hash];delete state.challenges[s.hash];
  return c?.kind===kind&&c.expires>clock()?c.challenge:null;
 }).then(value=>{assert(value,'invalid_challenge','This passkey request expired or was used. Start again.',403);return value;});}
}
