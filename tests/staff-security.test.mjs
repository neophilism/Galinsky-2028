import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID,createHash,generateKeyPairSync,randomBytes,sign} from 'node:crypto';
import {isoCBOR} from '@simplewebauthn/server/helpers';
import {createApp} from '../apps/api/src/app.mjs';
import {MemoryStore} from '../apps/api/src/memory-store.mjs';
import {randomToken,tokenHash,sealDelivery} from '../packages/core/auth.mjs';

const digest=x=>createHash('sha256').update(x).digest();
const encoded=x=>Buffer.from(x).toString('base64url');
function device(){
 const {publicKey,privateKey}=generateKeyPairSync('ec',{namedCurve:'prime256v1'}),jwk=publicKey.export({format:'jwk'}),id=randomBytes(32);
 const cose=isoCBOR.encode(new Map([[1,2],[3,-7],[-1,1],[-2,new Uint8Array(Buffer.from(jwk.x,'base64url'))],[-3,new Uint8Array(Buffer.from(jwk.y,'base64url'))]]));
 return {id,privateKey,cose};
}
function response(d,options,{register=false,origin='http://localhost:4322',verified=true,counter=1}={}){
 const client=Buffer.from(JSON.stringify({type:register?'webauthn.create':'webauthn.get',challenge:options.challenge,origin,crossOrigin:false}));
 const n=Buffer.alloc(4);n.writeUInt32BE(counter);
 let auth=Buffer.concat([digest('localhost'),Buffer.from([(verified?5:1)|(register?64:0)]),n]);
 const base={id:encoded(d.id),rawId:encoded(d.id),type:'public-key',clientExtensionResults:{}};
 if(register){
  const len=Buffer.alloc(2);len.writeUInt16BE(d.id.length);auth=Buffer.concat([auth,Buffer.alloc(16),len,d.id,Buffer.from(d.cose)]);
  return {...base,response:{clientDataJSON:encoded(client),attestationObject:encoded(isoCBOR.encode(new Map([['fmt','none'],['attStmt',new Map()],['authData',new Uint8Array(auth)]]))),transports:['internal']}};
 }
 return {...base,response:{clientDataJSON:encoded(client),authenticatorData:encoded(auth),signature:encoded(sign('sha256',Buffer.concat([auth,digest(client)]),d.privateKey)),userHandle:null}};
}
function setup(){
 let now=Date.now();const store=new MemoryStore(),id=randomUUID(),token=randomToken(),hash=tokenHash(token),csrf=randomToken();
 store.accounts.set(id,{id,emailKey:'owner-key',verified:true});store.sessions.set(hash,{hash,accountId:id,expires:now+86400000,csrf});
 const config={portalOrigin:'http://localhost:4322',publicOrigin:'http://localhost:4321',staffIdentity:true,adminLoginReady:true,adminOwnerEmailKey:'owner-key'};
 const app=createApp({store,config,clock:()=>now});
 const headers={origin:config.portalOrigin,cookie:'g28-local='+token,'content-type':'application/json','x-csrf-token':csrf};
 const post=(path,payload={},h=headers)=>app.inject({method:'POST',url:'/api/staff/security/'+path,headers:h,payload});
 return {app,store,id,hash,headers,post,config,advance:n=>now+=n};
}
test('real WebAuthn verification binds registration and step-up to account, challenge, origin, user verification and revocation',async()=>{
 const s=setup(),d=device();
 try{
  assert.equal((await s.app.inject({url:'/api/admin/operations',headers:s.headers})).statusCode,403);
  assert.equal((await s.post('register/options',{}, {...s.headers,'x-csrf-token':'wrong'})).statusCode,403);
  const options=(await s.post('register/options')).json();
  assert.equal(options.authenticatorSelection.userVerification,'required');
  const registered=await s.post('register/verify',{response:response(d,options,{register:true,counter:0}),label:'Synthetic device'});
  assert.equal(registered.statusCode,200,registered.body);assert.equal(registered.json().verified,true);
  assert(!registered.body.includes('publicKey'));
  assert.equal((await s.app.inject({url:'/api/admin/operations',headers:s.headers})).statusCode,200);
  assert.equal((await s.post('register/verify',{response:response(d,options,{register:true}),label:'Replay'})).statusCode,403);
  s.advance(901000);
  assert.equal((await s.app.inject({url:'/api/admin/operations',headers:s.headers})).statusCode,403);
  const auth=(await s.post('authenticate/options')).json();
  const wrongOrigin=await s.post('authenticate/verify',{response:response(d,auth,{origin:'http://other.test'})});
  assert.equal(wrongOrigin.statusCode,403);
  assert.equal((await s.post('authenticate/verify',{response:response(d,auth)})).statusCode,403,'failed attempts consume challenge');
  const noUV=(await s.post('authenticate/options')).json();
  assert.equal((await s.post('authenticate/verify',{response:response(d,noUV,{verified:false})})).statusCode,403);
  const valid=(await s.post('authenticate/options')).json();
  const accepted=await s.post('authenticate/verify',{response:response(d,valid)});
  assert.equal(accepted.statusCode,200,accepted.body);
  const reused=(await s.post('authenticate/options')).json();
  assert.equal((await s.post('authenticate/verify',{response:response(d,reused)})).statusCode,403,'reused authenticator counter is rejected');
  const revoked=await s.post('revoke',{id:encoded(d.id)});
  assert.equal(revoked.statusCode,200);assert.equal(revoked.json().verified,false);
  assert.equal((await s.app.inject({url:'/api/admin/operations',headers:s.headers})).statusCode,403);
  assert.equal((await s.post('register/options')).statusCode,403,'old email session cannot re-enroll after losing last device');
 }finally{await s.app.close();}
});
test('staff invitation revocation and foreign-account credentials never preserve privileged access',async()=>{
 const s=setup();try{
  s.store.accounts.get(s.id).emailKey='ordinary-volunteer';
  assert.equal((await s.post('register/options')).statusCode,403);
  assert.equal((await s.app.inject({url:'/api/staff/security',headers:s.headers})).statusCode,403);
  assert.equal((await s.app.inject({url:'/api/staff/security'})).statusCode,401);
 }finally{await s.app.close();}
});

test('credential enrollment and revocation commit a generic encrypted security notice with the device change',async()=>{
 const s=setup(),d=device();s.config.mailReady=true;s.config.deliveryKey=randomBytes(32).toString('base64');
 s.store.accounts.get(s.id).deliveryEnvelope=sealDelivery({email:'synthetic-security@example.test'},s.config.deliveryKey);
 try{
  const options=(await s.post('register/options')).json();
  assert.equal((await s.post('register/verify',{response:response(d,options,{register:true,counter:0}),label:'Fixture device'})).statusCode,200);
  assert.equal(s.store.outbox.length,1);assert.equal(s.store.outbox[0].kind,'account_security');
  assert.equal((await s.post('revoke',{id:encoded(d.id)})).statusCode,200);
  assert.equal(s.store.outbox.length,2);
  assert(!JSON.stringify(s.store.outbox).includes('synthetic-security@example.test'));assert(!JSON.stringify(s.store.outbox).includes('Fixture device'));
 }finally{await s.app.close();}
});
