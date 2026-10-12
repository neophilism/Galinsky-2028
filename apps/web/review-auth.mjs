import {betterAuth} from 'better-auth';
import {admin,username} from 'better-auth/plugins';
import {toNodeHandler,fromNodeHeaders} from 'better-auth/node';
import {randomUUID,timingSafeEqual} from 'node:crypto';
import {readFile} from 'node:fs/promises';
import {safeReleaseCommit} from '../../packages/core/release-id.mjs';

export const REVIEW_BASE='/preview/auth';
const usernames=/^[a-z0-9][a-z0-9_.-]{2,39}$/;
const publicAuthPaths=new Map([
 ['/sign-in/username','POST'],['/sign-out','POST']
]);

// This identity realm is exclusively for reviewing public campaign pages.
// It has no grant, session, email-verification, or financial authority in the portal.
export function createReviewAuth({database,secret,origin,production=true}){
 if(typeof secret!=='string'||secret.length<32)throw Error('Private review authentication requires a separate secret.');
 const url=new URL(origin);
 if(url.origin!==origin||(production&&url.protocol!=='https:'))throw Error('Private review requires its exact HTTPS origin.');
 const auth=betterAuth({
  appName:'Galinsky 2028 private review',baseURL:origin,basePath:REVIEW_BASE,secret,database,
  trustedOrigins:[origin],logger:{disabled:true},telemetry:{enabled:false},
  emailAndPassword:{enabled:true,disableSignUp:true,minPasswordLength:12,maxPasswordLength:128,requireEmailVerification:false},
  user:{modelName:'g28_review_user',additionalFields:{previewExpiresAt:{type:'date',required:false,input:false},previewPasswordChangeRequired:{type:'boolean',required:false,input:false,defaultValue:false}}},
  session:{modelName:'g28_review_session',expiresIn:86400,updateAge:3600,cookieCache:{enabled:false}},
  account:{modelName:'g28_review_account',accountLinking:{enabled:false}},
  verification:{modelName:'g28_review_verification'},
  rateLimit:{enabled:true,storage:'database',modelName:'g28_review_rate_limit',window:60,max:30,
   customRules:{'/sign-in/username':{window:60,max:6}}},
  advanced:{cookiePrefix:'g28-review',useSecureCookies:production,
   defaultCookieAttributes:{httpOnly:true,sameSite:'lax',secure:production}},
  plugins:[username({minUsernameLength:3,maxUsernameLength:40,immutableUsername:true,
   usernameValidator:value=>usernames.test(value),displayUsername:false}),admin()],
  databaseHooks:{session:{create:{before:async session=>{
   const ctx=await auth.$context;
   const user=await ctx.internalAdapter.findUserById(session.userId);
   if(!user||user.banned||(user.previewExpiresAt&&new Date(user.previewExpiresAt)<=new Date()))return false;
   return {data:session};
  }}}}
 });
 return auth;
}

function fail(status,message){return Object.assign(new Error(message),{statusCode:status});}
function equal(a,b){if(typeof a!=='string'||typeof b!=='string')return false;const aa=Buffer.from(a),bb=Buffer.from(b);return aa.length===bb.length&&timingSafeEqual(aa,bb);}
function safeNext(value){return typeof value==='string'&&value.startsWith('/')&&!value.startsWith('//')&&!value.includes('\\')&&!/[\r\n]/.test(value)&&!value.startsWith('/preview/')?value:'/';}
function escaped(value){return String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}

