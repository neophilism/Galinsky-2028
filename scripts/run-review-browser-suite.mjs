import {spawnSync} from 'node:child_process';
import {readFileSync,writeFileSync} from 'node:fs';

// Each browser is a separate end-to-end review journey with its own in-memory
// authentication database. This retains the real login throttling while
// avoiding artificial interference between synthetic Chromium/Firefox/WebKit users.
const supported=['chromium','firefox','webkit'];
const selected=(process.env.G28_BROWSER_ENGINES||supported.join(',')).split(',').map(s=>s.trim());
if(!selected.length||selected.some(s=>!supported.includes(s))||new Set(selected).size!==selected.length)
 throw new Error('G28_BROWSER_ENGINES must list distinct supported engines.');

const results=[];
for(const engine of selected){
 const child=spawnSync(process.execPath,['tests/browser/review-journeys.mjs'],{
  env:{...process.env,G28_BROWSER_ENGINES:engine},stdio:'inherit'
 });
 if(child.error)throw child.error;
 if(child.status!==0)process.exit(child.status||1);
 const evidence=JSON.parse(readFileSync('test-results/review-browser/evidence.json','utf8'));
 if(!Array.isArray(evidence)||evidence.length!==1||evidence[0].browser!==engine)
  throw new Error('Missing or mismatched browser evidence for '+engine);
 results.push(...evidence);
}
writeFileSync('test-results/review-browser/evidence.json',JSON.stringify(results,null,2));
console.log('Private reviewer end-to-end browser coverage: '+selected.join(', '));
