import http from 'node:http';
import {readFile,stat} from 'node:fs/promises';
import {resolve,extname} from 'node:path';
const base=resolve('dist/web');const mime={'.html':'text/html; charset=utf-8','.css':'text/css','.js':'application/javascript','.svg':'image/svg+xml','.webp':'image/webp','.json':'application/json'};
const port=Number(process.env.WEB_PORT||4321);
http.createServer(async(req,res)=>{try{
 const pathname=decodeURIComponent(new URL(req.url,'http://localhost').pathname);let path=resolve(base,'.'+pathname);
 if(path!==base&&!path.startsWith(base+'/'))throw Error();
 if((await stat(path)).isDirectory())path+='/index.html';
 const body=await readFile(path);res.writeHead(200,{'Content-Type':mime[extname(path)]||'application/octet-stream','X-Content-Type-Options':'nosniff','Referrer-Policy':'no-referrer'});res.end(body);
 }catch{res.writeHead(404,{'Content-Type':'text/plain'});res.end('Not found');}
}).listen(port,'127.0.0.1',()=>console.log(`Public preview: http://127.0.0.1:${port}`));
