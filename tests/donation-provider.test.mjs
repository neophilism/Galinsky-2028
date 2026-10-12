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
test('four separately configured processors are mandatory before fundraising',()=>{
 assert.equal(MIN_DONATION_PROCESSORS,4);assert.equal(MAX_DONATION_PROCESSORS,4);
 assert.equal(approvedDonationRoutes(configured(4),'production').length,4);
 for(let n=0;n<4;n++)assert.throws(()=>approvedDonationRoutes(configured(n),'production'),/all four/);
 const env=configured();env.DONATIONS_PROCESSOR_4_APPROVED='false';
 assert.throws(()=>approvedDonationRoutes(env,'production'),/all four/);
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
test('Stripe, local hosts and addresses are rejected',()=>{
 for(const host of ['checkout.stripe.com','stripepayments.com','localhost','pay.local','127.0.0.1','[::1]'])
  assert.throws(()=>validateHostedDonationUrl('https://'+host+'/donate',host),/Donation provider configuration/);
});
test('duplicate IDs and hosts cannot masquerade as independent providers',()=>{
 const env=configured();env.DONATIONS_PROCESSOR_2_ID='processor-1';
 assert.throws(()=>approvedDonationRoutes(env,'production'),/distinct/);
 const another=configured();another.DONATIONS_PROCESSOR_4_HOST=another.DONATIONS_PROCESSOR_1_HOST;
 another.DONATIONS_PROCESSOR_4_URL=another.DONATIONS_PROCESSOR_1_URL;
 assert.throws(()=>approvedDonationRoutes(another,'production'),/distinct/);
});
test('a missing URL or Stripe-labeled processor fails the configuration',()=>{
 const env=configured();delete env.DONATIONS_PROCESSOR_1_URL;
 assert.throws(()=>approvedDonationRoutes(env,'production'),/required/);
 const another=configured();another.DONATIONS_PROCESSOR_1_NAME='Stripe Alternative';
 assert.throws(()=>approvedDonationRoutes(another,'production'),/safe unique/);
});
