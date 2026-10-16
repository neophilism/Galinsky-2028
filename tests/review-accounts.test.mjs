import test from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {getMigrations} from 'better-auth/db/migration';
import {mkdtemp,writeFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {createReviewAuth,createReviewController} from '../apps/web/review-auth.mjs';
import {createPrivatePreviewServer} from '../apps/web/private-preview.mjs';

test('real password accounts isolate reviewers, enforce revocation/expiry and keep previews private',async()=>{
 const directory=await mkdtemp(join(tmpdir(),'g28-review-'));
 await writeFile(join(directory,'index.html'),'<h1>Campaign policy review</h1>');
 const database=new DatabaseSync(':memory:');
 const origin='http://127.0.0.1:4321',setupKey='synthetic-review-setup-key-32-characters';
 const auth=createReviewAuth({database,origin,secret:'synthetic-review-auth-secret-32-characters',production:false});
 const migration=await getMigrations(auth.options);await migration.runMigrations();
 const controller=createReviewController({auth,database,origin,setupKey,production:false,ownerState:{claimed:false}});
 const server=createPrivatePreviewServer({directory,reviewController:controller,env:{PREVIEW_ACCESS_USER:'preview',PREVIEW_ACCESS_PASSWORD:'synthetic-existing-preview-password-32-characters',G28_REVIEW_ACCOUNTS_ENABLED:'true'}});
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 const base='http://127.0.0.1:'+server.address().port;
 function client(){let jar=new Map();return {async call(path,body,headers={}){
  const response=await fetch(base+path,{method:body?'POST':'GET',headers:{...(body?{'Content-Type':'application/json',Origin:origin}:{}),Cookie:[...jar].map(([k,v])=>k+'='+v).join('; '),...headers},body:body?JSON.stringify(body):undefined,redirect:'manual'});
  for(const cookie of response.headers.getSetCookie()){const pair=cookie.split(';')[0],index=pair.indexOf('=');jar.set(pair.slice(0,index),pair.slice(index+1));}
  return response;
 }};}
 const owner=client(),reader=client(),other=client();
 try{
  const sharedCredentials='Basic '+Buffer.from('preview:synthetic-existing-preview-password-32-characters').toString('base64');
  const anonymous=await reader.call('/');
  assert.equal(anonymous.status,401);
  assert.match(anonymous.headers.get('www-authenticate')||'',/^Basic realm=/,
   'The shared password must trigger the native browser sign-in dialog even when individual accounts are enabled');
  assert.equal((await reader.call('/',null,{Authorization:sharedCredentials})).status,200,
   'Existing shared credentials still unlock the site');
  const wrongShared=await reader.call('/',null,{Authorization:'Basic '+Buffer.from('preview:wrong-password').toString('base64')});
  assert.equal(wrongShared.status,401);
  assert.match(wrongShared.headers.get('www-authenticate')||'',/^Basic realm=/,
   'Wrong shared credentials must remain denied and recoverable');
  const individualLogin=await reader.call('/preview/');
  assert.equal(individualLogin.status,200);
  assert.equal(individualLogin.headers.get('www-authenticate'),null,
   'The independent reviewer sign-in page remains available without the Basic challenge');
  assert.equal((await reader.call('/preview/assets/review.js')).status,200);
  assert.equal((await reader.call('/preview/auth/admin/create-user',{name:'Intruder',email:'intruder@example.test',password:'long-enough-password',role:'admin'})).status,404);
  assert.equal((await reader.call('/preview/auth/sign-up/email',{name:'Intruder',email:'intruder@example.test',password:'long-enough-password'})).status,404);
  assert.equal((await reader.call('/preview/api/setup',{setupKey:'wrong',username:'owner',name:'Owner',password:'owner-password-12345'})).status,403);
  const setup=await owner.call('/preview/api/setup',{setupKey,username:'owner',name:'Preview Owner',password:'owner-password-12345'});
  assert.equal(setup.status,201,await setup.clone().text());
  assert.equal((await owner.call('/preview/api/setup',{setupKey,username:'another',name:'Other',password:'other-password-12345'})).status,403);
  const signIn=await owner.call('/preview/auth/sign-in/username',{username:'owner',password:'owner-password-12345'});
  assert.equal(signIn.status,200,await signIn.clone().text());
  assert.match(signIn.headers.getSetCookie().join(';'),/HttpOnly/);
  assert.match(signIn.headers.getSetCookie().join(';'),/SameSite=Lax/);
  assert.equal((await owner.call('/preview/api/status').then(r=>r.json())).user.role,'owner');
  const created=await owner.call('/preview/api/users',{username:'reader',name:'Policy Reviewer',password:'reader-password-12345',expiresAt:new Date(Date.now()+86400000).toISOString()});
  assert.equal(created.status,201,await created.clone().text());const user=(await created.json()).user;
  assert.equal(user.role,'reviewer');
  assert(!Object.hasOwn(user,'password'));
  assert(!JSON.stringify(user).includes('reader-password-12345'));
  const password=database.prepare('SELECT password FROM g28_review_account WHERE "userId"=?').get(user.id).password;
  assert(password&&!password.includes('reader-password-12345'),'Persist only a library-generated password hash');
  assert.equal((await reader.call('/preview/auth/sign-in/username',{username:'reader',password:'reader-password-12345'})).status,200);
  assert.equal((await reader.call('/')).status,303,'Initial and reset credentials must be replaced');
  assert.equal((await reader.call('/healthz')).status,403);
  assert.equal((await reader.call('/admin')).status,403);
  assert.equal((await reader.call('/api/admin/settings')).status,403);
  assert.equal((await reader.call('/preview/api/users')).status,403);
  assert.equal((await reader.call('/preview/auth/get-session')).status,404);
  assert.equal((await reader.call('/donate/stripe')).status,403);
  assert.equal((await reader.call('/donate/continue')).status,403);
  assert.equal((await reader.call('/preview/api/users',{username:'hidden',name:'Hidden',password:'hidden-password-12345'})).status,403);
  assert.equal((await reader.call('/preview/auth/change-password',{currentPassword:'reader-password-12345',newPassword:'changed-password-12345',revokeOtherSessions:true})).status,200);
  assert.equal((await reader.call('/')).status,200,'The chosen password unlocks policy reading');
  assert.equal((await other.call('/preview/auth/sign-in/username',{username:'reader',password:'reader-password-12345'})).status,401);
  assert.equal((await other.call('/preview/auth/sign-in/username',{username:'reader',password:'changed-password-12345'})).status,200);
  const disabled=await owner.call('/preview/api/users/'+user.id+'/disable',{});assert.equal(disabled.status,200,await disabled.clone().text());
  assert.equal((await reader.call('/')).status,401,'Revocation immediately invalidates an existing reader session');
  assert.equal((await other.call('/')).status,401);
  assert.equal((await other.call('/preview/auth/sign-in/username',{username:'reader',password:'changed-password-12345'})).status,403);
  // This long journey deliberately contains more login attempts than the real
  // per-minute limit. Advance the test boundary without weakening production.
  database.prepare('DELETE FROM g28_review_rate_limit').run();
  assert.equal((await owner.call('/preview/api/users/'+user.id+'/enable',{})).status,200);
  assert.equal((await reader.call('/preview/auth/sign-in/username',{username:'reader',password:'changed-password-12345'})).status,200);
  assert.equal((await owner.call('/preview/api/users/'+user.id+'/password',{password:'reset-password-12345'})).status,200);
  assert.equal((await reader.call('/')).status,401);
  assert.equal((await reader.call('/preview/auth/sign-in/username',{username:'reader',password:'reset-password-12345'})).status,200);
  assert.equal((await reader.call('/')).status,303);
  assert.equal((await reader.call('/preview/auth/change-password',{currentPassword:'reset-password-12345',newPassword:'final-password-12345'})).status,200);
  database.prepare('UPDATE g28_review_user SET previewExpiresAt=? WHERE id=?').run(Date.now()-1000,user.id);
  assert.equal((await reader.call('/')).status,401,'Expiry also checks existing sessions');
  assert.equal((await owner.call('/preview/api/users/'+user.id+'/expiry',{expiresAt:new Date(Date.now()+86400000).toISOString()})).status,200);
  assert.equal((await reader.call('/preview/auth/sign-in/username',{username:'reader',password:'final-password-12345'})).status,200);
  assert.equal((await reader.call('/')).status,200);
  const ownerRecord=(await owner.call('/preview/api/status').then(r=>r.json())).user;
  assert.equal((await owner.call('/preview/api/users/'+ownerRecord.id+'/disable',{})).status,403);
  const cross=await owner.call('/preview/api/users',{username:'cross',name:'Cross',password:'cross-password-12345'},{Origin:'https://attacker.example.test'});assert.equal(cross.status,403);
  assert.equal((await owner.call('/preview/api/users',{username:'bad',name:'Bad',password:'bad-password-12345',role:'admin'})).status,400);
  const users=await owner.call('/preview/api/users').then(r=>r.json());assert.equal(users.users.length,2);
  assert(!JSON.stringify(users).includes('accounts.preview.invalid'),'Do not expose internal nondeliverable identifiers');
  assert.equal((await owner.call('/preview/auth/sign-out',{})).status,200);
  assert.equal((await owner.call('/preview/api/users')).status,401);
  database.prepare('DELETE FROM g28_review_rate_limit').run();
  for(let i=0;i<6;i++)assert.equal((await other.call('/preview/auth/sign-in/username',{username:'unknown',password:'not-the-password-12345'})).status,401);
  assert.equal((await other.call('/preview/auth/sign-in/username',{username:'unknown',password:'not-the-password-12345'})).status,429,'Password guessing is rate limited');
 }finally{await new Promise(resolve=>server.close(resolve));database.close();await rm(directory,{recursive:true,force:true});}
});