function json(res,status,value){const body=JSON.stringify(value);res.writeHead(status,{'Content-Type':'application/json; charset=utf-8','Content-Length':Buffer.byteLength(body)});res.end(body);}
async function body(req,origin){
 if(req.headers.origin!==origin||req.headers['content-type']?.split(';')[0]!=='application/json'||
  (req.headers['sec-fetch-site']&&!['same-origin','none'].includes(req.headers['sec-fetch-site'])))throw fail(403,'Open this action in the private review website.');
 let bytes=0,parts=[];for await(const chunk of req){bytes+=chunk.length;if(bytes>8192)throw fail(413,'This request is too large.');parts.push(chunk);}
 try{const result=JSON.parse(Buffer.concat(parts).toString('utf8'));if(!result||Array.isArray(result)||typeof result!=='object')throw Error();return result;}catch{throw fail(400,'Provide a valid request.');}
}
function fields(value,allowed){if(Object.keys(value).some(key=>!allowed.includes(key)))throw fail(400,'This request contains an unsupported field.');return value;}
function credentials(value){
 if(typeof value.username!=='string'||!usernames.test(value.username))throw fail(400,'Use 3–40 lowercase letters, numbers, dots, underscores or hyphens for the username.');
 if(typeof value.name!=='string'||value.name.trim().length<1||value.name.length>80||/[\x00-\x1f]/.test(value.name))throw fail(400,'Enter a short display name.');
 if(typeof value.password!=='string'||value.password.length<12||value.password.length>128)throw fail(400,'Use a password of 12–128 characters.');
 const expiresAt=validExpiry(value.expiresAt);
 return {username:value.username,name:value.name.trim(),password:value.password,expiresAt};
}
function validExpiry(value){
 if(value===null||value===undefined||value==='')return null;
 if(typeof value!=='string'||value.length>40)throw fail(400,'Choose an expiration within the next year.');
 const date=new Date(value);
 if(!Number.isFinite(date.getTime())||date<=new Date()||date>new Date(Date.now()+365*86400000))throw fail(400,'Choose an expiration within the next year.');
 return date;
}
function publicUser(user){return {id:user.id,username:user.username,name:user.name,role:user.role==='admin'?'owner':'reviewer',disabled:user.banned===true,expiresAt:user.previewExpiresAt||null,passwordChangeRequired:user.previewPasswordChangeRequired===true,createdAt:user.createdAt};}

