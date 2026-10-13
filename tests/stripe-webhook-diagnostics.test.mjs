import test from 'node:test';
import assert from 'node:assert/strict';
import {diagnoseStripeTestWebhooks} from '../apps/web/stripe-webhook-diagnostics.mjs';

const session='cs_test_'+'A'.repeat(24),origin='https://galinsky-2028-private-preview.onrender.com';
const env=()=>({G28_PUBLIC_MODE:'preview',G28_STRIPE_TEST_ENABLED:'true',
 G28_STRIPE_DIAGNOSE_WEBHOOKS_ON_BOOT:'true',DONATIONS_ENABLED:'false',
 G28_STRIPE_RETURN_ORIGIN:origin,STRIPE_SECRET_KEY:'sk_test_'+'X'.repeat(24)});
const pool={async query(){return {rows:[{session_id:session,payment_state:'pending'}]}}};
const endpoint={url:origin+'/donate/stripe/webhook',livemode:false,status:'enabled',
 enabled_events:['checkout.session.completed','checkout.session.expired','checkout.session.async_payment_succeeded']};
function mockTransport({endpoints=[endpoint],events=[{type:'checkout.session.expired',livemode:false,data:{object:{id:session}}}]}={}){
 return async(url,options)=>{
  assert.match(options.headers.Authorization,/^Bearer sk_test_/);
  if(url.includes('/v1/webhook_endpoints'))return {ok:true,json:async()=>({data:endpoints})};
  if(url.includes('/v1/events'))return {ok:true,json:async()=>({data:events})};
  throw Error('Unexpected test HTTP endpoint');
 };
}
test('detects matching enabled TEST destination and signed-event prerequisites without leaking secrets',async()=>{
 const result=await diagnoseStripeTestWebhooks({env:env(),pool,
  transport:mockTransport(),probe:async()=>({status:405})});
 assert.deepEqual(result,{status:'inspected',webhookEndpointApiReadable:true,
  matchingEnabledTestDestination:true,expiredEventSubscribed:true,
  completedEventSubscribed:true,testExpiryEventPresent:true,recentTestCheckoutState:'pending',
  endpointNetworkReachable:true});
 assert(!JSON.stringify(result).includes('sk_test_'));
 assert(!JSON.stringify(result).includes('checkout.stripe.com'));
 assert(!JSON.stringify(result).includes('onrender.com'));
 assert(!JSON.stringify(result).includes(session));
});
test('detects test/live webhook mismatch without misclaiming delivery',async()=>{
 const result=await diagnoseStripeTestWebhooks({env:env(),pool,
  transport:mockTransport({endpoints:[{...endpoint,livemode:true}],events:[]}),
  probe:async()=>({status:405})});
 assert.equal(result.webhookEndpointApiReadable,true);
 assert.equal(result.matchingEnabledTestDestination,false);
 assert.equal(result.expiredEventSubscribed,false);
 assert.equal(result.testExpiryEventPresent,false);
 assert.equal(result.endpointNetworkReachable,true);
});
test('missing expiry subscription is reported even if completion is enabled',async()=>{
 const result=await diagnoseStripeTestWebhooks({env:env(),pool,
  transport:mockTransport({endpoints:[{...endpoint,enabled_events:['checkout.session.completed']}]}),
  probe:async()=>({status:405})});
 assert.equal(result.matchingEnabledTestDestination,true);
 assert.equal(result.expiredEventSubscribed,false);
 assert.equal(result.completedEventSubscribed,true);
});
test('diagnostics are disabled outside explicit sandbox configuration',async()=>{
 for(const edits of [{G28_STRIPE_DIAGNOSE_WEBHOOKS_ON_BOOT:'false'},
  {G28_PUBLIC_MODE:'production',DONATIONS_ENABLED:'true'},
  {STRIPE_SECRET_KEY:'sk_live_'+'x'.repeat(24)}]){
  let invoked=0;
  const result=await diagnoseStripeTestWebhooks({env:{...env(),...edits},
   pool,transport:async()=>{invoked++;throw Error('Must not call Stripe');}});
  assert.equal(result.status,'blocked');
  assert.equal(invoked,0);
 }
});
