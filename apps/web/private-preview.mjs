import {createServer} from 'node:http';
import {readFile,realpath,stat} from 'node:fs/promises';
import {realpathSync,statSync} from 'node:fs';
import {extname,resolve,sep} from 'node:path';
import {fileURLToPath} from 'node:url';
import {loadPreviewGate,previewAuthorized,PREVIEW_REALM,PREVIEW_ROBOTS} from '../../packages/core/preview-gate.mjs';

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
 '.pdf':'application/pdf'
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
export function createPrivatePreviewServer({directory=resolve('dist/web'),env=process.env}={}){
 const credentials=loadPreviewGate(env);
 const root=realpathSync(directory);
 if(!statSync(root).isDirectory())throw Error('The public preview build directory does not exist.');
 return createServer(async(req,res)=>{
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
   res.setHeader('Content-Length',content.length);
   res.end(req.method==='HEAD'?undefined:content);
  }catch{
   send(res,404,'Not found.');
  }
 });
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
