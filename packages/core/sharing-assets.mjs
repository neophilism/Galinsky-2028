import {exactCampaignKeys,campaignFailure,campaignId,revisionNumber} from './campaign-content.mjs';
export const SHARING_ISSUES=Object.freeze(['kirk-evers','garden','cornerstone']);
const ensure=(value,message)=>{if(!value)campaignFailure('invalid_sharing_asset',message);};
const text=(value,max,label)=>{ensure(typeof value==='string'&&value.trim().length>0&&value.length<=max&&!/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/.test(value),'Enter '+label+'.');return value.trim();};
export function sharingDocument(input){
 const d=exactCampaignKeys(input,['schemaVersion','issue','title','imagePath','alt','caption','disclaimer','usageTerms','attribution','rightsReferenceUrl','rightsApproved','expiresAt'],'sharing asset');
 ensure(d.schemaVersion===1&&SHARING_ISSUES.includes(d.issue),'Choose one of the three launch issues.');
 ensure(d.imagePath==='/assets/candidate.webp'||typeof d.imagePath==='string'&&/^\/campaign-media\/[0-9a-f-]{36}\.png$/.test(d.imagePath),'Choose a campaign image.');
 if(d.imagePath!=='/assets/candidate.webp')campaignId(d.imagePath.slice(16,-4));
 ensure(typeof d.rightsReferenceUrl==='string','Enter the public rights or license reference.');
 let reference;try{reference=new URL(d.rightsReferenceUrl);}catch{campaignFailure('invalid_sharing_asset','Enter the public rights or license reference.');}
 ensure(reference.protocol==='https:'&&!reference.username&&!reference.password&&!reference.search&&!reference.hash&&d.rightsReferenceUrl.length<=1200,'Use a plain public HTTPS rights reference without tracking or credentials.');
 ensure(typeof d.rightsApproved==='boolean','Record whether actual usage rights have been verified.');
 ensure(typeof d.expiresAt==='string'&&/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d\.\d{3}Z$/.test(d.expiresAt)&&Number.isFinite(Date.parse(d.expiresAt))&&new Date(d.expiresAt).toISOString()===d.expiresAt,'Choose an exact expiration time.');
 return {schemaVersion:1,issue:d.issue,title:text(d.title,140,'a title'),imagePath:d.imagePath,alt:text(d.alt,220,'image description'),caption:text(d.caption,1500,'the share caption'),disclaimer:text(d.disclaimer,500,'the required disclaimer'),usageTerms:text(d.usageTerms,1500,'the permitted usage terms'),attribution:text(d.attribution,300,'image attribution'),rightsReferenceUrl:reference.href,rightsApproved:d.rightsApproved,expiresAt:d.expiresAt};
}
export function sharingPublishable(document,now=Date.now()){
 const d=sharingDocument(document);ensure(d.rightsApproved,'Verify actual rights before publishing this asset.');ensure(Date.parse(d.expiresAt)>now&&Date.parse(d.expiresAt)-now<=366*86400000,'Publication must expire within the next year.');return d;
}
export function publicSharingAsset(row){return {id:campaignId(row.id),revision:revisionNumber(row.revision),document:sharingDocument(row.document)};}
export function sharingDestination(issue,canonical){
 ensure(SHARING_ISSUES.includes(issue),'Unknown issue.');let u;try{u=new URL(canonical);}catch{campaignFailure('sharing_unavailable','Approved canonical origin is not configured.',503);}
 ensure(u.protocol==='https:'&&!u.username&&!u.password&&u.pathname==='/'&&!u.search&&!u.hash,'Use the approved canonical HTTPS origin.');return u.origin+'/issues/'+issue+'/';
}
const esc=value=>String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export function sharingCardHtml(input,canonical){
 const a=publicSharingAsset(input),d=a.document,url=sharingDestination(d.issue,canonical);sharingPublishable(d);
 return '<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex,nofollow"><title>'+esc(d.title)+' | Galinsky 2028</title><link rel="stylesheet" href="/assets/design.css"><link rel="stylesheet" href="/assets/site.css"><script defer src="/assets/vendor/qrcode.js"></script><script defer src="/assets/share-card.js"></script></head><body><main class="wrap sharing-print-card"><h1>'+esc(d.title)+'</h1><img src="'+esc(d.imagePath)+'" alt="'+esc(d.alt)+'"><p>'+esc(d.caption)+'</p><p><strong>'+esc(d.disclaimer)+'</strong></p><div data-card-qr="'+esc(url)+'" role="img" aria-label="QR code for the official issue page"></div><p><a href="'+esc(url)+'">'+esc(url)+'</a></p><p>'+esc(d.attribution)+'</p><p>Usage: '+esc(d.usageTerms)+'</p><p><a href="'+esc(d.rightsReferenceUrl)+'" rel="noopener noreferrer">Rights reference</a> · Asset revision '+a.revision+' · Expires '+esc(d.expiresAt)+'</p><button type="button" data-print-card>Print issue card</button></main></body></html>';
}
