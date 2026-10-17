import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,mkdir,writeFile,rm,readFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join,dirname} from 'node:path';
import {checkPublicAssetBudget,initialByteBudget,initialResources,publicBudgets} from '../scripts/performance-budget.mjs';
const home='<main><img class="candidate" fetchpriority="high" src="/assets/candidate.webp"><section id="meet-phillip"><img loading="lazy" src="/assets/meet-phillip.webp"></section></main>';
async function synthetic(files={}){
 const root=await mkdtemp(join(tmpdir(),'g28-budget-'));
 for(const [path,max] of Object.entries(publicBudgets)){
  const content=Object.hasOwn(files,path)?files[path]:path==='index.html'?home:'x'.repeat(Math.min(max,32));
  await mkdir(dirname(join(root,path)),{recursive:true});await writeFile(join(root,path),content);
 }
 return root;
}
test('budgets report a real nonzero initial byte total, not a fabricated LCP score',async()=>{
 const root=await synthetic();
 try{const report=await checkPublicAssetBudget(root);
  assert(report.initialBytes>0&&report.initialBytes<initialByteBudget);
  assert.equal(report.assets.length,Object.keys(publicBudgets).length);
  assert(report.assets.some(x=>x.path==='assets/candidate.webp'));
  assert(initialResources.every(path=>report.assets.some(x=>x.path===path)));
 }finally{await rm(root,{recursive:true,force:true});}
});
test('oversized or missing assets reject instead of quietly reducing the denominator',async()=>{
 const root=await synthetic({'assets/candidate.webp':'x'.repeat(publicBudgets['assets/candidate.webp']+1)});
 try{await assert.rejects(checkPublicAssetBudget(root),/candidate\.webp/);}
 finally{await rm(root,{recursive:true,force:true});}
 const empty=await synthetic();
 try{await rm(join(empty,'assets/motion.js'));await assert.rejects(checkPublicAssetBudget(empty));}
 finally{await rm(empty,{recursive:true,force:true});}
});
test('initial content keeps the hero high priority, later portrait lazy, and no remote scripts',async()=>{
 const root=await synthetic();
 try{
  await writeFile(join(root,'index.html'),home.replace(' fetchpriority="high"',''));
  await assert.rejects(checkPublicAssetBudget(root),/high-priority/);
  await writeFile(join(root,'index.html'),home.replace(' loading="lazy"',''));
  await assert.rejects(checkPublicAssetBudget(root),/lazy/);
  await writeFile(join(root,'index.html'),home+'<script src="https://tracker.example/a.js"></script>');
  await assert.rejects(checkPublicAssetBudget(root),/third-party/);
 }finally{await rm(root,{recursive:true,force:true});}
});
