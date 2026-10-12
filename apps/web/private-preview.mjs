import {createServer} from 'node:http';
import {readFile,realpath,stat} from 'node:fs/promises';
import {realpathSync,statSync} from 'node:fs';
import {extname,resolve,sep} from 'node:path';
import {fileURLToPath} from 'node:url';
import {loadPreviewGate,previewAuthorized,PREVIEW_REALM,PREVIEW_ROBOTS} from '../../packages/core/preview-gate.mjs';
import {approvedDonationRoutes} from '../../packages/core/donation-provider.mjs';
import {DonationRotationStore} from './donation-rotation-store.mjs';
import {databasePool} from '../api/src/postgres-store.mjs';

const mime={
 '.html':'text/html; charset=utf-8',
 '.css':'text/css; charset=utf-8',
 '.js':'application/javascript; charset=utf-8',
 '.mjs':'application/javascript; charset=utf-8',
 '.json':'application/json; charset=utf-8',
 '.svg':'image/svg+xml',
 '.png':'image/png',
 '.jpg':'image/jpeg',
 '.jpeg':'image/jpeg',
 '.webp':'image/webp',
 '.avif':'image/avif',
 '.ico':'image/x-icon',
 '.txt':'text/plain; charset=utf-8',
 '.xml':'application/xml; charset=utf-8',
 '.woff':'font/woff',
 '.woff2':'font/woff2',
 '.pdf':'application/pdf',
 '.mp4':'video/mp4'
};
function send(res,status,body){
 res.statusCode=status;res.setHeader('Content-Type','text/plain; charset=utf-8');
 res.end(body);
}
function requestedPath(raw){
 if(typeof raw!=='string'||raw.length>4096)return null;
 let pathname;try{pathname=decodeURIComponent(raw.split('?')[0].split('#')[0]);}catch{return null;}
 if(!pathname.startsWith('/')||pathname.includes('\\')||pathname.includes('\0')||pathname.includes('//'))return null;
 if(pathname.split('/').some(s=>s==='.'||s==='..'||s.startsWith('.')))return null;
 return pathname;
}

