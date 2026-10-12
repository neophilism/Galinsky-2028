import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,writeFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {createPrivatePreviewServer} from '../apps/web/private-preview.mjs';
import {stripeSettings,checkoutNonceKey,createCheckoutToken,checkCheckoutToken,parseCheckoutForm,openStripeSession} from '../packages/core/stripe-web-checkout.mjs';

const password='test-preview-password-long-2026';
const sandbox=()=>({PREVIEW_ACCESS_PASSWORD:password,G28_PUBLIC_MODE:'preview',
 G28_STRIPE_TEST_ENABLED:'true',STRIPE_SECRET_KEY:'sk_test_12345678901234567890',
 G28_STRIPE_RETURN_ORIGIN:'https://preview.example.test',DONATIONS_ENABLED:'false'});
const body=(nonce)=>new URLSearchParams({form_token:nonce,amount:'25.00',
 election:'primary',frequency:'once',eligibleResidency:'yes',ownFunds:'yes',age18:'yes',
 notFederalContractor:'yes',personalCreditCard:'yes'}).toString();
test('sandbox is explicit, isolated from real money and legal release keys',()=>{
 assert.equal(stripeSettings({}),null);
 assert.equal(stripeSettings({...sandbox(),STRIPE_SECRET_KEY:'sk_live_12345678901234567890'}),null);
 assert.equal(stripeSettings({...sandbox(),G28_STRIPE_TEST_ENABLED:'false'}),null);
 assert.equal(stripeSettings({...sandbox(),G28_STRIPE_RETURN_ORIGIN:'http://preview.example.test'}),null);
 assert.equal(stripeSettings({...sandbox(),G28_PUBLIC_MODE:'production',DONATIONS_ENABLED:'true',
  DONATIONS_TREASURER_APPROVED:'true',G28_STRIPE_LIVE_APPROVED:'true'}),null);
 const cfg=stripeSettings(sandbox());
 assert.equal(cfg.sandbox,true);assert.equal(cfg.live,false);
 assert.equal(cfg.policy.recurringEnabled,false);
});
test('signed form tokens expire and enforce exact origin, amount and eligibility',async()=>{
 const cfg=stripeSettings(sandbox()),key=checkoutNonceKey();
 const token=createCheckoutToken(key,1700000000000);
 assert.match(checkCheckoutToken(key,token,1700000000000),/^attempt_[0-9a-f]{32}$/);
 assert.equal(checkCheckoutToken(key,token,1700001000000),null);
 assert.equal(checkCheckoutToken(checkoutNonceKey(),token,1700000000000),null);
 assert.equal(parseCheckoutForm(body(token)).amountCents,2500);
 for(const bad of [body(token).replace('ownFunds=yes','ownFunds=no'),body(token).replace('25.00','0'),
   body(token).replace('frequency=once','frequency=monthly'),
   body(token)+'&amount=25',body(token)+'&card_number=4111111111111111'])
  assert.throws(()=>parseCheckoutForm(bad));
 await assert.rejects(()=>openStripeSession({raw:body(token),settings:cfg,nonceKey:key,
  request:{headers:{origin:'https://evil.example.test'}}}),/Cross-origin/);
});
test('password-protected sandbox returns form and 303 to verified Stripe checkout, no charges',async t=>{
 const dir=await mkdtemp(join(tmpdir(),'stripe-checkout-'));await writeFile(join(dir,'index.html'),'private');
 let called=0;
 const transport=async(url,options)=>{
  called++;assert.equal(url,'https://api.stripe.com/v1/checkout/sessions');
  assert.match(options.headers.Authorization,/^Bearer sk_test_/);
  const req=new URLSearchParams(options.body);
  assert.equal(req.get('mode'),'payment');
  assert.equal(req.get('custom_fields[0][key]'),'occupation');
  assert.equal(req.get('custom_fields[1][key]'),'employer');
  assert.equal(req.get('line_items[0][price_data][unit_amount]'),'2500');
  return {ok:true,json:async()=>({id:'cs_test_ABCDEFGHIJKLM',url:'https://checkout.stripe.com/c/pay/session'})};
 };
 const stored=[];
 const stripeStore={async recordSession(data){stored.push(data);},async receiveSignedWebhook(){return {status:200,outcome:'verified_captured_not_settled'};}};
 const server=createPrivatePreviewServer({directory:dir,env:sandbox(),stripeTransport:transport,stripeStore});
 await new Promise(ok=>server.listen(0,'127.0.0.1',ok));
 t.after(async()=>{await new Promise(ok=>server.close(ok));await rm(dir,{recursive:true,force:true});});
 const root='http://127.0.0.1:'+server.address().port;
 const unauthorized=await fetch(root+'/donate/stripe');
 assert.equal(unauthorized.status,401);assert.equal(called,0);
 const auth={'authorization':'Basic '+Buffer.from('preview:'+password).toString('base64')};
 const get=await fetch(root+'/donate/stripe',{headers:auth});
 assert.equal(get.status,200);
 const page=await get.text();
 assert.match(page,/Stripe TEST MODE/);
 assert.match(page,/not a business or third-party card/i);
 assert.match(get.headers.get('content-security-policy'),/form-action 'self'/);
 const token=page.match(/name="form_token" value="([^"]+)"/)?.[1];
 assert(token);
 const bad=await fetch(root+'/donate/stripe/checkout',{method:'POST',redirect:'manual',
  headers:{...auth,origin:'https://attacker.example', 'content-type':'application/x-www-form-urlencoded'},
  body:body(token)});
 assert.equal(bad.status,400);assert.equal(called,0);
 // A URL-encoded test form never contains real card numbers.
 const ok=await fetch(root+'/donate/stripe/checkout',{method:'POST',redirect:'manual',
  headers:{...auth,origin:'https://preview.example.test','content-type':'application/x-www-form-urlencoded'},
  body:body(token)});
 assert.equal(ok.status,303);assert.equal(ok.headers.get('location'),'https://checkout.stripe.com/c/pay/session');
 assert.equal(called,1);
 assert.equal(stored.length,1);
 assert.equal(stored[0].amountCents,2500);
 assert.equal(stored[0].livemode,false);
 assert.equal((await ok.text()),'');
});
test('Stripe test mode is unconfigured by default and cannot leak live donation routes',async t=>{
 const dir=await mkdtemp(join(tmpdir(),'stripe-disabled-'));await writeFile(join(dir,'index.html'),'private');
 const server=createPrivatePreviewServer({directory:dir,env:{PREVIEW_ACCESS_PASSWORD:password,G28_PUBLIC_MODE:'preview'}});
 await new Promise(ok=>server.listen(0,'127.0.0.1',ok));
 t.after(async()=>{await new Promise(ok=>server.close(ok));await rm(dir,{recursive:true,force:true});});
 const response=await fetch('http://127.0.0.1:'+server.address().port+'/donate/stripe',{headers:{authorization:'Basic '+Buffer.from('preview:'+password).toString('base64')}});
 assert.equal(response.status,503);
 assert.match(await response.text(),/No payment was attempted/);
});
