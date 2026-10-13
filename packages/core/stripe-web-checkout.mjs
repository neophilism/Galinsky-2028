// Checkout entry point: server-hosted, no card data or donor identity stored here.
// Production never opens on test credentials or missing treasury / Stripe approvals.
import {randomBytes,createHmac,timingSafeEqual} from 'node:crypto';
import {stripeCheckoutPlan,createStripeCheckout} from './stripe-campaign.mjs';
import {cents} from './finance.mjs';
import {CONTRIBUTION_TERMS_PATH,CONTRIBUTION_TERMS_VERSION,ONLINE_DONATION_ELECTION} from './contribution-terms.mjs';

const SAFE_NAME='Phillip Galinsky for America';
const approved=(reference)=>({accepted:true,reference});
const releaseKeys=['processorAccount','treasurerApproval','electionRules','processorContract','securityReview','reconciliationTest'];
const policyKeys=['stripeRestrictedBusinessApproval','federalCommitteeIdentity','cardSourcePolicy','donorAttestations','directCheckoutRules','recurringControls'];
const dollarLimit=x=>typeof x==='string'&&/^[1-9]\d{0,7}$/.test(x)&&Number(x)<=100000000?Number(x):null;
const literal=x=>String(x).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const routeBlocked=()=>new Error('Stripe Checkout is not configured or approved for this campaign.');

export function stripeSettings(env){
 const sandbox=env.G28_PUBLIC_MODE==='preview'&&env.G28_STRIPE_TEST_ENABLED==='true';
 const live=env.G28_PUBLIC_MODE==='production'&&env.DONATIONS_ENABLED==='true'&&
  env.DONATIONS_TREASURER_APPROVED==='true'&&env.G28_STRIPE_LIVE_APPROVED==='true';
 if(!sandbox&&!live)return null;
 const key=env.STRIPE_SECRET_KEY;
 if(typeof key!=='string'||!(sandbox?/^sk_test_[A-Za-z0-9_]{12,}$/:/^sk_live_[A-Za-z0-9_]{12,}$/).test(key))
  return null;
 const supplied=env.G28_STRIPE_RETURN_ORIGIN||env.RENDER_EXTERNAL_URL;
 let origin;
 try{origin=new URL(supplied);}catch{return null;}
 if(origin.protocol!=='https:'||origin.username||origin.password||origin.port||
  origin.pathname!=='/'||origin.search||origin.hash||!origin.hostname.includes('.'))return null;
 const primary=dollarLimit(env.G28_STRIPE_PRIMARY_LIMIT_CENTS);
 const general=dollarLimit(env.G28_STRIPE_GENERAL_LIMIT_CENTS);
 if(!sandbox&&!general)return null;
 const limits=sandbox?{primary:Math.min(primary||10000,100000000),general:Math.min(general||10000,100000000)}:{primary,general};
 let release,policyEvidence;
 if(sandbox){
  release={enabled:true,evidence:Object.fromEntries(releaseKeys.map(k=>[k,approved('stripe-sandbox-only')] ))};
  release.evidence.validUntil='2099-01-01T00:00:00Z';
  policyEvidence=Object.fromEntries(policyKeys.map(k=>[k,approved('stripe-sandbox-only')]));
 }else{
  // Evidence must be independently validated by the campaign's treasurer.
  // Never infer approval from the mere presence of an API key.
  try{
   release=JSON.parse(env.G28_STRIPE_RELEASE_JSON);
   policyEvidence=JSON.parse(env.G28_STRIPE_POLICY_EVIDENCE_JSON);
  }catch{return null;}
  if(release?.enabled!==true||releaseKeys.some(k=>release.evidence?.[k]?.accepted!==true||
      typeof release.evidence[k].reference!=='string'||release.evidence[k].reference.length<8)||
     policyKeys.some(k=>policyEvidence?.[k]?.accepted!==true||
      typeof policyEvidence[k].reference!=='string'||policyEvidence[k].reference.length<8))return null;
 }
 return {sandbox,live,secretKey:key,origin:origin.origin,limits,
  policy:{publicOrigin:origin.origin,committeeName:env.G28_STRIPE_COMMITTEE_NAME||SAFE_NAME,
    limits,recurringEnabled:false,evidence:policyEvidence},release};
}

