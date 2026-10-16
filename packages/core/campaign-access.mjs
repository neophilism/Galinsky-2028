import {timingSafeEqual} from 'node:crypto';
import {campaignFailure} from './campaign-content.mjs';
// Session decoding and role lookup are injected from the existing account system.
export function createCampaignAuthorization({enabled,config,accountStore,readCookie,validToken,tokenHash,clock=()=>Date.now()}){
 return async function authorize(req,{write=false,owner=false,upload=false}={}){
  if(!enabled||!config.adminLoginReady)campaignFailure('editor_unavailable','Editorial administration is not enabled.',503);
  const token=readCookie(req.headers.cookie,config.production?'__Host-g28':'g28-local');
  if(!validToken(token))campaignFailure('authentication_required','Sign in through the existing owner or editor account.',401);
  const session=await accountStore.session(tokenHash(token),clock());
  if(!session)campaignFailure('authentication_required','Your session has expired. Sign in again.',401);
  const role=await accountStore.adminRole(session.account,config.adminOwnerEmailKey);
  if(!(owner?['owner']:['owner','editor']).includes(role))campaignFailure('editor_forbidden','This account has no permission for this editorial action.',403);
  if(write){
   if(req.headers.origin!==config.portalOrigin||req.headers['sec-fetch-site']&&!['same-origin','none'].includes(req.headers['sec-fetch-site']))campaignFailure('origin_mismatch','Use the editor on its original website.',403);
   const received=req.headers['x-csrf-token'];
   if(typeof received!=='string'||received.length>256||typeof session.csrf!=='string')campaignFailure('csrf','Reload your editor session and retry.',403);
   const a=Buffer.from(received),b=Buffer.from(session.csrf);
   if(a.length!==b.length||!timingSafeEqual(a,b))campaignFailure('csrf','Reload your editor session and retry.',403);
  }
  if(!await accountStore.rate(`editorial:${upload?'upload':write?'write':'read'}:${session.account.id}`,upload?4:write?60:240,clock()+60000))campaignFailure('rate_limited','Too many editorial requests. Retry shortly.',429);
  return{actorId:session.account.id,role};
 };
}
