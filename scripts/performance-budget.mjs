import {readFile,stat} from 'node:fs/promises';
import {join} from 'node:path';
import {pathToFileURL} from 'node:url';

// Byte limits are deliberately for network payload, not memory sizes or
// guessed PageSpeed scores. Separate main-thread and offscreen media budgets.
export const publicBudgets=Object.freeze({
 'index.html':50000,
 'assets/design.css':60000,
 'assets/site.css':32000,
 'assets/motion.js':26000,
 'assets/public.js':28000,
 'assets/visitor-analytics.js':18000,
 'assets/visitor-insights.js':18000,
 'assets/candidate.webp':130000,
 'assets/network-flag.svg':180000,
 'assets/meet-phillip.webp':130000,
 'assets/garden.svg':85000,
 'assets/cornerstone.svg':85000,
 'assets/kirk-evers.svg':85000
});
export const initialByteBudget=350000;
export const initialResources=Object.freeze([
 'index.html','assets/design.css','assets/site.css',
 'assets/motion.js','assets/public.js','assets/visitor-analytics.js','assets/visitor-insights.js',
 'assets/candidate.webp','assets/network-flag.svg'
]);
export async function checkPublicAssetBudget(output){
 const paths=Object.keys(publicBudgets);
 const entries=[];
 for(const path of paths){
  // A missing mandatory asset is a failure, never zero bytes.
  const bytes=(await stat(join(output,path))).size;
  if(bytes<=0||bytes>publicBudgets[path])
   throw new Error('Asset byte budget exceeded or missing: '+path+' ('+bytes+' / '+publicBudgets[path]+')');
  entries.push({path,bytes,budget:publicBudgets[path]});
 }
 const initial=entries.filter(item=>initialResources.includes(item.path))
  .reduce((sum,item)=>sum+item.bytes,0);
 if(initial>initialByteBudget)
  throw new Error('Main-page initial static asset budget exceeded: '+initial+' / '+initialByteBudget);
 const html=await readFile(join(output,'index.html'),'utf8');
 if(!/class="candidate"[^>]*fetchpriority="high"/.test(html))
  throw new Error('Homepage needs one explicit high-priority hero portrait');
 if(!/id="meet-phillip"[^]*?loading="lazy"/.test(html))
  throw new Error('Below-the-fold portrait must be lazy');
 if(/<script\b[^>]*src="https?:\/\//i.test(html))
  throw new Error('The first render must not depend on third-party JavaScript');
 return{initialBytes:initial,initialByteBudget,assets:entries};
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
 const root=process.env.G28_PUBLIC_DIST||join(process.cwd(),'dist/web');
 try{const report=await checkPublicAssetBudget(root);
  console.log(JSON.stringify({ok:true,...report}));}
 catch(error){console.error('Performance budget failed:',error.message);process.exitCode=1;}
}