// Unlike a static CDN, this Node service authenticates BEFORE reading any file.
// Use only this web-service entry point for preview hosting.
export function createPrivatePreviewServer({directory=resolve('dist/web'),env=process.env,rotationStore=null}={}){
 const credentials=loadPreviewGate(env);
 const root=realpathSync(directory);
 if(!statSync(root).isDirectory())throw Error('The public preview build directory does not exist.');
 // Release flags and provider approvals are checked independently of the database.
 // Preview mode always fails closed; tests may inject an in-memory routing store.
 const donationRoutes=env.G28_PUBLIC_MODE==='production'?approvedDonationRoutes(env,'production'):[];
 if(donationRoutes.length && !rotationStore && !env.DATABASE_URL)
  throw Error('Activated donation routing requires a verified persistent DATABASE_URL');
 const rotationPool=donationRoutes.length && !rotationStore?databasePool(env.DATABASE_URL):null;
 const liveRotationStore=rotationStore||(rotationPool?new DonationRotationStore(rotationPool):null);
 const server=createServer(async(req,res)=>{
  res.setHeader('Cache-Control','private, no-store, max-age=0');
  res.setHeader('X-Robots-Tag',PREVIEW_ROBOTS);
  res.setHeader('Vary','Authorization');
  res.setHeader('X-Content-Type-Options','nosniff');
  res.setHeader('Referrer-Policy','no-referrer');
  res.setHeader('X-Frame-Options','DENY');
  if(!previewAuthorized(req.headers.authorization,credentials)){
   res.setHeader('WWW-Authenticate',PREVIEW_REALM);
   return send(res,401,'Private preview. Enter your access credentials.');
  }
  if(req.method!=='GET'&&req.method!=='HEAD'){
   res.setHeader('Allow','GET, HEAD');
   return send(res,405,'Method not allowed.');
  }
  const pathname=requestedPath(req.url);
  if(pathname===null)return send(res,404,'Not found.');
  if(pathname==='/donate/continue'){
   if(req.method!=='GET'){res.setHeader('Allow','GET');return send(res,405,'Method not allowed.');}
   if(!donationRoutes.length || !liveRotationStore)
    return send(res,503,'Online contributions are not available. No payment was attempted.');
   try{
    const selection=await liveRotationStore.selectRoute(donationRoutes);
    if(!selection)return send(res,503,'Online contributions are temporarily unavailable. No payment was attempted.');
    const configured=donationRoutes.find(route=>route.id===selection.providerId);
    if(!configured||configured.url!==selection.url)throw Error('Invalid rotation selection');
    res.statusCode=303;
    res.setHeader('Location',configured.url);
    res.setHeader('Referrer-Policy','no-referrer');
    res.setHeader('Content-Length','0');
    res.end();return;
   }catch{
    console.error(JSON.stringify({event:'donation_route_unavailable'}));
    return send(res,503,'Online contributions are temporarily unavailable. No payment was attempted.');
   }
  }
  try{
   let candidate=resolve(root,'.'+pathname);
   if(candidate!==root&&!candidate.startsWith(root+sep))return send(res,404,'Not found.');
   let info=await stat(candidate);
   if(info.isDirectory()){
    candidate=resolve(candidate,'index.html');
    info=await stat(candidate);
   }
   const actual=await realpath(candidate);
   if((actual!==root&&!actual.startsWith(root+sep))||!info.isFile())return send(res,404,'Not found.');
   const ext=extname(actual).toLowerCase();
   if(!Object.hasOwn(mime,ext))return send(res,404,'Not found.');
   const content=await readFile(actual);
   res.statusCode=200;
   res.setHeader('Content-Type',mime[ext]);
   if(ext==='.mp4'){
    // HTML5 video players use single byte-range requests. Authenticate first,
    // reject malformed/multiple ranges, and never serve path traversals.
    res.setHeader('Accept-Ranges','bytes');
    const range=req.headers.range;
    if(range){
     const match=/^bytes=(\d*)-(\d*)$/.exec(range);
     let from,to;
     if(match&&(match[1]!==''||match[2]!=='')){
      if(match[1]===''){
       const suffix=Number(match[2]);
       if(Number.isSafeInteger(suffix)&&suffix>0){from=Math.max(0,content.length-suffix);to=content.length-1;}
      }else{
       from=Number(match[1]);
       to=match[2]===''?content.length-1:Number(match[2]);
      }
     }
     if(from===undefined||to===undefined||!Number.isSafeInteger(from)||!Number.isSafeInteger(to)||from<0||from>=content.length||to<from){
      res.statusCode=416;
      res.setHeader('Content-Range','bytes */'+content.length);
      res.setHeader('Content-Length','0');
      res.end();return;
     }
     to=Math.min(to,content.length-1);
     const slice=content.subarray(from,to+1);
     res.statusCode=206;
     res.setHeader('Content-Range','bytes '+from+'-'+to+'/'+content.length);
     res.setHeader('Content-Length',slice.length);
     res.end(req.method==='HEAD'?undefined:slice);
     return;
    }
   }
   res.setHeader('Content-Length',content.length);
   res.end(req.method==='HEAD'?undefined:content);
  }catch{
   send(res,404,'Not found.');
  }
 });
 if(rotationPool)server.on('close',()=>{void rotationPool.end().catch(()=>{});});
 return server;
}
const entry=process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url);
if(entry){
 try{
  const port=Number(process.env.PORT||10000);
  if(!Number.isSafeInteger(port)||port<1||port>65535)throw Error('Invalid listening port');
  const server=createPrivatePreviewServer();
  server.listen(port,process.env.HOST||'0.0.0.0',()=>console.log(JSON.stringify({event:'private_preview_listening',port})));
  for(const signal of ['SIGINT','SIGTERM'])process.once(signal,()=>server.close(()=>process.exit(0)));
 }catch(e){console.error('Private preview refused to start: '+e.message);process.exitCode=1;}
}
