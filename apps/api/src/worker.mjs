import {loadConfig} from './config.mjs';
import {setTimeout as sleep} from 'node:timers/promises';
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

function safeLog(logger,event){
 try{logger(JSON.stringify(event));}catch{ /* Logging cannot requeue a committed send. */ }
}
export async function processOneMailJob({store,config,transport=fetch,logger=console.log}){
 const job=await store.claimJob();
 if(!job)return false;
 let outcome;
 try{
  outcome=job.kind==='account_login'
   ? await deliverLogin(job,config,transport)
   : 'provider_rejected';
 }catch{
  // Never log addresses, token fragments, delivery envelopes or the provider reply.
  outcome='delivery_failed';
 }
 await store.finishJob(job,outcome);
 safeLog(logger,{event:'delivery_result',id:job.id,result:outcome||'sent'});
 return true;
}
// This is an actual durable database-leased queue consumer, not a mock sender.
// Multiple portal replicas may run it: PostgreSQL SKIP LOCKED leases prevent
// two workers from initially claiming the same queued message, and Resend
// idempotency keys prevent re-sends after a crashed lease.
// With no verified sender/provider it CANNOT activate registration.
export async function runMailQueueLoop({
 store,config,transport=fetch,logger=console.log,signal,
 pollMs=2000,maxIterations=Infinity
}={}){
 if(!store||!config?.signup||!config.mailReady||!config.databaseUrl)
  throw new Error('Email worker requires a real database, verified sender configuration and enabled account delivery.');
 if(!Number.isSafeInteger(pollMs)||pollMs<50||pollMs>30000)
  throw new Error('Invalid mail polling interval.');
 if(maxIterations!==Infinity&&(!Number.isSafeInteger(maxIterations)||maxIterations<1))
  throw new Error('Invalid queue iteration count.');
 let iterations=0,processed=0,storageFailures=0;
 async function wait(ms){
  if(signal?.aborted)return;
  try{await sleep(ms,undefined,{signal});}
  catch(e){if(e?.name!=='AbortError')throw e;}
 }
 while(!signal?.aborted && iterations<maxIterations){
  iterations++;
  try{
   const dispatched=await processOneMailJob({store,config,transport,logger});
   if(dispatched)processed++;
   else await wait(pollMs);
   if(iterations%100===0)await store.cleanup();
  }catch{
   storageFailures++;
   safeLog(logger,{event:'delivery_storage_retry',code:'temporary_storage_failure'});
   await wait(Math.max(pollMs,2000));
  }
 }
 // Cleanup is best-effort; a transient database error during shutdown must
 // not suppress worker stopping or cause the web process to hang.
 if(!signal?.aborted)try{await store.cleanup();}catch{}
 return {iterations,processed,storageFailures};
}
async function main(){
 const config=loadConfig();
 if(!config.databaseUrl||!config.mailReady||!config.signup)
  throw new Error('Worker requires the database and enabled account delivery.');
 const store=new PostgresStore(databasePool(config.databaseUrl));
 const controller=new AbortController();
 for(const event of ['SIGTERM','SIGINT'])process.once(event,()=>controller.abort());
 try{
  await store.healthy();
  await runMailQueueLoop({store,config,signal:controller.signal,
   maxIterations:process.argv.includes('--once')?1:Infinity});
 }finally{await store.close();}
}
if(process.argv[1]&&import.meta.url===new URL('file://'+process.argv[1]).href)
 main().catch(()=>{console.error('Worker stopped: configuration or delivery storage is unavailable.');process.exitCode=1;});
