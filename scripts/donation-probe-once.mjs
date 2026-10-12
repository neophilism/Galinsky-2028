// Scheduled from an approved secure runner, never as an anonymous HTTP endpoint.
// This probes hosted-page accessibility, NOT real payment authorization or settlement.
import {databasePool} from '../apps/api/src/postgres-store.mjs';
import {DonationRotationStore} from '../apps/web/donation-rotation-store.mjs';
import {approvedDonationRoutes} from '../packages/core/donation-provider.mjs';
import {probeHostedCheckout} from '../packages/core/donation-availability.mjs';

if(process.env.G28_DONATIONS_MONITOR_ENABLED!=='true')
 throw new Error('Checkout monitoring requires explicit owner-approved enablement');
if(!process.env.DATABASE_URL)throw new Error('Approved DATABASE_URL must be configured');
const env={...process.env,DONATIONS_ENABLED:'true',DONATIONS_TREASURER_APPROVED:'true'};
if(process.env.G28_DONATIONS_MONITOR_ROUTES_JSON){
 const rows=JSON.parse(process.env.G28_DONATIONS_MONITOR_ROUTES_JSON);
 if(!Array.isArray(rows)||rows.length!==4)throw new Error('Monitor needs exactly four approved provider configurations');
 for(let i=1;i<=4;i++){
  const entry=rows[i-1],prefix='DONATIONS_PROCESSOR_'+i+'_';
  if(!entry||entry.approved!==true)throw new Error('All four merchant relationships need written approval');
  for(const [a,b] of [['ID','id'],['NAME','name'],['HOST','host'],['URL','url']])env[prefix+a]=entry[b];
  env[prefix+'APPROVED']='true';
 }
}
const routes=approvedDonationRoutes(env,'production');
const store=new DonationRotationStore(databasePool(process.env.DATABASE_URL));
try{
 const state=await store.statuses();
 const active=new Set(state.filter(row=>row.status==='active').map(row=>row.provider_id));
 const checks=await Promise.all(routes.filter(route=>active.has(route.id)).map(async route=>({
  id:route.id, ...await probeHostedCheckout(route.url)
 })));
 // Widespread failures may be our monitor's DNS/network, not the providers.
 // Never disable most or all merchants from one runner's common-mode outage.
 const failed=checks.filter(x=>x.signal==='checkout_unreachable');
 if(checks.length>=3&&failed.length>=3){
  console.error(JSON.stringify({event:'monitor_common_mode_failure',affected:failed.length,checked:checks.length}));
  process.exitCode=1;
 }else{
  const bucket=Math.floor(Date.now()/180000);
  for(const item of checks){
   if(item.signal){
    await store.observe(item.id,{eventId:'checkout-'+bucket,attemptRef:'probe-'+bucket,signal:item.signal});
   }else process.exitCode=1;
   console.log(JSON.stringify({providerId:item.id,signal:item.signal||'inconclusive',code:item.code}));
  }
 }
}catch(e){console.error('Checkout availability monitor failed: '+e.message);process.exitCode=1;}
finally{await store.close();}
