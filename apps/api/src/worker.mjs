import {loadConfig} from './config.mjs';
import {databasePool,PostgresStore} from './postgres-store.mjs';
import {openDelivery} from '../../../packages/core/auth.mjs';
import {escapeHtml} from '../../../packages/core/validation.mjs';
export async function deliverLogin(job,config,transport=fetch){
 const p=openDelivery(job.payload_envelope,config.deliveryKey);
 if(!p.expires||p.expires<=Date.now())return 'expired';
 const u=new URL(p.url);if(u.origin!==config.portalOrigin||u.pathname!=='/verify')return 'invalid_destination';
 const result=await transport('https://api.resend.com/emails',{method:'POST',signal:AbortSignal.timeout(10000),headers:{Authorization:`Bearer ${config.mailKey}`,'Content-Type':'application/json','Idempotency-Key':`g28-login-${job.id}`},body:JSON.stringify({from:config.mailFrom,to:[p.email],subject:'Your Galinsky 2028 volunteer sign-in link',html:`<p>Use this link in the browser where you requested it. It expires in 15 minutes.</p><p><a href="${escapeHtml(p.url)}">Continue to your volunteer workspace</a></p><p>If you did not request this message, you can ignore it. No subscription is required to use your account.</p>`})});
 if(!result.ok)return result.status===429?'provider_rate_limited':result.status>=500?'provider_unavailable':'provider_rejected';return null;
}
async function main(){const config=loadConfig();if(!config.databaseUrl||!config.mailReady||!config.signup)throw new Error('Worker requires the database and enabled account delivery.');const store=new PostgresStore(databasePool(config.databaseUrl));let stopped=false;for(const s of ['SIGTERM','SIGINT'])process.on(s,()=>{stopped=true;});let loops=0;
 do{const job=await store.claimJob();if(job){let err;try{err=await deliverLogin(job,config);}catch{err='delivery_failed';}await store.finishJob(job,err);console.log(JSON.stringify({event:'delivery_result',id:job.id,result:err||'sent'}));}else if(!process.argv.includes('--once'))await new Promise(r=>setTimeout(r,2000));if(++loops%100===0)await store.cleanup();}while(!stopped&&!process.argv.includes('--once'));await store.cleanup();await store.close();}
if(process.argv[1]&&import.meta.url===new URL('file://'+process.argv[1]).href)main().catch(()=>{console.error('Worker stopped: configuration or delivery storage is unavailable.');process.exitCode=1;});
