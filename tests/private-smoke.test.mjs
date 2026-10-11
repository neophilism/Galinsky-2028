import test from 'node:test';
import assert from 'node:assert/strict';
import {smokePublic,smokePortal} from '../scripts/smoke-release.mjs';
test('private HTTP acceptance forwards credentials to both services but never emits them',async()=>{
 const auth='Basic '+Buffer.from('preview:test-fake-test-password-very-long').toString('base64');
 const paths=[];
 const fake=async(url,opts)=>{paths.push({url,auth:opts.headers?.Authorization});const p=new URL(url).pathname;
  if(p==='/robots.txt')return new Response('User-agent: *\nDisallow: /\n',{status:200});
  if(p==='/healthz'||p==='/readyz')return new Response('',{status:200});
  if(p==='/api/materials')return new Response('',{status:401});
  return new Response('',{status:401,headers:{'content-type':'text/plain'}});
 };
 const site=await smokePublic('https://preview.example',{fetcher:fake,authorization:auth});
 const api=await smokePortal('https://volunteer.example',{fetcher:fake,authorization:auth});
 assert.equal(site.passed,false,'HTTP probe must not pass on 401-only site');
 assert.equal(api.passed,true);
 assert(paths.every(x=>x.auth===auth));
 assert.ok(!JSON.stringify({site,api}).includes(auth));
});
