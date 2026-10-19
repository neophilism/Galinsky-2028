import {campaignSharing,publicCampaignSharing} from './sharing-assets-store.mjs';
import {randomUUID} from 'node:crypto';
import {
 CAMPAIGN_RECORD_PREFIX as DOC, CAMPAIGN_PUBLIC_PREFIX as PUB, CAMPAIGN_SETTINGS_KEY as SETTINGS,
 campaignId, revisionNumber, validateCampaignDocument, validateEditorialName,
 publicCampaignDocument, validateCampaignSettings, validatePublicCampaignDocument,
 resolveCampaignSelection, campaignFailure,
} from '../../../packages/core/campaign-content.mjs';
const LIFE='campaign.lifecycle.';
const ASSET='campaign.asset.';
const conflict=()=>campaignFailure('revision_conflict','Another change was saved. Reload the current revision without discarding your edits.',409);
function actor(value){if(typeof value!=='string'||!value||value.length>180||/[\x00-\x1f\x7f]/.test(value))campaignFailure('invalid_actor','A verified editor identity is required.',403);return value;}
function version(value){if(!Number.isSafeInteger(value)||value<0)campaignFailure('invalid_revision','Invalid expected version.');return value;}
const result=row=>row?{revision:row.revision,document:row.record}:null;
// Namespaces are isolated from the existing material publication contract.
// All changes append immutable revisions; no prior publication is updated.
export class CampaignStore {
 constructor(pool,{verifyStaticAsset=async()=>false}={}){this.pool=pool;this.verifyStaticAsset=verifyStaticAsset;}
 async latest(client,key,revision=null){
  const q=revision==null?await client.query('SELECT revision,record FROM g28.content_revisions WHERE content_key=$1 ORDER BY revision DESC LIMIT 1',[key]):await client.query('SELECT revision,record FROM g28.content_revisions WHERE content_key=$1 AND revision=$2',[key,revisionNumber(revision)]);
  return result(q.rows[0]);
 }
 async append(client,key,revision,document,by,state='draft'){
  await client.query('INSERT INTO g28.content_revisions(id,content_key,revision,record,state,author_subject) VALUES($1,$2,$3,$4::jsonb,$5,$6)',[randomUUID(),key,revision,JSON.stringify(document),state,actor(by)]);
 }
 async audit(client,by,action,id,revision){
  await this.append(client,'campaign.audit.'+randomUUID(),1,{schemaVersion:1,action,campaignId:id,revision},by,'audit');
 }
 async transaction(operation){
  const client=await this.pool.connect();
  try{await client.query('BEGIN');await client.query('SELECT pg_advisory_xact_lock(280028,1)');const value=await operation(client);await client.query('COMMIT');return value;}
  catch(error){try{await client.query('ROLLBACK');}catch{}throw error;}finally{client.release();}
 }
 async active(client,id){
  const state=await this.latest(client,LIFE+id);
  if(state?.document.archived===true)campaignFailure('campaign_archived','Restore this campaign before editing or publishing.',409);
 }
 async get(id,{revision=null}={}){
  id=campaignId(id);const row=await this.latest(this.pool,DOC+id,revision);
  if(!row)campaignFailure('campaign_not_found','Campaign not found.',404);
  const state=await this.latest(this.pool,LIFE+id);const published=await this.latest(this.pool,PUB+id);
  return{id,...row,document:validateCampaignDocument(row.document),archived:state?.document.archived===true,lifecycleVersion:state?.revision??0,publishedRevision:published?.revision??null};
 }
 async list({after=null,limit=30,search='',archived=false}={}){
  if(!Number.isSafeInteger(limit)||limit<1||limit>100)campaignFailure('invalid_page','Choose a page size from 1 through 100.');
  if(typeof search!=='string'||search.length>160||typeof archived!=='boolean')campaignFailure('invalid_search','Invalid campaign search.');
  const cursor=after==null?'':DOC+campaignId(after);
  const q=await this.pool.query(`WITH latest AS (
   SELECT DISTINCT ON(content_key) content_key,revision,record FROM g28.content_revisions
   WHERE content_key LIKE 'campaign.document.%' AND content_key>$1 ORDER BY content_key,revision DESC
  ) SELECT d.content_key,d.revision,d.record->>'internalName' AS name,
   (SELECT max(p.revision) FROM g28.content_revisions p WHERE p.content_key=replace(d.content_key,'campaign.document.','campaign.public.') AND p.state='published') AS published_revision,
   COALESCE((SELECT (l.record->>'archived')::boolean FROM g28.content_revisions l WHERE l.content_key=replace(d.content_key,'campaign.document.','campaign.lifecycle.') ORDER BY l.revision DESC LIMIT 1),false) AS archived
  FROM latest d WHERE position(lower($2) in lower(d.record->>'internalName'))>0
   AND ($3::boolean OR NOT COALESCE((SELECT (l.record->>'archived')::boolean FROM g28.content_revisions l WHERE l.content_key=replace(d.content_key,'campaign.document.','campaign.lifecycle.') ORDER BY l.revision DESC LIMIT 1),false))
  ORDER BY d.content_key LIMIT $4`,[cursor,search,archived,limit+1]);
  const items=q.rows.slice(0,limit).map(row=>({id:campaignId(row.content_key.slice(DOC.length)),name:row.name,draftRevision:row.revision,publishedRevision:row.published_revision,archived:row.archived}));
  return{items,next:q.rows.length>limit?items.at(-1).id:null};
 }
 async create(document,by){
  document=validateCampaignDocument(document);actor(by);const id=randomUUID();
  return this.transaction(async client=>{await this.append(client,DOC+id,1,document,by);await this.audit(client,by,'create',id,1);return{id,revision:1,document,archived:false,lifecycleVersion:0,publishedRevision:null};});
 }
 async save(id,expectedRevision,document,by){
  id=campaignId(id);revisionNumber(expectedRevision);document=validateCampaignDocument(document);actor(by);
  return this.transaction(async client=>{
   await this.active(client,id);const current=await this.latest(client,DOC+id);if(!current)campaignFailure('campaign_not_found','Campaign not found.',404);if(current.revision!==expectedRevision)conflict();
   const next=expectedRevision+1;revisionNumber(next);await this.append(client,DOC+id,next,document,by);await this.audit(client,by,'save_draft',id,next);return{id,revision:next,document};
  });
 }
 async duplicate(id,expectedRevision,name,by){
  id=campaignId(id);revisionNumber(expectedRevision);name=validateEditorialName(name);actor(by);
  return this.transaction(async client=>{
   const source=await this.latest(client,DOC+id);if(!source)campaignFailure('campaign_not_found','Campaign not found.',404);if(source.revision!==expectedRevision)conflict();
   const document=validateCampaignDocument({...source.document,internalName:name}),newId=randomUUID();
   await this.append(client,DOC+newId,1,document,by);await this.audit(client,by,'duplicate',newId,1);return{id:newId,revision:1,document};
  });
 }
 async restore(id,expectedRevision,sourceRevision,by){
  id=campaignId(id);revisionNumber(expectedRevision);revisionNumber(sourceRevision);actor(by);
  return this.transaction(async client=>{
   await this.active(client,id);const current=await this.latest(client,DOC+id);if(!current)campaignFailure('campaign_not_found','Campaign not found.',404);if(current.revision!==expectedRevision)conflict();
   const source=await this.latest(client,DOC+id,sourceRevision);if(!source)campaignFailure('revision_not_found','Revision not found.',404);
   const document=validateCampaignDocument(source.document);const next=expectedRevision+1;revisionNumber(next);
   await this.append(client,DOC+id,next,document,by);await this.audit(client,by,'restore_draft',id,next);return{id,revision:next,document};
  });
 }
 async history(id,{before=2147483647,limit=30}={}){
  id=campaignId(id);revisionNumber(before);if(!Number.isInteger(limit)||limit<1||limit>100)campaignFailure('invalid_page','Invalid history page.');
  const q=await this.pool.query('SELECT revision,created_at FROM g28.content_revisions WHERE content_key=$1 AND revision<$2 ORDER BY revision DESC LIMIT $3',[DOC+id,before,limit+1]);
  return{items:q.rows.slice(0,limit).map(r=>({revision:r.revision,createdAt:r.created_at})),next:q.rows.length>limit?q.rows[limit-1].revision:null};
 }
 async settings(){const row=await this.latest(this.pool,SETTINGS);return row?{version:row.revision,settings:validateCampaignSettings(row.document)}:{version:0,settings:null};}
 async checkSelection(client,settings){
  for(const selection of [settings.default,settings.day,settings.night].filter(Boolean)){
   await this.active(client,selection.campaignId);
   const q=await client.query('SELECT record FROM g28.content_revisions WHERE content_key=$1 AND revision=$2 AND state=$3',[PUB+selection.campaignId,selection.revision,'published']);
   if(!q.rows.length)campaignFailure('unpublished_selection','Choose an existing published revision for every assignment.',409);
   validatePublicCampaignDocument(q.rows[0].record);
  }
 }
 async saveSettings(expectedVersion,settings,by){
  version(expectedVersion);settings=validateCampaignSettings(settings);actor(by);
  return this.transaction(async client=>{const current=await this.latest(client,SETTINGS);if((current?.revision??0)!==expectedVersion)conflict();await this.checkSelection(client,settings);const next=expectedVersion+1;await this.append(client,SETTINGS,next,settings,by,'published');await this.audit(client,by,'select',null,next);return{version:next,settings};});
 }
 async setArchived(id,expectedRevision,expectedLifecycleVersion,archived,by){
  id=campaignId(id);revisionNumber(expectedRevision);version(expectedLifecycleVersion);actor(by);if(typeof archived!=='boolean')campaignFailure('invalid_archive','Invalid archive action.');
  return this.transaction(async client=>{
   const current=await this.latest(client,DOC+id);if(!current)campaignFailure('campaign_not_found','Campaign not found.',404);const lifecycle=await this.latest(client,LIFE+id);
   if(current.revision!==expectedRevision||(lifecycle?.revision??0)!==expectedLifecycleVersion)conflict();
   const selected=await this.latest(client,SETTINGS);
   if(archived&&selected&&['default','day','night'].some(key=>selected.document[key]?.campaignId===id))campaignFailure('campaign_in_use','Select replacements for this campaign before archiving it.',409);
   const next=expectedLifecycleVersion+1;await this.append(client,LIFE+id,next,{schemaVersion:1,archived},by);await this.audit(client,by,archived?'archive':'unarchive',id,current.revision);return{id,archived,lifecycleVersion:next};
  });
 }
 async assetExists(client,path){
  const match=/^\/campaign-media\/([0-9a-f-]{36})\.png$/.exec(path);
  if(match){const id=campaignId(match[1]);return Boolean(await this.latest(client,ASSET+id,1));}
  return Boolean(await this.verifyStaticAsset(path));
 }
 async publish(id,expectedRevision,by){
  id=campaignId(id);revisionNumber(expectedRevision);actor(by);
  return this.transaction(async client=>{
   await this.active(client,id);const current=await this.latest(client,DOC+id);if(!current)campaignFailure('campaign_not_found','Campaign not found.',404);if(current.revision!==expectedRevision)conflict();
   const document=publicCampaignDocument(current.document);
   if(!await this.assetExists(client,document.hero.assetPath))campaignFailure('asset_unavailable','The selected hero image is unavailable.',409);
   const prior=await this.latest(client,PUB+id,expectedRevision);
   if(prior){validatePublicCampaignDocument(prior.document);return{id,revision:expectedRevision,alreadyPublished:true};}
   await this.append(client,PUB+id,expectedRevision,document,by,'published');
   const selected=await this.latest(client,SETTINGS);
   if(selected){const settings=validateCampaignSettings(selected.document);let changed=false;for(const key of ['default','day','night'])if(settings[key]?.campaignId===id){settings[key].revision=expectedRevision;changed=true;}
    if(changed)await this.append(client,SETTINGS,selected.revision+1,settings,by,'published');
   }
   await this.audit(client,by,'publish',id,expectedRevision);return{id,revision:expectedRevision,alreadyPublished:false};
  });
 }
 async addAsset({bytes,width,height},by){
  actor(by);if(!Buffer.isBuffer(bytes)||bytes.length>4*1024*1024||!Number.isInteger(width)||!Number.isInteger(height)||width<1||height<1||width*height>8000000)campaignFailure('invalid_asset','Invalid normalized image.');
  const id=randomUUID(),document={schemaVersion:1,contentType:'image/png',base64:bytes.toString('base64'),width,height,bytes:bytes.length};
  return this.transaction(async client=>{
   const used=await client.query("SELECT COALESCE(sum((record->>'bytes')::bigint),0) AS bytes FROM g28.content_revisions WHERE content_key LIKE 'campaign.asset.%'",[]);
   if(Number(used.rows[0].bytes)+bytes.length>64*1024*1024)campaignFailure('asset_storage_limit','The editorial media allocation is full. No image was stored.',409);
   await this.append(client,ASSET+id,1,document,by);await this.audit(client,by,'upload_asset',id,1);return{id,path:`/campaign-media/${id}.png`,width,height,bytes:bytes.length};
  });
 }
 async asset(id){id=campaignId(id);const row=await this.latest(this.pool,ASSET+id,1);if(!row)campaignFailure('asset_not_found','Image not found.',404);return{bytes:Buffer.from(row.document.base64,'base64'),contentType:'image/png'};}
 async assets({after=null,limit=30}={}){
  if(!Number.isInteger(limit)||limit<1||limit>100)campaignFailure('invalid_page','Invalid media page.');
  const q=await this.pool.query("SELECT content_key,record->>'width' AS width,record->>'height' AS height,record->>'bytes' AS bytes FROM g28.content_revisions WHERE content_key LIKE 'campaign.asset.%' AND content_key>$1 ORDER BY content_key LIMIT $2",[after?ASSET+campaignId(after):'',limit+1]);
  const items=q.rows.slice(0,limit).map(row=>{const id=campaignId(row.content_key.slice(ASSET.length));return{id,path:`/campaign-media/${id}.png`,width:Number(row.width),height:Number(row.height),bytes:Number(row.bytes)};});return{items,next:q.rows.length>limit?items.at(-1).id:null};
 }
}
// Uses published-only DB views; no public code needs SELECT on private revisions.
export class CampaignPublicStore {
 constructor(pool){this.pool=pool;}
 async snapshot(preferences={}){
  const s=await this.pool.query('SELECT version,document FROM g28.campaign_public_settings',[]);
  if(!s.rows[0])campaignFailure('content_unavailable','Published content is not configured.',503);
  const settings=validateCampaignSettings(s.rows[0].document),selected=resolveCampaignSelection(settings,preferences);
  const q=await this.pool.query('SELECT document FROM g28.campaign_public_releases WHERE campaign_id=$1 AND revision=$2',[selected.campaignId,selected.revision]);
  if(!q.rows[0])campaignFailure('content_unavailable','Published content is unavailable.',503);
  return{settingsVersion:s.rows[0].version,selection:selected,modeSwitching:settings.modeSwitching,document:validatePublicCampaignDocument(q.rows[0].document)};
 }
 async asset(id){
  id=campaignId(id);const q=await this.pool.query('SELECT base64 FROM g28.campaign_public_media WHERE asset_id=$1',[id]);if(!q.rows[0])campaignFailure('asset_not_found','Published image not found.',404);
  return{bytes:Buffer.from(q.rows[0].base64,'base64'),contentType:'image/png'};
 }
}

Object.assign(CampaignStore.prototype,campaignSharing);
Object.assign(CampaignPublicStore.prototype,publicCampaignSharing);
