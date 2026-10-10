import {readFile,stat} from 'node:fs/promises';
import {resolve,extname} from 'node:path';
export function registerPortal(app,portalOrigin,buildDirectory=resolve('dist/portal')){
 const portal=resolve(buildDirectory);
 app.get('/*',async(req,reply)=>{
  if(req.url.startsWith('/api/'))return reply.code(404).send({error:'not_found'});
  const url=new URL(req.url,portalOrigin);const path=resolve(portal,'.'+decodeURIComponent(url.pathname));
  if(path!==portal&&!path.startsWith(portal+'/'))return reply.code(404).send('Not found');
  try{if((await stat(path)).isFile()){const mime={'.js':'application/javascript','.css':'text/css','.svg':'image/svg+xml'};return reply.type(mime[extname(path)]||'application/octet-stream').send(await readFile(path));}}catch{}
  if(extname(path))return reply.code(404).type('text/plain').send('Not found');
  try{return reply.type('text/html; charset=utf-8').send(await readFile(resolve(portal,'index.html')));}catch{return reply.code(503).type('text/plain').send('The volunteer application build is not installed.');}
 });
}
