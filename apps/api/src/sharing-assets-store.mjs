import {randomUUID} from 'node:crypto';
import {campaignId,revisionNumber,campaignFailure} from '../../../packages/core/campaign-content.mjs';
import {sharingDocument,sharingPublishable,publicSharingAsset,SHARING_ISSUES} from '../../../packages/core/sharing-assets.mjs';
const D='campaign.sharing.document.',P='campaign.sharing.public.';
const conflict=()=>campaignFailure('sharing_conflict','This asset changed. Reload before saving or publishing.',409);
const version=n=>{if(!Number.isSafeInteger(n)||n<0)conflict();return n;};
export const campaignSharing={
 async sharingAssets({after=null,limit=30}={}){
  if(!Number.isSafeInteger(limit)||limit<1||limit>50)campaignFailure('invalid_page','Choose up to fifty sharing assets.');
  const q=await this.pool.query("SELECT DISTINCT ON(content_key) content_key,revision,record FROM g28.content_revisions WHERE content_key LIKE 'campaign.sharing.document.%' AND content_key>$1 ORDER BY content_key,revision DESC LIMIT $2",[after?D+campaignId(after):D,limit+1]);
  const items=[];for(const r of q.rows.slice(0,limit))items.push(await this.sharingAsset(r.content_key.slice(D.length)));
  return {items,next:q.rows.length>limit?items.at(-1).id:null};
 },
 async sharingAsset(id,client=this.pool){
  id=campaignId(id);const row=await this.latest(client,D+id);if(!row)campaignFailure('sharing_not_found','Sharing asset not found.',404);const publication=await this.latest(client,P+id);
  return {id,revision:row.revision,document:sharingDocument(row.document),publicationVersion:publication?.revision??0,status:publication?.document.status??'draft',publishedRevision:publication?.document.sourceRevision??null};
 },
 async createSharingAsset(document,actor){
  const d=sharingDocument(document),id=randomUUID();return this.transaction(async c=>{await this.append(c,D+id,1,d,actor);await this.audit(c,actor,'sharing_create',id,1);return this.sharingAsset(id,c);});
 },
 async saveSharingAsset(id,expectedRevision,document,actor){
  id=campaignId(id);revisionNumber(expectedRevision);const d=sharingDocument(document);return this.transaction(async c=>{const old=await this.sharingAsset(id,c);if(old.revision!==expectedRevision)conflict();await this.append(c,D+id,old.revision+1,d,actor);await this.audit(c,actor,'sharing_save',id,old.revision+1);return this.sharingAsset(id,c);});
 },
 async publishSharingAsset(id,expectedRevision,expectedPublicationVersion,actor,now=Date.now()){
  id=campaignId(id);revisionNumber(expectedRevision);version(expectedPublicationVersion);
  return this.transaction(async c=>{const asset=await this.sharingAsset(id,c);if(asset.revision!==expectedRevision||asset.publicationVersion!==expectedPublicationVersion)conflict();const document=sharingPublishable(asset.document,now);
   if(document.imagePath!=='/assets/candidate.webp'){const image=await this.latest(c,'campaign.asset.'+campaignId(document.imagePath.slice(16,-4)),1);if(!image)campaignFailure('sharing_image_missing','Upload the actual campaign image before publishing.',409);}else if(!await this.verifyStaticAsset(document.imagePath))campaignFailure('sharing_image_missing','The selected built-in image is unavailable.',409);
   const publication={status:'published',sourceRevision:asset.revision,document,publishedAt:new Date(now).toISOString()};await this.append(c,P+id,asset.publicationVersion+1,publication,actor,'published');await this.audit(c,actor,'sharing_publish',id,asset.revision);return this.sharingAsset(id,c);
  });
 },
 async withdrawSharingAsset(id,expectedPublicationVersion,actor,now=Date.now()){
  id=campaignId(id);version(expectedPublicationVersion);return this.transaction(async c=>{const a=await this.sharingAsset(id,c);if(a.publicationVersion!==expectedPublicationVersion||!a.publicationVersion)conflict();await this.append(c,P+id,a.publicationVersion+1,{status:'withdrawn',sourceRevision:a.publishedRevision,document:a.document,withdrawnAt:new Date(now).toISOString()},actor,'withdrawn');await this.audit(c,actor,'sharing_withdraw',id,a.revision);return this.sharingAsset(id,c);});
 }
};
export const publicCampaignSharing={
 async sharingAssets(issue){if(!SHARING_ISSUES.includes(issue))campaignFailure('invalid_issue','Choose a launch issue.');const q=await this.pool.query('SELECT id,revision,document FROM g28.sharing_assets_public WHERE document->>\'issue\'=$1 ORDER BY id LIMIT 50',[issue]);return {items:q.rows.map(publicSharingAsset)};},
 async sharingAsset(id){const q=await this.pool.query('SELECT id,revision,document FROM g28.sharing_assets_public WHERE id=$1',[campaignId(id)]);if(!q.rows[0])campaignFailure('sharing_not_found','This sharing asset is unavailable or withdrawn.',404);return publicSharingAsset(q.rows[0]);}
};
