// Read-only, live policy distribution from expressly selected paths in three PRIVATE repositories.
// Each request resolves the CURRENT branch tree. No policy source is mirrored into this repo.
// Requires a fine-grained, contents:read GitHub token at the existing Render web service.
// Never proxy raw user-supplied URLs, scripts, archives or restricted Garden research.
import {createHash} from 'node:crypto';

const sources={
 'kirk-evers':{repo:'Galinsky-2028',ref:'main',paths:[
  /^content\/policies\/source\/kirk-evers-[a-z0-9-]+\.(?:txt|pdf)$/i
 ]},
 garden:{repo:'The-Garden',ref:'docs/policy-research-source-library-20261012',paths:[
  /^policy\/legislation\/[a-z0-9_.-]+\.(?:md|tex|docx|pdf)$/i,
  /^policy\/supporting\/garden\.(?:docx|md|pdf)$/i
 ]},
 cornerstone:{repo:'The-Cornerstone',ref:'main',paths:[
  /^policy\/(?:Policy_Paper|Design_Commentary|Displacement_Event_Census|Event_Evidence|Federal_Cornerstone_Bill|Model_State_Cornerstone_Enabling_Act|Speech)\.(?:docx|xlsx|srt|md|pdf)$/i
 ]}
};
const types={pdf:'application/pdf',docx:'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
 xlsx:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
 txt:'text/plain; charset=utf-8',md:'text/markdown; charset=utf-8',
 tex:'text/plain; charset=utf-8',srt:'text/plain; charset=utf-8'};
