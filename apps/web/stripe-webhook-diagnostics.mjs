// Read-only Stripe TEST webhook diagnostics. Does not print keys, endpoint URLs,
// account identities, Checkout session IDs, or event bodies. No transactions.
import {stripeSettings} from '../../packages/core/stripe-web-checkout.mjs';

const API='https://api.stripe.com';
const targetPath='/donate/stripe/webhook';

async function stripeList(url,key,transport,{v2=false}={}){
 try{
  const headers={Authorization:'Bearer '+key,'User-Agent':'Galinsky-2028-test-webhook-diagnostics'};
  if(v2)headers['Stripe-Version']='2026-09-30.endive';
  const r=await transport(url,{method:'GET',redirect:'error',headers,
   signal:AbortSignal.timeout(12000)});
  if(!r?.ok)return null;
  const json=await r.json();
  return json&&Array.isArray(json.data)?json:null;
 }catch{return null;}
}
export async function diagnoseStripeTestWebhooks({env=process.env,pool,transport=fetch,probe=fetch}={}){
 const setting=stripeSettings(env);
 if(!setting?.sandbox||env.G28_STRIPE_DIAGNOSE_WEBHOOKS_ON_BOOT!=='true'||
    env.DONATIONS_ENABLED==='true'||!pool)
  return {status:'blocked',stage:'configuration'};
 let dbState='unknown',lastSessionId=null;
 try{
  const q=await pool.query(
   'SELECT session_id,payment_state FROM g28.stripe_checkout_intents WHERE livemode=false ORDER BY created_at DESC LIMIT 1');
  if(q.rows?.length===0)dbState='no_test_session';
  else if(q.rows?.[0]&&/^cs_test_[A-Za-z0-9]+$/.test(q.rows[0].session_id)){
   lastSessionId=q.rows[0].session_id;
   dbState=['pending','expired','failed','paid','requires_review'].includes(q.rows[0].payment_state)?
    q.rows[0].payment_state:'unknown';
  }
 }catch{dbState='unavailable';}
 const expected=setting.origin+targetPath;
 const endpoints=await stripeList(API+'/v1/webhook_endpoints?limit=100',setting.secretKey,transport);
 // Workbench may use the newer v2 Event Destination API, not the classic
 // v1 webhook_endpoints API. Include otherwise redacted URLs for local-only
 // comparison, but NEVER log URL strings or endpoint objects.
 const workbenchDestinations=await stripeList(
  API+'/v2/core/event_destinations?limit=100&include%5B0%5D=webhook_endpoint.url',
  setting.secretKey,transport,{v2:true});
 const workbenchMatch=workbenchDestinations?.data.find(item=>
  item&&item.type==='webhook_endpoint'&&item.livemode===false&&item.status==='enabled'&&
  item.webhook_endpoint?.url===expected)||null;
 const workbenchEvents=workbenchMatch?.enabled_events||[];
 const hasEvent=(types,type)=>types.includes('*')||types.includes(type)||types.includes('v1.'+type);
 let matched=null;
 if(endpoints){
  matched=endpoints.data.find(x=>x&&x.url===expected&&x.livemode===false&&x.status==='enabled')||null;
 }
 let latestEventGenerated=null;
 if(lastSessionId){
  const events=await stripeList(API+'/v1/events?type=checkout.session.expired&limit=40',
   setting.secretKey,transport);
  if(events)latestEventGenerated=events.data.some(x=>
   x?.type==='checkout.session.expired'&&x?.livemode===false&&x?.data?.object?.id===lastSessionId);
 }
 let endpointNetworkReachable=null;
 try{
  const r=await probe(expected,{method:'HEAD',redirect:'error',signal:AbortSignal.timeout(8000)});
  endpointNetworkReachable=r?.status===405;
 }catch{}
 const types=matched?.enabled_events||[];
 return {
  status:'inspected',
  webhookEndpointApiReadable:Boolean(endpoints),
  matchingEnabledTestDestination:Boolean(matched),
  workbenchV2ApiReadable:Boolean(workbenchDestinations),
  workbenchV2MatchingEnabledTestDestination:Boolean(workbenchMatch),
  workbenchV2PayloadIsSnapshot:workbenchMatch?.event_payload==='snapshot',
  workbenchV2ExpiredSubscribed:Boolean(workbenchMatch&&hasEvent(workbenchEvents,'checkout.session.expired')),
  workbenchV2CompletedSubscribed:Boolean(workbenchMatch&&hasEvent(workbenchEvents,'checkout.session.completed')),
  expiredEventSubscribed:Boolean(matched&&(types.includes('*')||types.includes('checkout.session.expired'))),
  completedEventSubscribed:Boolean(matched&&(types.includes('*')||types.includes('checkout.session.completed'))),
  testExpiryEventPresent:latestEventGenerated,
  recentTestCheckoutState:dbState,
  endpointNetworkReachable
 };
}
