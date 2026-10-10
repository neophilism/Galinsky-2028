// Deterministic offline renderer, also used for visual testing. Astro consumes the same function.
import {mkdirSync,writeFileSync,cpSync,rmSync} from 'node:fs';
import {join} from 'node:path';
import {root,pages,site,renderPage} from './public-renderer.mjs';
const out=join(root,'dist/web');rmSync(out,{recursive:true,force:true});mkdirSync(out,{recursive:true});
cpSync(join(root,'apps/web/public'),out,{recursive:true});
for(const page of pages){const dest=join(out,page.path);mkdirSync(dest,{recursive:true});writeFileSync(join(dest,'index.html'),renderPage(page.key));}
writeFileSync(join(out,'404.html'),renderPage('notices').replace('Campaign notices.','Page not found.'));
writeFileSync(join(out,'robots.txt'),site.mode==='production'?'User-agent: *\nAllow: /\n':'User-agent: *\nDisallow: /\n');
console.log(`Built ${pages.length} public pages with no private materials.`);