const names={'kirk-evers':'Kirk–Evers','garden':'The Garden','cornerstone':'The Cornerstone'};
const maxSize=8*1024*1024;
const cache=new Map();
function allowed(slug,path){
 const source=sources[slug];
 return Boolean(source&&typeof path==='string'&&path.length<256&&!path.includes('..')&&
  source.paths.some(re=>re.test(path)));
}
function httpError(){const e=new Error('Policy source is unavailable. Please try again later.');e.statusCode=503;return e;}
export function policySources(){return Object.fromEntries(Object.entries(sources).map(([key,s])=>[key,{repo:s.repo,ref:s.ref}]));}
export function policyFilesFromTree(slug,tree){
 if(!sources[slug]||!Array.isArray(tree)||tree.length>10000)throw httpError();
 const entries=tree.filter(item=>item&&item.type==='blob'&&allowed(slug,item.path)&&
  /^[0-9a-f]{40}$/.test(item.sha)&&Number.isSafeInteger(item.size)&&item.size>0&&item.size<=maxSize);
 return entries.map(item=>({path:item.path,sha:item.sha,size:item.size,
  name:item.path.split('/').at(-1)})).sort((a,b)=>a.path.localeCompare(b.path));
}
function safeToken(token){return typeof token==='string'&&token.length>25&&token.length<1024&&/^[a-zA-Z0-9_-]+$/.test(token);}
async function api(url,token,fetchImpl){
 let resp;try{resp=await fetchImpl(url,{method:'GET',headers:{
  Accept:'application/vnd.github+json',
  Authorization:'Bearer '+token,
  'X-GitHub-Api-Version':'2022-11-28',
  'User-Agent':'Galinsky-2028-private-policy-library'
 },redirect:'error',signal:AbortSignal.timeout(12000)});}catch{throw httpError();}
 if(!resp.ok)throw httpError();
 const length=Number(resp.headers?.get('content-length')||0);
 if(length>16*1024*1024)throw httpError();
 try{return await resp.json();}catch{throw httpError();}
}
export async function livePolicyIndex(slug,{token,fetchImpl=fetch,now=Date.now(),ttl=60000}={}){
 const source=sources[slug];
 if(!source)throw new Error('Unknown policy issue');
 if(!safeToken(token))throw httpError();
 // Separate caches for each token without storing tokens; a new token invalidates earlier results.
 const fingerprint=createHash('sha256').update(token).digest('hex').slice(0,16);
 const cacheKey=slug+':'+fingerprint;
 const old=cache.get(cacheKey);
 if(old&&now<old.expires)return old.value;
 const url='https://api.github.com/repos/neophilism/'+source.repo+'/git/trees/'+encodeURIComponent(source.ref)+'?recursive=1';
 const data=await api(url,token,fetchImpl);
 if(!data||data.truncated||!Array.isArray(data.tree)||!(/^[0-9a-f]{40}$/.test(data.sha||'')))throw httpError();
 const value={repo:source.repo,ref:source.ref,treeSha:data.sha,files:policyFilesFromTree(slug,data.tree)};
 cache.set(cacheKey,{expires:now+ttl,value});
 return value;
}
export async function livePolicyBytes(slug,sha,{token,fetchImpl=fetch,index}={}){
 if(!sources[slug]||typeof sha!=='string'||!/^[0-9a-f]{40}$/.test(sha))throw new Error('Invalid policy file');
 const match=index?.files.find(item=>item.sha===sha);
 if(!match)throw new Error('Policy file is no longer in the current source tree');
 if(!safeToken(token))throw httpError();
 const data=await api('https://api.github.com/repos/neophilism/'+index.repo+'/git/blobs/'+sha,token,fetchImpl);
 if(data.encoding!=='base64'||typeof data.content!=='string'||!Number.isSafeInteger(data.size)||
  data.size!==match.size||data.size>maxSize)throw httpError();
 const bytes=Buffer.from(data.content.replace(/\s/g,''),'base64');
 const digest=createHash('sha1').update('blob '+bytes.length+'\0').update(bytes).digest('hex');
 if(bytes.length!==match.size||digest!==sha)throw httpError();
 const ext=match.name.split('.').at(-1).toLowerCase();
 if(!Object.hasOwn(types,ext))throw httpError();
 return {bytes,name:match.name,mime:types[ext]};
}
function esc(s){return String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}
export function policyIndexHtml(slug,index){
 if(!sources[slug])throw new Error('Unknown policy issue');
 const rows=index.files.map(f=>'<li><a href="/policy-library/'+slug+'/download/'+f.sha+'">'+esc(f.name)+'</a>'+
  '<small>'+esc(f.path)+' · '+(f.size/1024).toFixed(1)+' KB · Git blob '+f.sha.slice(0,10)+'</small></li>').join('');
 const empty='<p>No permitted documents are currently present in this source branch.</p>';
 return '<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">'+
  '<meta name="robots" content="noindex,nofollow"><meta name="referrer" content="no-referrer">'+
  '<title>'+esc(names[slug])+' — Source Documents | Galinsky 2028</title>'+
  '<link rel="stylesheet" href="/assets/design.css"><link rel="stylesheet" href="/assets/site.css"></head>'+
  '<body><main id="main" style="max-width:960px;margin:4rem auto;padding:2rem">'+
  '<a href="/issues/'+slug+'/">&larr; Back to '+esc(names[slug])+'</a>'+
  '<p class="eyebrow">PRIVATE CAMPAIGN POLICY LIBRARY</p><h1>'+esc(names[slug])+' — Source Documents</h1>'+
  '<p>These are the current documents in the authorized GitHub source branch, not an introduced or enacted law. Replacing a file in that branch updates the downloadable source automatically, without copying it into the campaign repository.</p>'+
  '<p class="tiny">Source: '+esc('neophilism/'+index.repo)+' · branch: '+esc(index.ref)+' · tree: '+index.treeSha.slice(0,12)+
  '. Refresh to check for changes (source metadata cache up to one minute).</p>'+
  (index.files.length?'<ul class="policy-live-documents">'+rows+'</ul>':empty)+
  '<p class="tiny">Restricted historical archives, operational files and unapproved sources are not exposed. Files download exactly as committed and may carry their original draft status.</p>'+
  '</main></body></html>';
}
