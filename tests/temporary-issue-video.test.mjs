import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {existsSync,readFileSync} from 'node:fs';
import {join} from 'node:path';
import {videoPanel} from '../packages/core/video.mjs';
import {renderPage,site,root} from '../scripts/public-renderer.mjs';

test('all three issue pages are ready to show one secure same-origin video asset',()=>{
 for(const issue of ['kirk-evers','garden','cornerstone']){
  assert.equal(site.issues[issue].temporaryLocalVideo,'/assets/issue-video-placeholder.mp4');
  assert.equal(site.issues[issue].youtubeId,null);
  const markup=videoPanel(issue,site.issues[issue],{localAssetExists:true});
  assert(markup.includes('<video controls playsinline preload="metadata"'));
  assert(markup.includes('<source src="/assets/issue-video-placeholder.mp4" type="video/mp4">'));
  assert(markup.includes('TEMPORARY VIDEO PLACEHOLDER'));
  assert(markup.includes('not an explanation'));
  assert(markup.includes('No third-party video provider')||markup.includes('no third-party video provider'));
  assert(!markup.includes('<iframe'));
  assert(!markup.includes('www.youtube'));
 }
});

test('either render exact campaign-uploaded MP4 on all three preview pages or fall back safely',()=>{
 const asset=join(root,'apps/web/public/assets/issue-video-placeholder.mp4');
 const available=existsSync(asset);
 if(available){
  const bytes=readFileSync(asset);
  assert(bytes.length>100000&&bytes.length<=12000000,'Unexpected uploaded video size');
  assert.equal(bytes.toString('ascii',4,8),'ftyp','An MP4 container is required');
  const hash=createHash('sha256').update(bytes).digest('hex');
  const allowed=new Set([
   '8714bdde5cfced03ec49d90e26e7b83b08131f6f0312a1fd7228427b15ea16a7',
   'bab062faf1ed9b647daf73a40dbbeebf63ae04d8dfe669c43605697e56a20f5f'
  ]);
  assert(allowed.has(hash),'Uploaded video does not match either owner-supplied original or reviewed optimized edition');
 }
 for(const issue of ['kirk-evers','garden','cornerstone']){
  const html=renderPage(issue);
  if(available){
   assert(html.includes('<video controls playsinline'),'All three issue pages must play the uploaded asset');
   assert(html.includes('TEMPORARY VIDEO PLACEHOLDER'),'Unrelated clip must remain clearly labeled');
   assert(html.includes('<source src="/assets/issue-video-placeholder.mp4" type="video/mp4">'));
  }else{
   assert(!html.includes('<video controls'),'Do not link to missing binary');
   assert(html.includes("Phillip's video introduction is coming soon."));
  }
 }
});
test('temporary unrelated illustrative video cannot silently become an official production issue video',()=>{
 const prod={...site,mode:'production',canonicalOrigin:'https://campaign.example.test'};
 for(const issue of ['kirk-evers','garden','cornerstone']){
  const html=renderPage(issue,{site:prod});
  assert(!html.includes('<video controls'),'Only an approved issue-specific final video may be published');
  assert(html.includes("Phillip's video introduction is coming soon."));
 }
});

test('unreviewed external URLs and simultaneous YouTube/temporary sources are rejected',()=>{
 const cfg=site.issues.garden;
 assert.throws(()=>videoPanel('garden',{...cfg,temporaryLocalVideo:'http://example.test/evil.mp4'},{localAssetExists:true}),/reviewed temporary/);
 assert.throws(()=>videoPanel('garden',{...cfg,youtubeId:'AbcdefG123_'},{localAssetExists:true}),/either the temporary/);
 assert(!videoPanel('garden',{...cfg,temporaryLocalVideo:null},{localAssetExists:true}).includes('<video'));
});
