// Synthetic UI harness only. Real authorization and persistence are tested separately.
import {createServer} from 'node:http';
import {readFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {deflateSync} from 'node:zlib';
import {fixture,id} from '../campaign-fixture.mjs';
import {CAMPAIGN_FIELDS,THEME_TOKENS,HERO_EFFECT_DEFAULT,HERO_EFFECT_PRESETS,HERO_EFFECT_SPEEDS,validateCampaignDocument,validateCampaignSettings,publicCampaignDocument} from '../../packages/core/campaign-content.mjs';
import {normalizeCampaignPng,pngChunk} from '../../packages/core/campaign-image.mjs';
import {renderCampaignDraftPage} from '../../apps/api/src/campaign-draft-preview.mjs';
const root=fileURLToPath(new URL('../../apps/editor/',import.meta.url));
const doc=(name,text)=>{const d=fixture();d.internalName=name;d.fields['home.hero.headline']=text;d.hero.assetPath='/assets/candidate.webp';return d;};
export async function startEditorHarness({port=0}={}){
 const records=new Map([[id(1),{id:id(1),revision:1,document:doc('Synthetic left','First synthetic headline'),publishedRevision:1,archived:false,lifecycleVersion:0}],[id(2),{id:id(2),revision:1,document:doc('Synthetic right','Second synthetic headline'),publishedRevision:1,archived:false,lifecycleVersion:0}]]);
 let next=3,settings={version:0,settings:null};const media=new Map(),calls=[],versions=new Map();
 const header=Buffer.alloc(13);header.writeUInt32BE(1);header.writeUInt32BE(1,4);header[8]=8;header[9]=6;
 const raster=Buffer.concat([Buffer.from([137,80,78,71,13,10,26,10]),pngChunk('IHDR',header),pngChunk('IDAT',deflateSync(Buffer.from([0,100,140,180,255]))),pngChunk('IEND',Buffer.alloc(0))]);
 const server=createServer(async(req,res)=>{
  const u=new URL(req.url,'http://localhost');let body={};
  function send(data,status=200,type='application/json'){res.writeHead(status,{'Content-Type':type,'Cache-Control':'no-store','X-Content-Type-Options':'nosniff'});res.end(type==='application/json'?JSON.stringify(data):data);}
  try{
   if(req.method!=='GET'){const parts=[];for await(const part of req)parts.push(part);body=JSON.parse(Buffer.concat(parts).toString()||'{}');}
   calls.push({method:req.method,path:u.pathname,body:structuredClone(body)});
   const files=new Map([['/editor/campaigns',['index.html','text/html']],['/editor/campaigns/editor.mjs',['editor.mjs','application/javascript']],['/editor/campaigns/editor.css',['editor.css','text/css']]]);
   if(files.has(u.pathname)){const [name,type]=files.get(u.pathname);res.setHeader('Content-Security-Policy',"default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; connect-src 'self'; img-src 'self' blob:; object-src 'none'; base-uri 'none'; frame-ancestors 'none'; form-action 'self'");return send(await readFile(root+name),200,type);}
   if(u.pathname==='/favicon.ico')return send('',204,'text/plain');
   if(u.pathname==='/api/session')return send({csrf:'synthetic-csrf',account:{role:'owner'}});
   if(u.pathname==='/api/editorial/preview'&&req.method==='POST')return send({html:renderCampaignDraftPage(body.document,body.page,body.appearance)});
   if(u.pathname==='/editor/campaigns/preview-assets/candidate.webp')return send(raster,200,'image/png');
   if(u.pathname==='/editor/campaigns/preview-assets/hero-effects.css')return send(await readFile(new URL('../../apps/web/public/assets/hero-effects.css',import.meta.url)),200,'text/css');
   if(u.pathname==='/api/editorial/contract')return send({schemaVersion:1,fields:CAMPAIGN_FIELDS,themeTokens:THEME_TOKENS,heroEffectDefault:HERO_EFFECT_DEFAULT,heroEffectPresets:HERO_EFFECT_PRESETS,heroEffectSpeeds:HERO_EFFECT_SPEEDS,role:'owner',builtinHero:'/assets/candidate.webp'});
   if(u.pathname==='/api/editorial/builtin-hero')return send(raster,200,'image/png');
   if(u.pathname==='/api/editorial/settings'){
    if(req.method==='PUT'){if(body.expectedVersion!==settings.version)return send({message:'Settings changed',error:'revision_conflict'},409);const validated=validateCampaignSettings(body.settings);await new Promise(r=>setTimeout(r,80));settings={version:settings.version+1,settings:validated};}
    return send(settings);
   }
   if(u.pathname==='/api/editorial/media'){
    if(req.method==='POST'){const image=await normalizeCampaignPng(Buffer.from(body.base64,'base64'));const key=id(900+media.size);media.set(key,image.bytes);return send({id:key,path:'/campaign-media/'+key+'.png',width:image.width,height:image.height,bytes:image.bytes.length});}
    return send({items:[...media.keys()].map(key=>({id:key,path:'/campaign-media/'+key+'.png',width:1,height:1})),next:null});
   }
   if(u.pathname.startsWith('/api/editorial/media/'))return send(media.get(u.pathname.split('/').at(-1))||raster,200,'image/png');
   if(u.pathname==='/api/editorial/campaigns'){
    if(req.method==='POST'){const key=id(next++),document=validateCampaignDocument(body.document);records.set(key,{id:key,revision:1,document,publishedRevision:null,lifecycleVersion:0,archived:false});return send(records.get(key));}
    const items=[...records.values()].filter(x=>(u.searchParams.get('archived')==='true'||!x.archived)&&x.document.internalName.toLowerCase().includes((u.searchParams.get('search')||'').toLowerCase())).map(x=>({id:x.id,name:x.document.internalName,draftRevision:x.revision,publishedRevision:x.publishedRevision,archived:x.archived}));return send({items,next:null});
   }
   const match=/^\/api\/editorial\/campaigns\/([0-9a-f-]+)(?:\/(history|duplicate|publish|archive|restore))?$/.exec(u.pathname);
   if(match){const record=records.get(match[1]);if(!record)return send({message:'Missing'},404);const action=match[2];
    if(req.method==='GET'){if(action==='history')return send({items:[{revision:1}],next:null});return send(record);}
    if(body.expectedRevision!==record.revision)return send({message:'Concurrent edit detected. Your draft remains unsaved.',error:'revision_conflict'},409);
    if(!action){versions.set(record.id+':'+record.revision,structuredClone(record));record.document=validateCampaignDocument(body.document);record.revision++;return send(record);}
    if(action==='duplicate'){const key=id(next++);records.set(key,{id:key,revision:1,document:{...structuredClone(record.document),internalName:body.name},publishedRevision:null,lifecycleVersion:0,archived:false});return send(records.get(key));}
    if(action==='publish'){publicCampaignDocument(record.document);record.publishedRevision=record.revision;return send({id:record.id,revision:record.revision});}
    if(action==='archive'){record.archived=body.archived;record.lifecycleVersion++;return send(record);}
    if(action==='restore'){const original=versions.get(record.id+':'+body.sourceRevision);if(!original)return send({message:'Missing old version'},404);record.document=original.document;record.revision++;return send(record);}
   }
   return send({message:'Harness route not found'},404);
  }catch(error){return send({message:error.message,error:error.code||'harness_error'},error.statusCode||500);}
 });
 await new Promise(resolve=>server.listen(port,'127.0.0.1',resolve));
 return{server,origin:`http://127.0.0.1:${server.address().port}`,records,media,calls,raster,getSettings:()=>structuredClone(settings),close:()=>new Promise(resolve=>server.close(resolve))};
}
if(process.argv[1]===fileURLToPath(import.meta.url)){const harness=await startEditorHarness({port:Number(process.env.PORT||8765)});console.log(harness.origin);}
