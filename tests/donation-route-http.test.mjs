import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,writeFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {createPrivatePreviewServer} from '../apps/web/private-preview.mjs';
const password='test-password-long-enough-for-preview-1234';
const auth='Basic '+Buffer.from('preview:'+password).toString('base64');
function config(){
 const env={PREVIEW_ACCESS_PASSWORD:password,G28_PUBLIC_MODE:'production',DONATIONS_ENABLED:'true',DONATIONS_TREASURER_APPROVED:'true'};
 for(let i=1;i<=4;i++){
  const p='DONATIONS_PROCESSOR_'+i+'_';
  env[p+'APPROVED']='true';env[p+'ID']='merchant-'+i;env[p+'NAME']='Approved Merchant '+i;
  env[p+'HOST']='payments-'+i+'.example';env[p+'URL']='https://payments-'+i+'.example/checkout';
 }
 return env;
}
test('one checkout button routes server-side, never reveals other provider links or attempts a payment',async t=>{
 const directory=await mkdtemp(join(tmpdir(),'g28-pay-http-'));await writeFile(join(directory,'index.html'),'<html>Preview private home</html>');
 const routed=[];
 const routing={async selectRoute(routes){routed.push(routes.map(r=>r.id));return {providerId:routes[2].id,url:routes[2].url,selectionId:'test-only'};}};
 const server=createPrivatePreviewServer({directory,env:config(),rotationStore:routing});
 await new Promise(ok=>server.listen(0,'127.0.0.1',ok));
 t.after(async()=>{await new Promise(ok=>server.close(ok));await rm(directory,{recursive:true,force:true});});
 const endpoint='http://127.0.0.1:'+server.address().port+'/donate/continue';
 const unauth=await fetch(endpoint,{redirect:'manual'});assert.equal(unauth.status,401);assert.equal(routed.length,0);
 const wrongMethod=await fetch(endpoint,{method:'POST',headers:{Authorization:auth},redirect:'manual'});
 assert.equal(wrongMethod.status,405);assert.equal(routed.length,0);
 const head=await fetch(endpoint,{method:'HEAD',headers:{Authorization:auth},redirect:'manual'});
 assert.equal(head.status,405);assert.equal(routed.length,0);
 const response=await fetch(endpoint,{headers:{Authorization:auth},redirect:'manual'});
 assert.equal(response.status,303);
 assert.equal(response.headers.get('location'),'https://payments-3.example/checkout');
 assert.equal(response.headers.get('referrer-policy'),'no-referrer');
 assert.match(response.headers.get('cache-control'),/no-store/);
 assert.equal(routed.length,1);
 assert.equal(routed[0].length,4);
 assert.equal(await response.text(),'');
});
test('missing backend state, quarantines and database failures all fail closed without financial attempts',async t=>{
 const directory=await mkdtemp(join(tmpdir(),'g28-pay-fail-'));await writeFile(join(directory,'index.html'),'private');
 const health={async selectRoute(){return null;}};
 const server=createPrivatePreviewServer({directory,env:config(),rotationStore:health});
 await new Promise(ok=>server.listen(0,'127.0.0.1',ok));
 t.after(async()=>{await new Promise(ok=>server.close(ok));await rm(directory,{recursive:true,force:true});});
 const response=await fetch('http://127.0.0.1:'+server.address().port+'/donate/continue',{headers:{Authorization:auth},redirect:'manual'});
 assert.equal(response.status,503);assert.match(await response.text(),/No payment was attempted/);
 const noDb=config();
 assert.throws(()=>createPrivatePreviewServer({directory,env:noDb}),/DATABASE_URL/);
 const unsafe=config();unsafe.DONATIONS_PROCESSOR_1_URL='https://payments-1.example.evil.com/pay';
 assert.throws(()=>createPrivatePreviewServer({directory,env:unsafe,rotationStore:health}),/Donation provider configuration/);
});