export function createReviewController({auth,database,pool,origin,setupKey,production=true,ownerState=null,commit=null}){
 const handler=toNodeHandler(auth);
 async function session(req){
  const result=await auth.api.getSession({headers:fromNodeHeaders(req.headers),query:{disableCookieCache:true}});
  if(!result||result.user.banned||(result.user.previewExpiresAt&&new Date(result.user.previewExpiresAt)<=new Date()))return null;
  return result;
 }
 async function owner(req){const s=await session(req);if(!s)throw fail(401,'Sign in to manage private review accounts.');if(s.user.role!=='admin')throw fail(403,'Only the preview owner can manage accounts.');return s;}
 async function setupAvailable(){
  if(!setupKey||setupKey.length<32)return false;
  if(ownerState)return !ownerState.claimed;
  const r=await pool.query('SELECT state FROM g28_review_setup WHERE id=1');
  return r.rows[0]?.state==='unclaimed';
 }
 async function claimSetup(){
  if(ownerState){if(ownerState.claimed)return false;ownerState.claimed=true;return true;}
  const r=await pool.query("UPDATE g28_review_setup SET state='claiming',updated_at=now() WHERE id=1 AND state='unclaimed' RETURNING id");return r.rowCount===1;
 }
 async function finishSetup(success){
  if(ownerState){ownerState.claimed=success;return;}
  await pool.query('UPDATE g28_review_setup SET state=$1,updated_at=now() WHERE id=1',[success?'claimed':'unclaimed']);
 }
 async function audit(actorId,action,subjectId){if(pool)await pool.query('INSERT INTO g28_review_audit(id,actor_id,action,subject_id) VALUES ($1,$2,$3,$4)',[randomUUID(),actorId,action,subjectId]);}
 return {session,owner,async handle(req,res,pathname){
  if(!pathname.startsWith('/preview/'))return false;
  res.setHeader('Content-Security-Policy',"default-src 'self'; script-src 'self'; style-src 'self'; connect-src 'self'; img-src 'self'; frame-ancestors 'none'; object-src 'none'; base-uri 'none'; form-action 'self'");
  try{
   if(pathname.startsWith(REVIEW_BASE+'/')&&pathname!==REVIEW_BASE+'/change-password'){
    const path=pathname.slice(REVIEW_BASE.length);
    if(publicAuthPaths.get(path)!==req.method){json(res,404,{message:'This account operation is unavailable.'});return true;}
    if(req.method==='POST'&&(req.headers.origin!==origin||req.headers['content-type']?.split(';')[0]!=='application/json'))throw fail(403,'Use the private review website for this action.');
    // The proxy headers are set by the application, never copied from the caller.
    req.headers.host=new URL(origin).host;delete req.headers['x-forwarded-host'];req.headers['x-forwarded-proto']=new URL(origin).protocol.slice(0,-1);
    await handler(req,res);return true;
   }
   if(pathname==='/preview/api/status'&&req.method==='GET'){
    const s=await session(req);json(res,200,{configured:true,commit:safeReleaseCommit(commit),setupAvailable:await setupAvailable(),user:s?publicUser(s.user):null});return true;
   }
   if(pathname==='/preview/api/setup'&&req.method==='POST'){
    const b=fields(await body(req,origin),['setupKey','username','name','password']);
    if(!equal(b.setupKey,setupKey)||!await setupAvailable())throw fail(403,'The setup key is invalid or owner setup has already been completed.');
    const c=credentials(b);if(!await claimSetup())throw fail(409,'Owner setup has already begun.');
    let created=false;
    try{const r=await auth.api.createUser({body:{email:randomUUID()+'@accounts.preview.invalid',name:c.name,password:c.password,role:'admin',data:{username:c.username}}});created=true;await finishSetup(true);await audit(r.user.id,'owner_created',r.user.id);json(res,201,{created:true,user:publicUser(r.user)});}catch(e){if(!created)await finishSetup(false);throw e;}
    return true;
   }
   if(pathname==='/preview/api/users'&&req.method==='GET'){
    await owner(req);const r=await auth.api.listUsers({headers:fromNodeHeaders(req.headers),query:{limit:100,sortBy:'createdAt',sortDirection:'desc'}});json(res,200,{users:r.users.map(publicUser)});return true;
   }
   if(pathname==='/preview/api/users'&&req.method==='POST'){
    const s=await owner(req);const b=fields(await body(req,origin),['username','name','password','expiresAt']);const c=credentials(b);
    const r=await auth.api.createUser({headers:fromNodeHeaders(req.headers),body:{email:randomUUID()+'@accounts.preview.invalid',name:c.name,password:c.password,role:'user',data:{username:c.username,previewExpiresAt:c.expiresAt,previewPasswordChangeRequired:true}}});
    await audit(s.user.id,'reviewer_created',r.user.id);json(res,201,{created:true,user:publicUser(r.user)});return true;
   }
   if(pathname==='/preview/auth/change-password'&&req.method==='POST'){
    const s=await session(req);if(!s)throw fail(401,'Sign in before changing your password.');
    const b=fields(await body(req,origin),['currentPassword','newPassword','revokeOtherSessions']);
    if(typeof b.currentPassword!=='string'||typeof b.newPassword!=='string'||b.newPassword===b.currentPassword)throw fail(400,'Choose a different password.');
    // Better Auth verifies the old credential and hashes the replacement.
    // Always revoke other sessions, regardless of caller-supplied preferences.
    const result=await auth.api.changePassword({headers:fromNodeHeaders(req.headers),body:{currentPassword:b.currentPassword,newPassword:b.newPassword,revokeOtherSessions:true},returnHeaders:true});
    const context=await auth.$context;
    await context.internalAdapter.updateUser(s.user.id,{previewPasswordChangeRequired:false});
    for(const cookie of result.headers.getSetCookie())res.appendHeader('Set-Cookie',cookie);
    await audit(s.user.id,'password_changed',s.user.id);json(res,200,{saved:true});return true;
   }
   const action=/^\/preview\/api\/users\/([A-Za-z0-9-]{1,80})\/(disable|enable|password|expiry)$/.exec(pathname);
   if(action&&req.method==='POST'){
    const s=await owner(req);const b=fields(await body(req,origin),action[2]==='password'?['password']:action[2]==='expiry'?['expiresAt']:[]);
    const existing=await auth.api.getUser({headers:fromNodeHeaders(req.headers),query:{id:action[1]}});
    if(existing.role!=='user')throw fail(403,'The owner account cannot be changed through reviewer controls.');
    if(action[2]==='password'){
     credentials({username:existing.username,name:existing.name,password:b.password});
     await auth.api.setUserPassword({headers:fromNodeHeaders(req.headers),body:{userId:existing.id,newPassword:b.password}});
     await auth.api.adminUpdateUser({headers:fromNodeHeaders(req.headers),body:{userId:existing.id,data:{previewPasswordChangeRequired:true}}});
     await auth.api.revokeUserSessions({headers:fromNodeHeaders(req.headers),body:{userId:existing.id}});
    }else if(action[2]==='expiry'){
     await auth.api.adminUpdateUser({headers:fromNodeHeaders(req.headers),body:{userId:existing.id,data:{previewExpiresAt:validExpiry(b.expiresAt)}}});
     await auth.api.revokeUserSessions({headers:fromNodeHeaders(req.headers),body:{userId:existing.id}});
    }else if(action[2]==='disable')await auth.api.banUser({headers:fromNodeHeaders(req.headers),body:{userId:existing.id,banReason:'Preview access revoked by owner'}});
    else await auth.api.unbanUser({headers:fromNodeHeaders(req.headers),body:{userId:existing.id}});
    await audit(s.user.id,'reviewer_'+action[2],existing.id);json(res,200,{saved:true});return true;
   }
   if(pathname==='/preview/assets/review.js'||pathname==='/preview/assets/review.css'){
    if(!['GET','HEAD'].includes(req.method))throw fail(405,'Method not allowed.');
    const js=pathname.endsWith('.js');const bytes=await readFile(new URL(js?'review.js':'review.css',import.meta.url));
    res.writeHead(200,{'Content-Type':js?'application/javascript; charset=utf-8':'text/css; charset=utf-8','Content-Length':bytes.length});res.end(req.method==='HEAD'?undefined:bytes);return true;
   }
   if(['GET','HEAD'].includes(req.method)&&['/preview/','/preview/admin/','/preview/setup/'].includes(pathname)){
    const title=pathname==='/preview/admin/'?'Manage preview accounts':pathname==='/preview/setup/'?'Set up your preview account':'Private policy preview';
    const html='<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex,nofollow"><title>'+escaped(title)+' | Galinsky 2028</title><link rel="stylesheet" href="/preview/assets/review.css"><script src="/preview/assets/review.js" defer></script></head><body><a class="skip" href="#main">Skip to content</a><header><a href="/preview/" class="brand">GALINSKY <span>2028</span></a><span>JUSTICE FOR ALL</span></header><main id="main" tabindex="-1" data-next="'+escaped(safeNext(new URL(req.url,origin).searchParams.get('next')))+'"><p class="eyebrow">PRIVATE POLICY REVIEW</p><h1>'+escaped(title)+'.</h1><div id="app" aria-live="polite"><p>Loading your account…</p></div><noscript><p>JavaScript is needed to sign in. No campaign pages are made public by this login screen.</p></noscript></main><footer>Phillip Galinsky for America · Private review access</footer></body></html>';
    res.writeHead(200,{'Content-Type':'text/html; charset=utf-8','Content-Length':Buffer.byteLength(html)});res.end(req.method==='HEAD'?undefined:html);return true;
   }
   json(res,404,{message:'Page not found.'});return true;
  }catch(e){const known=Number.isInteger(e.statusCode)||typeof e.status==='number';const status=e.statusCode||(typeof e.status==='number'?e.status:400);json(res,status>=400&&status<=599?status:400,{message:known?e.message:'The account operation could not be completed. Check the username and password and try again.'});return true;}
 }};
}
