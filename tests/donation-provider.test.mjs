import test from 'node:test';
import assert from 'node:assert/strict';
import {approvedDonationRoutes,validateHostedDonationUrl,MAX_DONATION_PROCESSORS,MIN_DONATION_PROCESSORS} from '../packages/core/donation-provider.mjs';
function configured(count=4){
 const env={DONATIONS_ENABLED:'true',DONATIONS_TREASURER_APPROVED:'true'};
 for(let i=1;i<=count;i++){
  const p='DONATIONS_PROCESSOR_'+i+'_';
  env[p+'APPROVED']='true';
  env[p+'ID']='processor-'+i;
  env[p+'NAME']='Independent Processor '+i;
  env[p+'HOST']='checkout.processor-'+i+'.com';
  env[p+'URL']='https://checkout.processor-'+i+'.com/contribute/committee';
 }
 return env;
}
test('one approved processor can launch; rotation scales to sixteen as more join',()=>{
 assert.equal(MIN_DONATION_PROCESSORS,1);assert.equal(MAX_DONATION_PROCESSORS,16);
 assert.equal(approvedDonationRoutes(configured(1),'production').length,1);
 assert.equal(approvedDonationRoutes(configured(4),'production').length,4);
 assert.equal(approvedDonationRoutes(configured(16),'production').length,16);
 assert.throws(()=>approvedDonationRoutes(configured(0),'production'),/at least one/);
});
test('preview or incomplete release may not reveal donation routes',()=>{
 assert.deepEqual(approvedDonationRoutes(configured(),'preview'),[]);
 assert.deepEqual(approvedDonationRoutes({},'production'),[]);
 const env=configured();env.DONATIONS_ENABLED='false';
 assert.deepEqual(approvedDonationRoutes(env,'production'),[]);
 env.DONATIONS_ENABLED='true';env.DONATIONS_TREASURER_APPROVED='false';
 assert.deepEqual(approvedDonationRoutes(env,'production'),[]);
});
test('secure checkout URL must match the exact configured HTTPS host',()=>{
 const good='https://checkout.processor-1.com/contribute/committee';
 assert.equal(validateHostedDonationUrl(good,'checkout.processor-1.com'),good);
 for(const bad of ['http://checkout.processor-1.com/contribute','https://checkout.processor-1.com.evil.com/contribute',
  'https://user:pass@checkout.processor-1.com/contribute','https://checkout.processor-1.com:8443/contribute',
  'https://checkout.processor-1.com/contribute#fragment','https://checkout.processor-2.com/contribute']){
  assert.throws(()=>validateHostedDonationUrl(bad,'checkout.processor-1.com'),/Donation provider configuration/);
 }
});
test('Local and IP hosts remain rejected',()=>{
 for(const host of ['localhost','pay.local','127.0.0.1','[::1]'])
  assert.throws(()=>validateHostedDonationUrl('https://'+host+'/donate',host),/Donation provider configuration/);
});
test('duplicate IDs and hosts cannot masquerade as independent providers',()=>{
 const env=configured();env.DONATIONS_PROCESSOR_2_ID='processor-1';
 assert.throws(()=>approvedDonationRoutes(env,'production'),/distinct/);
 const another=configured();another.DONATIONS_PROCESSOR_4_HOST=another.DONATIONS_PROCESSOR_1_HOST;
 another.DONATIONS_PROCESSOR_4_URL=another.DONATIONS_PROCESSOR_1_URL;
 assert.throws(()=>approvedDonationRoutes(another,'production'),/distinct/);
});
test('a missing URL or a fake native Stripe ID fails the configuration',()=>{
 const env=configured();delete env.DONATIONS_PROCESSOR_1_URL;
 assert.throws(()=>approvedDonationRoutes(env,'production'),/required/);
 const another=configured();another.DONATIONS_PROCESSOR_1_ID='stripe';
 assert.throws(()=>approvedDonationRoutes(another,'production'),/native signed/);
});

test('JPMorgan Chase payment platforms are prohibited directly in every slot',()=>{
 for(const name of ['Chase Payment Solutions','Chase Paymentech','JPMorgan Payments','WePay']){
  const env=configured();
  env.DONATIONS_PROCESSOR_1_NAME=name;
  assert.throws(()=>approvedDonationRoutes(env,'production'),/safe unique/);
 }
 for(const host of ['payments.chase.com','wepay.com','merchant.jpmorgan.com','pay.jpmorganchase.com','api.chasepaymentech.com'])
  assert.throws(()=>validateHostedDonationUrl('https://'+host+'/pay',host),/prohibited processor hostname/);
});

test('Stripe uses native hosted Checkout creation, never a fake fixed URL',()=>{
 const env=configured(0);env.G28_STRIPE_LIVE_APPROVED='true';
 env.STRIPE_SECRET_KEY='sk_live_12345678901234567890';
 const routes=approvedDonationRoutes(env,'production');
 assert.deepEqual(routes.map(r=>r.id),['stripe']);
 assert.equal(routes[0].url,'/donate/stripe');
 assert.equal(routes[0].kind,'stripe');
 env.STRIPE_SECRET_KEY='sk_test_12345678901234567890';
 assert.throws(()=>approvedDonationRoutes(env,'production'),/approved live Stripe account/);
});
