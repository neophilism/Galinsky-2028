#!/usr/bin/env node
import {resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {loadPreviewGate} from '../packages/core/preview-gate.mjs';
// Read-only deployed HTTP acceptance probe. Never submits accounts or payments.
// Private previews receive credentials only from process environment, never CLI arguments or output.
function accessHeader(env=process.env){
 if(!env.PREVIEW_ACCESS_PASSWORD)return null;
 loadPreviewGate(env);
 return 'Basic '+Buffer.from((env.PREVIEW_ACCESS_USER||'preview')+':'+env.PREVIEW_ACCESS_PASSWORD,'utf8').toString('base64');
}
const publicPaths=['/','/issues/','/issues/kirk-evers/','/issues/garden/','/issues/cornerstone/','/volunteer/','/donate/','/notices/'];
const issues=['/issues/kirk-evers/','/issues/garden/','/issues/cornerstone/'];

function base(value){
 let u;try{u=new URL(value);}catch{throw Error('A complete HTTPS base URL is required');}
 if(!value||u.protocol!=='https:'||u.username||u.password||u.port||u.pathname!=='/'||u.search||u.hash)throw Error('Supply an HTTPS origin without credentials, port, path, query or fragment');
 return u.origin;
}
export function validateHtml(path,html,mode,headers={}){
 const problems=[];
 if(!/^<!doctype html>/i.test(html.trimStart()))problems.push('not_html_document');
 if((html.match(/<h1\b/gi)||[]).length!==1)problems.push('expected_one_h1');
 if(html.includes('{{'))problems.push('unresolved_template');
 if(!html.includes('id="main"'))problems.push('missing_main_landmark');
 const meta=/content="noindex,nofollow"/.test(html),header=(headers['x-robots-tag']||'').toLowerCase();
 if(mode==='preview'&&!meta)problems.push('preview_should_be_noindex');
 if(mode==='production'&&(meta||header.includes('noindex')))problems.push('production_is_noindexed');
 if(issues.includes(path)){
  const video=html.indexOf('issue-video-section'),body=html.indexOf('policy-hero');
  if(video<0||body<0||video>body)problems.push('video_not_before_policy');
 }
 if(path==='/donate/'&&mode==='preview'){
  if(!html.includes('Online contributions are not open yet'))problems.push('preview_contribution_notice_missing');
  for(const input of html.match(/<(?:input|select)\b[^>]*>/gi)||[])if(!/\bdisabled\b/.test(input))problems.push('payment_input_enabled_in_preview');
 }
 return problems;
}

export async function smokePublic(url,{mode='preview',fetcher=fetch,authorization=accessHeader()}={}){
 const origin=base(url),out=[];if(!['preview','production'].includes(mode))throw Error('Invalid smoke mode');
 async function get(path){
  const response=await fetcher(origin+path,{redirect:'manual',signal:AbortSignal.timeout(12000),headers:{Accept:'text/html, text/plain',...(authorization?{Authorization:authorization}:{})}});
  return {response,body:await response.text()};
 }
 for(const path of publicPaths){
  try{const {response,body}=await get(path);const issues=[];
   if(response.status!==200)issues.push('http_'+response.status);
   if(!response.headers.get('content-type')?.includes('text/html'))issues.push('not_html_content_type');
   issues.push(...validateHtml(path,body,mode,{'x-robots-tag':response.headers.get('x-robots-tag')||''}));
   out.push({path,pass:issues.length===0,issues});
  }catch{out.push({path,pass:false,issues:['request_failed_or_timeout']});}
 }
 try{const{response,body}=await get('/robots.txt');const issues=[];
  if(response.status!==200)issues.push('robots_not_served');
  if(mode==='preview'&&!/^Disallow: \/$/m.test(body))issues.push('preview_robots_not_disallowed');
  if(mode==='production'&&!/^Sitemap: https:\/\//m.test(body))issues.push('production_sitemap_not_advertised');
  out.push({path:'/robots.txt',pass:issues.length===0,issues});
 }catch{out.push({path:'/robots.txt',pass:false,issues:['request_failed_or_timeout']});}
 if(mode==='production')try{const{response,body}=await get('/sitemap.xml');const issues=[];
  if(response.status!==200)issues.push('sitemap_not_served');
  if((body.match(/<url>/g)||[]).length!==8)issues.push('unexpected_sitemap_routes');
  out.push({path:'/sitemap.xml',pass:issues.length===0,issues});
 }catch{out.push({path:'/sitemap.xml',pass:false,issues:['request_failed_or_timeout']});}
 return {scope:'public',origin,mode,passed:out.every(r=>r.pass),checks:out};
}

export async function smokePortal(url,{fetcher=fetch,authorization=accessHeader()}={}){
 const origin=base(url),checks=[];
 for(const [path,want]of [['/healthz',200],['/readyz',200],['/api/materials',401]]){
  try{const r=await fetcher(origin+path,{redirect:'manual',signal:AbortSignal.timeout(12000),headers:authorization?{Authorization:authorization}:{}});checks.push({path,pass:r.status===want,status:r.status,want});}
  catch{checks.push({path,pass:false,status:'request_failed_or_timeout',want});}
 }
 return {scope:'portal',origin,passed:checks.every(x=>x.pass),checks};
}

export function args(argv){const out={mode:'preview'};
 for(let i=0;i<argv.length;i++){
  const a=argv[i];if(!['--public','--portal','--mode'].includes(a)||!argv[i+1]||argv[i+1].startsWith('--'))throw Error('Unexpected/incomplete option '+a);
  const key=a.slice(2);if(Object.hasOwn(out,key)&&key!=='mode')throw Error('Duplicate '+a);out[key]=argv[++i];
 }
 if(!out.public)throw Error('Supply --public https://preview.example');
 if(!['preview','production'].includes(out.mode))throw Error('Unknown --mode');
 if(out.mode==='production'&&!out.portal)throw Error('Production acceptance also requires --portal');
 base(out.public);if(out.portal)base(out.portal);
 return out;
}

if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 try{const opt=args(process.argv.slice(2)),reports=[await smokePublic(opt.public,{mode:opt.mode})];
  if(opt.portal)reports.push(await smokePortal(opt.portal));
  for(const report of reports){console.log(report.scope+': '+(report.passed?'PASS':'FAIL')+' ('+report.origin+')');for(const check of report.checks)console.log('  '+(check.pass?'OK':'FAIL')+' '+check.path+(check.issues?.length?' '+check.issues.join(','):'') );}
  if(!reports.every(r=>r.passed))process.exitCode=1;
  else console.log('HTTP checks passed. This does NOT certify live payments, email delivery, accessibility, E2EE, backups or legal compliance.');
 }catch(e){console.error('Smoke verification failed: '+e.message);process.exitCode=1;}
}
