import test from 'node:test';
import assert from 'node:assert/strict';
import {runStripeSandboxAcceptance} from '../apps/web/stripe-sandbox-acceptance.mjs';
import {CONTRIBUTION_TERMS_VERSION} from '../packages/core/contribution-terms.mjs';

const key='sk_test_'+'z'.repeat(25),whsec='whsec_'+'y'.repeat(25);
const env=()=>({
 G28_PUBLIC_MODE:'preview',G28_STRIPE_TEST_ENABLED:'true',
 G28_STRIPE_SMOKE_ON_BOOT:'true',DONATIONS_ENABLED:'false',
 G28_STRIPE_LIVE_APPROVED:'false',
 STRIPE_SECRET_KEY:key,STRIPE_WEBHOOK_SECRET:whsec,
 DATABASE_URL:'postgresql:'+'//only-sandbox-db:example@db.example.test/neondb',
 G28_STRIPE_RETURN_ORIGIN:'https://galinsky-2028-private-preview.onrender.com'
});
const reference='attempt_'+'a'.repeat(32),session='cs_test_'+'Z'.repeat(25);
class MockDb{
 constructor(){this.intent=null;this.queries=[];}
 async query(sql,values=[]){
  this.queries.push({sql,values});
  if(sql==='SELECT 1 FROM g28.stripe_checkout_intents LIMIT 1')return {rows:[]};
  if(sql.startsWith('INSERT INTO g28.stripe_checkout_intents(')){
   if(!this.intent)this.intent={client_reference:values[0],session_id:values[1],
    election:values[2],amount_cents:values[3],livemode:values[4],terms_version:values[5]??null,payment_state:'pending'};
   return {rowCount:1,rows:[]};
  }
  if(sql.startsWith('SELECT session_id,election,amount_cents,livemode')){
   return {rowCount:this.intent?1:0,rows:this.intent?[{...this.intent}]:[]};
  }
  if(sql.startsWith('SELECT payment_state FROM g28.stripe_checkout_intents')){
   return {rows:this.intent?[{payment_state:this.intent.payment_state}]:[]};
  }
  throw Error('Unexpected test SQL');
 }
}
test('the self-test only runs with all preview mode, test-secret and no-live gates',async()=>{
 for(const field of ['G28_STRIPE_TEST_ENABLED','G28_STRIPE_SMOKE_ON_BOOT','STRIPE_SECRET_KEY',
  'STRIPE_WEBHOOK_SECRET','DATABASE_URL','DONATIONS_ENABLED','G28_STRIPE_LIVE_APPROVED']){
  const e=env();e[field]=field==='DONATIONS_ENABLED'||field==='G28_STRIPE_LIVE_APPROVED'?'true':
   field==='STRIPE_SECRET_KEY'?'sk_live_'+'x'.repeat(20):'';
  let upstream=0;
  const result=await runStripeSandboxAcceptance({env:e,pool:new MockDb(),transport:async()=>{upstream++;throw Error('should not connect')}});
  assert.notEqual(result.status,'passed',field);
  assert.equal(upstream,0,field);
 }
 assert.equal((await runStripeSandboxAcceptance({env:{...env(),G28_STRIPE_SMOKE_ON_BOOT:'false'}})).status,'skipped');
});
test('the live sandbox acceptance creates and expires one real-shaped test session and awaits signed webhook state',async()=>{
 const pool=new MockDb(),calls=[],mockTransport=async(url,options)=>{
  assert.match(options.headers.Authorization,/^Bearer sk_test_/);
  calls.push({url,method:options.method,body:options.body});
  if(url==='https://api.stripe.com/v1/account')
   return {ok:true,json:async()=>({id:'acct_0123456789ABCDEF',business_profile:{name:'Never log sensitive account profile'}})};
  if(url==='https://api.stripe.com/v1/checkout/sessions'){
   const body=new URLSearchParams(options.body);
   assert.equal(body.get('mode'),'payment');
   assert.equal(body.get('line_items[0][price_data][unit_amount]'),'100');
   assert.equal(body.get('metadata[election]'),'general');
   assert.equal(body.get('metadata[terms_version]'),CONTRIBUTION_TERMS_VERSION);
   assert.equal(body.get('client_reference_id'),reference);
   return {ok:true,json:async()=>({id:session,url:'https://checkout.stripe.com/c/pay/some-test-token'})};
  }
  if(url==='https://api.stripe.com/v1/checkout/sessions/'+session+'/expire'){
   assert(pool.intent,'session must be saved in Postgres BEFORE expiring');
   assert.equal(options.method,'POST');
   return {ok:true,json:async()=>({id:session,status:'expired'})};
  }
  throw Error('Unexpected Stripe API URL');
 };
 let n=0;
 const result=await runStripeSandboxAcceptance({env:env(),pool,
  transport:mockTransport,clientRef:reference,wait:async()=>{n++;if(n===3)pool.intent.payment_state='expired';}});
 assert.deepEqual(result,{
  stage:'completed',status:'passed',accountApi:true,checkoutApi:true,
  checkoutPersisted:true,expirationApi:true,signedWebhook:true,realMoneyMoved:false
 });
 assert.equal(calls.length,3);
 assert.equal(n,3);
 assert.equal(pool.intent.client_reference,reference);
 assert.equal(pool.intent.livemode,false);
 assert.equal(pool.intent.amount_cents,100);
 assert.equal(pool.intent.terms_version,CONTRIBUTION_TERMS_VERSION);
 assert(!JSON.stringify(result).includes('sk_test_'));
 assert(!JSON.stringify(result).includes('whsec_'));
 assert(!JSON.stringify(result).includes('checkout.stripe.com'));
});
test('webhook not received remains inconclusive, not a fabricated success',async()=>{
 const pool=new MockDb();
 const mock=async(url)=>{
  if(url.endsWith('/account'))return {ok:true,json:async()=>({id:'acct_ABCDEFGHIJKLMNOP'})};
  if(url.endsWith('/checkout/sessions'))return {ok:true,json:async()=>({id:session,url:'https://checkout.stripe.com/c/pay/test-session'})};
  if(url.endsWith('/expire'))return {ok:true,json:async()=>({id:session,status:'expired'})};
  throw Error('unexpected URL');
 };
 const result=await runStripeSandboxAcceptance({env:env(),pool,transport:mock,clientRef:reference,wait:async()=>{}});
 assert.equal(result.stage,'signed-webhook');
 assert.equal(result.status,'awaiting_delivery');
 assert.equal(result.signedWebhook,false);
 assert.equal(result.realMoneyMoved,false);
});
test('a Stripe API key denial is a failed authorization, never an approved checkout',async()=>{
 const pool=new MockDb(),result=await runStripeSandboxAcceptance({env:env(),pool,
  transport:async()=>({ok:false,status:401,json:async()=>({})})});
 assert.deepEqual({stage:result.stage,status:result.status},{stage:'stripe-account',status:'failed'});
 assert.equal(pool.intent,null);
 assert(!JSON.stringify(result).includes(key));
});
