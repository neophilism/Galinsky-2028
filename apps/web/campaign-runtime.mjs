import {readFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import {CampaignPublicStore} from '../api/src/campaign-store.mjs';
import {validatePublicCampaignDocument,campaignId,revisionNumber,CampaignError} from '../../packages/core/campaign-content.mjs';
import {compileCampaignTemplate,renderCampaignTemplate} from '../../packages/core/campaign-template.mjs';
import {CAMPAIGN_PRESENTATION_CSS} from '../../packages/core/campaign-presentation.mjs';
import {CAMPAIGN_MODE_SCRIPT,campaignPreferences} from '../../packages/core/campaign-mode.mjs';
const ROUTES=new Map([['/','index'],['/issues/','issues'],['/issues/kirk-evers/','kirk-evers'],['/issues/garden/','garden'],['/issues/cornerstone/','cornerstone'],['/volunteer/','volunteer'],['/donate/','donate'],['/notices/','notices']]);
export async function verifyCampaignReadRole(pool){
 const q=await pool.query("SELECT has_table_privilege(current_user,'g28.content_revisions','SELECT,INSERT,UPDATE,DELETE') AS private_access, has_table_privilege(current_user,'g28.campaign_public_releases','SELECT') AND has_table_privilege(current_user,'g28.campaign_public_settings','SELECT') AND has_table_privilege(current_user,'g28.campaign_public_media','SELECT') AS public_access");
 if(q.rows[0]?.private_access!==false||q.rows[0]?.public_access!==true)throw Error('Campaign rendering requires a published-only database role.');
}
export function campaignTransientError(error){return typeof error?.code==='string'&&(/^(08|57P0)/.test(error.code)||['ECONNRESET','ECONNREFUSED','ETIMEDOUT','53300'].includes(error.code));}
function safeSnapshot(value){
 if(!value||!Number.isSafeInteger(value.settingsVersion)||value.settingsVersion<1||typeof value.modeSwitching!=='boolean'||!['day','night','default'].includes(value.selection?.mode))throw Error('Invalid published snapshot.');
 if(value.modeSwitching===false&&value.selection.mode!=='default'||value.modeSwitching===true&&value.selection.mode==='default')throw Error('Inconsistent published appearance.');
 return{settingsVersion:value.settingsVersion,modeSwitching:value.modeSwitching,selection:{campaignId:campaignId(value.selection.campaignId),revision:revisionNumber(value.selection.revision),mode:value.selection.mode},document:validatePublicCampaignDocument(value.document)};
}
function reply(req,res,status,type,body){res.statusCode=status;res.setHeader('Content-Type',type);res.setHeader('Content-Length',Buffer.byteLength(body));res.end(req.method==='HEAD'?undefined:body);}
function appendCookie(res,value){const previous=res.getHeader('Set-Cookie');res.setHeader('Set-Cookie',[...(Array.isArray(previous)?previous:previous?[previous]:[]),value]);}
export function createCampaignRuntime({env=process.env,directory=resolve('dist/web'),store=null,poolFactory=null,clock=()=>Date.now(),readTemplate=null}={}){
 if(env.G28_CAMPAIGN_PUBLIC_ENABLED!=='true')return null;
 let pool=null;const templates=new Map(),rendered=new Map(),lastGood=new Map();
 const ready=(async()=>{
  if(store)return store;
  const url=env.G28_CAMPAIGN_READ_DATABASE_URL||env.G28_REVIEW_DATABASE_URL;
  if(!url)throw Error('Campaign rendering requires an existing published-only database credential.');
  const factory=poolFactory||(await import('../api/src/postgres-store.mjs')).databasePool;
  pool=factory(url);await verifyCampaignReadRole(pool);return new CampaignPublicStore(pool);
 })();
 // The server awaits ready at startup. Prevent an unhandled rejection if a test
 // creates and immediately closes a server before its first HTTP request.
 void ready.catch(()=>{});
 async function template(path,key){if(!templates.has(path)){const html=readTemplate?await readTemplate(path,key):await readFile(resolve(directory,'.'+path,'index.html'),'utf8');templates.set(path,compileCampaignTemplate(html,key));}return templates.get(path);}
 async function snapshot(preferences){
  const key=preferences.preference+':'+(preferences.systemMode||'unknown');
  try{const s=safeSnapshot(await(await ready).snapshot(preferences));lastGood.set(key,{value:s,at:clock()});return{snapshot:s,stale:false};}
  catch(error){const saved=lastGood.get(key);if(campaignTransientError(error)&&saved&&clock()-saved.at<=300000)return{snapshot:saved.value,stale:true};throw error;}
 }
 return{
  ready:()=>ready.then(()=>undefined),
  async close(){templates.clear();rendered.clear();lastGood.clear();try{await ready;}catch{}if(pool)await pool.end();},
  async handle(req,res,pathname,{authorized=false}={}){
   const path=pathname==='/'?'/':typeof pathname==='string'&&!pathname.endsWith('/')?pathname+'/':pathname;
   const route=ROUTES.get(path),media=/^\/campaign-media\/([0-9a-f-]{36})\.png$/.exec(pathname||''),script=pathname==='/assets/campaign-mode.js';
   if(!route&&!media&&!script)return false;
   res.setHeader('Cache-Control','private, no-store, max-age=0');res.setHeader('Vary','Authorization, Cookie');res.setHeader('X-Content-Type-Options','nosniff');
   if(!authorized){reply(req,res,401,'text/plain; charset=utf-8','Private preview access is required.');return true;}
   if(!['GET','HEAD'].includes(req.method)){res.setHeader('Allow','GET, HEAD');reply(req,res,405,'text/plain; charset=utf-8','Method not allowed.');return true;}
   try{
    if(script){reply(req,res,200,'application/javascript; charset=utf-8',CAMPAIGN_MODE_SCRIPT);return true;}
    if(media){const image=await(await ready).asset(campaignId(media[1]));reply(req,res,200,image.contentType,image.bytes);return true;}
    if(typeof req.url!=='string'||req.url.length>4096)throw Error('Invalid page request.');
    const preferences=campaignPreferences(req.url,req.headers.cookie||''),loaded=await snapshot(preferences),s=loaded.snapshot;
    if(s.modeSwitching&&preferences.explicit){const suffix='; Path=/; Max-Age=31536000; SameSite=Lax'+(env.NODE_ENV==='production'?'; Secure':'');appendCookie(res,'g28-appearance='+preferences.preference+suffix);if(preferences.systemMode)appendCookie(res,'g28-system-mode='+preferences.systemMode+suffix);}
    const cacheKey=[path,s.settingsVersion,s.selection.campaignId,s.selection.revision,s.selection.mode,s.modeSwitching,preferences.preference].join('|');
    let html=rendered.get(cacheKey);
    if(!html){html=renderCampaignTemplate(await template(path,route),s.document,{mode:s.selection.mode,preference:preferences.preference,modeEnabled:s.modeSwitching,settingsVersion:s.settingsVersion,path,css:CAMPAIGN_PRESENTATION_CSS});if(rendered.size>=48)rendered.delete(rendered.keys().next().value);rendered.set(cacheKey,html);}
    if(loaded.stale)res.setHeader('X-Campaign-Snapshot','last-known-good');
    reply(req,res,200,'text/html; charset=utf-8',html);return true;
   }catch(error){const status=error instanceof CampaignError&&error.code==='asset_not_found'?404:503;reply(req,res,status,'text/plain; charset=utf-8',status===404?'Published image not found.':'Published website content is temporarily unavailable.');return true;}
  }
 };
}
