import {readFileSync,readdirSync,statSync} from 'node:fs';import {join} from 'node:path';import {spawnSync} from 'node:child_process';
import {root,pages,renderPage} from './public-renderer.mjs';
let files=0;function walk(p){for(const n of readdirSync(p)){if(['node_modules','dist','.git','test-results'].includes(n))continue;const f=join(p,n);if(statSync(f).isDirectory())walk(f);else if(f.endsWith('.mjs')||f.endsWith('.js')){const r=spawnSync(process.execPath,['--check',f],{encoding:'utf8'});if(r.status)throw Error(r.stderr);files++;}}}walk(root);
for(const p of pages){const html=renderPage(p.key);if(html.includes('{{'))throw Error('Unresolved public content marker');}
const archive=JSON.parse(readFileSync(join(root,'content/materials/archive-manifest.json'),'utf8'));if(archive.length!==36||archive.some(m=>m.status!=='unreviewed'||m.review!==null))throw Error('Source archive publication boundary changed');
console.log(`Validated syntax for ${files} JavaScript files, ${pages.length} public pages and 36 unreviewed source manifest records.`);
