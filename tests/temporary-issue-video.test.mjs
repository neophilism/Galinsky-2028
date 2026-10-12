import test from 'node:test';
import assert from 'node:assert/strict';
import {videoPanel} from '../packages/core/video.mjs';
import {renderPage,site} from '../scripts/public-renderer.mjs';

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

test('a missing uploaded binary yields a truthful placeholder instead of broken video',()=>{
 for(const issue of ['kirk-evers','garden','cornerstone']){
  const markup=renderPage(issue);
  assert(!markup.includes('<video controls'));
  assert(markup.includes("Phillip's video introduction is coming soon."));
 }
});

test('unreviewed external URLs and simultaneous YouTube/temporary sources are rejected',()=>{
 const cfg=site.issues.garden;
 assert.throws(()=>videoPanel('garden',{...cfg,temporaryLocalVideo:'http://example.test/evil.mp4'},{localAssetExists:true}),/reviewed temporary/);
 assert.throws(()=>videoPanel('garden',{...cfg,youtubeId:'AbcdefG123_'},{localAssetExists:true}),/either the temporary/);
 assert(!videoPanel('garden',{...cfg,temporaryLocalVideo:null},{localAssetExists:true}).includes('<video'));
});
