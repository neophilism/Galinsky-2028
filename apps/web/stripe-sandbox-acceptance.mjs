// One-shot live integration smoke for Stripe TEST mode only. It creates and
// immediately expires a $1 *test* Checkout Session; no real card is charged.
// This probes API access, checkout parameter validity, durable database writes,
// and whether Stripe can deliver an authentic signed expiration webhook.
// NEVER log Stripe keys, webhook signatures, account profile or Checkout URLs.
import {randomBytes} from 'node:crypto';
import {stripeSettings,checkoutNonceKey,createCheckoutToken,openStripeSession} from '../../packages/core/stripe-web-checkout.mjs';
import {StripeCampaignStore} from './stripe-campaign-store.mjs';

const WAIT_COUNT=18;
const WAIT_INTERVAL_MS=2000;
const G28_API='https://api.stripe.com';
const sleep=ms=>new Promise(resolve=>setTimeout(resolve,ms));
const safeStage=(stage,status,more={})=>({stage,status,...more});
const sandboxRef=()=>('attempt_'+randomBytes(16).toString('hex'));

export async function runStripeSandboxAcceptance({
 env=process.env,pool,transport=fetch,wait=sleep,clientRef=sandboxRef()
}={}){
 if(env.G28_STRIPE_SMOKE_ON_BOOT!=='true')
  return safeStage('disabled','skipped');
 const settings=stripeSettings(env);
 const ready={
  isPreview:env.G28_PUBLIC_MODE==='preview',
  testKeyConfigured:typeof env.STRIPE_SECRET_KEY==='string'&&/^sk_test_[A-Za-z0-9_]{12,}$/.test(env.STRIPE_SECRET_KEY),
  webhookSecretConfigured:typeof env.STRIPE_WEBHOOK_SECRET==='string'&&/^whsec_[A-Za-z0-9_]{10,}$/.test(env.STRIPE_WEBHOOK_SECRET),
  databaseConfigured:typeof env.DATABASE_URL==='string'&&/^postgres(?:ql)?:\/\//.test(env.DATABASE_URL),
  liveDonationsDisabled:env.DONATIONS_ENABLED!=='true'&&env.G28_STRIPE_LIVE_APPROVED!=='true'
 };
 if(!settings?.sandbox||!Object.values(ready).every(Boolean)||!pool)
  return safeStage('configuration','blocked',{checks:ready});
 const auth='Bearer '+settings.secretKey;
 const options={Authorization:auth,'User-Agent':'Galinsky-2028-sandbox-preflight'};
 const getOrPost=async(url,{method='GET',body=null,idempotencyKey=null}={})=>{
  const headers={...options};
  if(body!==null)headers['Content-Type']='application/x-www-form-urlencoded';
  if(idempotencyKey)headers['Idempotency-Key']=idempotencyKey;
  const res=await transport(url,{method,headers,body,redirect:'error',signal:AbortSignal.timeout(12000)});
  if(!res||typeof res.ok!=='boolean'||!res.ok)throw Error('stripe_http_failure');
  const data=await res.json();
  if(!data||typeof data!=='object')throw Error('stripe_invalid_response');
  return data;
 };
 const store=new StripeCampaignStore(pool);
 let phase='database',checkout=null,stored=false,expired=false;
 try{
  const db=await pool.query('SELECT 1 FROM g28.stripe_checkout_intents LIMIT 1');
  if(!Array.isArray(db.rows))throw Error('database_unavailable');
  phase='stripe-account';
  const account=await getOrPost(G28_API+'/v1/account');
  if(typeof account.id!=='string'||!/^acct_[A-Za-z0-9]+$/.test(account.id))
   throw Error('stripe_account_unverified');
  phase='checkout-form';
  // This mirrors the ACTUAL donor form + origin + signed token + terms
  // version, rather than bypassing validation by creating a Checkout plan
  // directly. The form never contains card data or real donor information.
  const csrf=checkoutNonceKey(settings.secretKey);
  const formToken=createCheckoutToken(csrf,Date.now(),clientRef.slice('attempt_'.length));
  const form=new URLSearchParams({form_token:formToken,amount:'1.00',frequency:'once',agree:'yes'});
  checkout=await openStripeSession({raw:form.toString(),settings,nonceKey:csrf,
   request:{headers:{origin:settings.origin}},transport,
   onStage:next=>{phase='checkout-'+next;}});
  if(!checkout.sessionId.startsWith('cs_test_')||checkout.clientRef!==clientRef||
     checkout.amountCents!==100||checkout.election!=='general'||!checkout.termsVersion)
   throw Error('test_session_expected');
  phase='database-session';
  await store.recordSession({clientRef,sessionId:checkout.sessionId,amountCents:100,
   election:checkout.election,livemode:false,termsVersion:checkout.termsVersion});
  stored=true;
  phase='expire-test-session';
  const result=await getOrPost(G28_API+'/v1/checkout/sessions/'+checkout.sessionId+'/expire',{
   method:'POST',body:'',idempotencyKey:'g28-preflight-expire-'+clientRef
  });
  if(result.id!==checkout.sessionId||result.status!=='expired')throw Error('stripe_expire_not_confirmed');
  expired=true;
  phase='signed-webhook';
  for(let i=0;i<WAIT_COUNT;i++){
   await wait(WAIT_INTERVAL_MS);
   const row=await pool.query('SELECT payment_state FROM g28.stripe_checkout_intents WHERE client_reference=$1',[clientRef]);
   const state=row.rows?.[0]?.payment_state;
   if(state==='expired')return safeStage('completed','passed',{
    accountApi:true,checkoutApi:true,checkoutPersisted:true,expirationApi:true,signedWebhook:true,
    realMoneyMoved:false
   });
   if(state==='paid'||state==='requires_review'||state==='failed')throw Error('unexpected_test_payment_state');
  }
  return safeStage('signed-webhook','awaiting_delivery',{
   accountApi:true,checkoutApi:true,checkoutPersisted:true,expirationApi:true,
   signedWebhook:false,realMoneyMoved:false
  });
 }catch{
  // A test session may have been created before a database error. Expire it
  // best-effort, but never mutate a production session or leak its URL.
  if(checkout&&!expired){
   try{await getOrPost(G28_API+'/v1/checkout/sessions/'+checkout.sessionId+'/expire',{
    method:'POST',body:'',idempotencyKey:'g28-preflight-cleanup-'+clientRef
   });}catch{}
  }
  return safeStage(phase,'failed',{accountApi:phase!=='database'&&phase!=='stripe-account',
   checkoutPersisted:stored,realMoneyMoved:false});
 }
}