export function checkoutNonceKey(){return randomBytes(32);}
export function createCheckoutToken(secret,now=Date.now()){
 const issued=Math.floor(now/1000);
 const nonce=randomBytes(16).toString('hex');
 const payload=issued+'.'+nonce;
 const sig=createHmac('sha256',secret).update(payload).digest('hex');
 return payload+'.'+sig;
}
export function checkCheckoutToken(secret,token,now=Date.now()){
 if(typeof token!=='string'||!/^\d{10}\.[a-f0-9]{32}\.[a-f0-9]{64}$/.test(token))return null;
 const [issued,nonce,tag]=token.split('.');
 if(Number(issued)>Math.floor(now/1000)+10||Math.floor(now/1000)-Number(issued)>900)return null;
 const actual=Buffer.from(tag,'hex');
 const expected=createHmac('sha256',secret).update(issued+'.'+nonce).digest();
 return actual.length===expected.length&&timingSafeEqual(actual,expected)?'attempt_'+nonce:null;
}
export function validDonationOrigin(req,settings){
 const reported=req.headers.origin;
 // Browser form POST supplies an Origin header. Require exact scheme and host.
 return reported===settings.origin;
}
export function parseCheckoutForm(raw){
 if(typeof raw!=='string'||raw.length>4096)throw Error('Invalid contribution form.');
 const p=new URLSearchParams(raw);
 // No donor-supplied election choice, eligibility flags or untrusted terms
 // version: a single affirmative agreement to the linked, versioned terms
 // constitutes all of the disclosed certifications.
 const allowed=new Set(['amount','frequency','form_token','agree']);
 for(const [k] of p)if(!allowed.has(k)||p.getAll(k).length!==1)throw Error('Invalid contribution form.');
 const amountCents=cents(p.get('amount'));
 if(p.get('frequency')!=='once')throw Error('Recurring contributions are not yet supported.');
 if(p.get('agree')!=='yes')throw Error('Agreement to the contribution terms is required.');
 const attestations=Object.fromEntries(
  ['eligibleResidency','ownFunds','age18','notFederalContractor','personalCreditCard'].map(k=>[k,true]));
 return {amountCents,frequency:'once',election:ONLINE_DONATION_ELECTION,attestations,
  termsVersion:CONTRIBUTION_TERMS_VERSION,formToken:p.get('form_token')};
}
export async function openStripeSession({raw,settings,nonceKey,request,transport=fetch}){
 if(!settings)throw routeBlocked();
 if(!validDonationOrigin(request,settings))throw Error('Cross-origin payment request refused.');
 const input=parseCheckoutForm(raw);
 const clientRef=checkCheckoutToken(nonceKey,input.formToken);
 if(!clientRef)throw Error('Expired or invalid checkout form. Reload before submitting.');
 const plan=stripeCheckoutPlan({contribution:{amountCents:input.amountCents,frequency:input.frequency,
  election:input.election,clientRef,attestations:input.attestations,termsVersion:input.termsVersion},
  policy:settings.policy,release:settings.release});
 const created=await createStripeCheckout({plan,secretKey:settings.secretKey,transport,
  signal:AbortSignal.timeout(10000)});
 return {...created,clientRef,amountCents:input.amountCents,election:input.election,
  termsVersion:input.termsVersion};
}
export function stripeDonationHtml(settings,nonceKey,amount='25'){
 if(!settings)throw routeBlocked();
 const token=createCheckoutToken(nonceKey);
 const n=/^(?:[1-9]\d{0,6})(?:\.\d{1,2})?$/.test(amount)?amount:'25';
 const approval=settings.sandbox?
  '<p class="service-notice" role="status"><strong>Stripe TEST MODE.</strong> This page accepts only Stripe test cards; no real money will move.</p>':
  '<p class="service-notice">Secure credit-card checkout. Your contribution is not confirmed until the payment processor and campaign ledger verify it.</p>';
 return '<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">'+
 '<meta name="robots" content="noindex,nofollow"><meta name="referrer" content="no-referrer">'+
 '<title>Secure contribution | Galinsky 2028</title><link rel="stylesheet" href="/assets/design.css"><link rel="stylesheet" href="/assets/site.css"></head>'+
 '<body><main id="main" class="wrap" style="max-width:800px;padding:42px 20px">'+
 '<a href="/donate/">← Donation information</a><h1>Secure campaign contribution</h1>'+approval+
 '<p>Paid for by Phillip Galinsky for America. Contributions are not tax deductible.</p>'+
 '<form method="post" action="/donate/stripe/checkout" class="donate-form" style="margin-top:20px" autocomplete="off">'+
 '<input type="hidden" name="form_token" value="'+token+'">'+
 '<label class="field">Amount in US dollars<input required type="number" name="amount" min="1" max="'+(settings.limits.general/100).toFixed(2)+'" step=".01" value="'+literal(n)+'"></label>'+ 
 '<input type="hidden" name="frequency" value="once">'+
 '<p class="tiny">One-time contribution only. The approved maximum applies to each donor across ALL fundraising channels, not just this transaction. Name and mailing address are collected by the secure provider; occupation and employer are required there as well.</p>'+
 '<div class="donor-consent">'+
 '<input id="donor-terms-agreement" type="checkbox" name="agree" value="yes" required aria-required="true">'+
 '<label for="donor-terms-agreement">I agree to the <a href="'+CONTRIBUTION_TERMS_PATH+'" target="_blank" rel="noopener noreferrer">contribution terms</a>.</label>'+ 
 '</div>'+ 
 '<p class="donor-reporting">Federal law requires us to use our best efforts to collect and report the name, mailing address, occupation and employer of individuals whose contributions exceed $200 in an election cycle.</p>'+
 '<button class="btn blue" type="submit">Continue to secure card checkout</button></form>'+
 '<p class="tiny">Do not submit again if a previous payment is still processing.</p></main></body></html>';
}
