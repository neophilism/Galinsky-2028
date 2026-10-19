import {readFile,stat} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {CampaignStore} from './campaign-store.mjs';
import {renderCampaignDraftPage} from './campaign-draft-preview.mjs';
import {CampaignError,CAMPAIGN_FIELDS,THEME_TOKENS,HERO_EFFECT_PRESETS,HERO_EFFECT_SPEEDS,HERO_EFFECT_DEFAULT,exactCampaignKeys} from '../../../packages/core/campaign-content.mjs';
import {createCampaignAuthorization} from '../../../packages/core/campaign-access.mjs';
import {normalizeCampaignPng,decodeCampaignUpload} from '../../../packages/core/campaign-image.mjs';
import {readCookie,validToken,tokenHash} from '../../../packages/core/auth.mjs';
const STATIC_HERO=fileURLToPath(new URL('../../web/public/assets/candidate.webp',import.meta.url));
const editorFile=name=>new URL('../../editor/'+name,import.meta.url);
export function registerCampaignEditor(app,{accountStore,config,env=process.env,campaignStore=null,authorize=null}={}){
 const enabled=env.G28_CAMPAIGN_EDITOR_ENABLED==='true';
 const store=campaignStore||(accountStore.pool?new CampaignStore(accountStore.pool,{verifyStaticAsset:async path=>path==='/assets/candidate.webp'&&(await stat(STATIC_HERO).catch(()=>null))?.isFile()===true}):null);
 const auth=authorize||createCampaignAuthorization({enabled:enabled&&Boolean(store),config,accountStore,readCookie,validToken,tokenHash});
 const caught=(error,reply)=>{
  if(error instanceof CampaignError)return reply.code(error.statusCode).send({error:error.code,message:error.message});
  throw error;
 };
 function route(method,path,permissions,handler,bodyLimit=512*1024){
  app.route({method,url:'/api/editorial'+path,bodyLimit,
   onRequest:async(req,reply)=>{reply.header('Cache-Control','private, no-store').header('Vary','Cookie, Authorization');try{req.campaignIdentity=await auth(req,permissions);}catch(error){return caught(error,reply);}},
   handler:async(req,reply)=>{try{return await handler(req,reply);}catch(error){return caught(error,reply);}}
  });
 }
 const body=(req,keys)=>exactCampaignKeys(req.body,keys,'editorial request');
 route('GET','/contract',{},async req=>({schemaVersion:1,fields:CAMPAIGN_FIELDS,themeTokens:THEME_TOKENS,heroEffectPresets:HERO_EFFECT_PRESETS,heroEffectSpeeds:HERO_EFFECT_SPEEDS,heroEffectDefault:HERO_EFFECT_DEFAULT,role:req.campaignIdentity.role,builtinHero:'/assets/candidate.webp'}));
 route('GET','/campaigns',{},req=>store.list({after:req.query.after||null,limit:req.query.limit==null?30:Number(req.query.limit),search:req.query.search||'',archived:req.query.archived==='true'}));
 route('GET','/campaigns/:id',{},req=>store.get(req.params.id,{revision:req.query.revision==null?null:Number(req.query.revision)}));
 route('POST','/campaigns',{write:true},req=>{const b=body(req,['document']);return store.create(b.document,req.campaignIdentity.actorId);});
 route('PUT','/campaigns/:id',{write:true},req=>{const b=body(req,['expectedRevision','document']);return store.save(req.params.id,b.expectedRevision,b.document,req.campaignIdentity.actorId);});
 route('POST','/campaigns/:id/duplicate',{write:true},req=>{const b=body(req,['expectedRevision','name']);return store.duplicate(req.params.id,b.expectedRevision,b.name,req.campaignIdentity.actorId);});
 route('POST','/campaigns/:id/publish',{write:true,owner:true},req=>{const b=body(req,['expectedRevision']);return store.publish(req.params.id,b.expectedRevision,req.campaignIdentity.actorId);});
 route('POST','/campaigns/:id/archive',{write:true,owner:true},req=>{const b=body(req,['expectedRevision','expectedLifecycleVersion','archived']);return store.setArchived(req.params.id,b.expectedRevision,b.expectedLifecycleVersion,b.archived,req.campaignIdentity.actorId);});
 route('POST','/campaigns/:id/restore',{write:true},req=>{const b=body(req,['expectedRevision','sourceRevision']);return store.restore(req.params.id,b.expectedRevision,b.sourceRevision,req.campaignIdentity.actorId);});
 route('GET','/campaigns/:id/history',{},req=>store.history(req.params.id,{before:req.query.before==null?2147483647:Number(req.query.before),limit:req.query.limit==null?30:Number(req.query.limit)}));
 route('GET','/settings',{},()=>store.settings());
 route('PUT','/settings',{write:true,owner:true},req=>{const b=body(req,['expectedVersion','settings']);return store.saveSettings(b.expectedVersion,b.settings,req.campaignIdentity.actorId);});
 route('GET','/sharing-assets',{mfa:true},req=>store.sharingAssets({after:req.query.after||null,limit:req.query.limit==null?30:Number(req.query.limit)}));
 route('GET','/sharing-assets/:id',{mfa:true},req=>store.sharingAsset(req.params.id));
 route('POST','/sharing-assets',{write:true,mfa:true},req=>{const b=body(req,['document']);return store.createSharingAsset(b.document,req.campaignIdentity.actorId);});
 route('PUT','/sharing-assets/:id',{write:true,mfa:true},req=>{const b=body(req,['expectedRevision','document']);return store.saveSharingAsset(req.params.id,b.expectedRevision,b.document,req.campaignIdentity.actorId);});
 route('POST','/sharing-assets/:id/publish',{write:true,owner:true,mfa:true},req=>{const b=body(req,['expectedRevision','expectedPublicationVersion']);return store.publishSharingAsset(req.params.id,b.expectedRevision,b.expectedPublicationVersion,req.campaignIdentity.actorId);});
 route('POST','/sharing-assets/:id/withdraw',{write:true,owner:true,mfa:true},req=>{const b=body(req,['expectedPublicationVersion']);return store.withdrawSharingAsset(req.params.id,b.expectedPublicationVersion,req.campaignIdentity.actorId);});
 route('GET','/media',{},req=>store.assets({after:req.query.after||null,limit:req.query.limit==null?30:Number(req.query.limit)}));
 route('GET','/media/:id',{},async(req,reply)=>{const image=await store.asset(req.params.id);return reply.header('Cache-Control','private, no-store').header('X-Content-Type-Options','nosniff').type(image.contentType).send(image.bytes);});
 route('GET','/builtin-hero',{},async(req,reply)=>reply.header('Cache-Control','private, no-store').type('image/webp').send(await readFile(STATIC_HERO)));
 route('POST','/preview',{write:true},req=>{const b=body(req,['page','document','appearance']);return{html:renderCampaignDraftPage(b.document,b.page,b.appearance)};});
 route('POST','/media',{write:true,upload:true},async req=>{const b=body(req,['base64']);return store.addAsset(await normalizeCampaignPng(decodeCampaignUpload(b.base64)),req.campaignIdentity.actorId);},6*1024*1024);
 const TYPES={css:'text/css; charset=utf-8',woff2:'font/woff2',svg:'image/svg+xml',png:'image/png',webp:'image/webp',jpg:'image/jpeg',jpeg:'image/jpeg',avif:'image/avif'};
 app.get('/editor/campaigns/preview-assets/:filename',{onRequest:async(req,reply)=>{reply.header('Cache-Control','private, no-store').header('Vary','Cookie, Authorization');try{await auth(req);}catch(error){return caught(error,reply);}}},async(req,reply)=>{
  const file=req.params.filename;
  if(typeof file!=='string'||!thisFile(file))return reply.code(404).type('text/plain').send('Asset not found.');
  const type=file.split('.').at(-1).toLowerCase();
  try{return reply.header('Cache-Control','private, no-store').header('X-Content-Type-Options','nosniff').header('Referrer-Policy','no-referrer').type(TYPES[type]).send(await readFile(new URL('../../web/public/assets/'+file,import.meta.url)));}
  catch(error){if(error.code==='ENOENT')return reply.code(404).send('Asset not found.');throw error;}
 });
 function thisFile(value){return /^[A-Za-z0-9][A-Za-z0-9._-]{0,100}\.(?:css|woff2|svg|png|webp|jpg|jpeg|avif)$/i.test(value);}
 const files=[['/editor/campaigns','index.html','text/html; charset=utf-8'],['/editor/campaigns/editor.mjs','editor.mjs','application/javascript'],['/editor/campaigns/editor.css','editor.css','text/css']];
 for(const [url,file,type]of files)app.get(url,{
  onRequest:async(req,reply)=>{
   reply.header('Cache-Control','private, no-store').header('Vary','Cookie, Authorization');
   if(!enabled)return reply.code(503).type('text/plain').send('The campaign editor is not enabled.');
   // Static source, not just API responses, is restricted to freshly verified
   // owner/editor sessions. A shared preview password is insufficient.
   try{req.campaignIdentity=await auth(req);}catch(error){return caught(error,reply);}
  }
 },async(req,reply)=>{
  return reply.header('Cache-Control','private, no-store').header('Content-Security-Policy',"default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; connect-src 'self'; img-src 'self' blob:; object-src 'none'; base-uri 'none'; frame-ancestors 'none'; form-action 'self'").type(type).send(await readFile(editorFile(file)));
 });
 return{enabled:enabled&&Boolean(store),store};
}
