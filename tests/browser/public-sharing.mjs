import {chromium,firefox,webkit} from 'playwright';
import {createServer} from 'node:http';
import {readFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import assert from 'node:assert/strict';
import {renderPage,site} from '../../scripts/public-renderer.mjs';
const origin='http://127.0.0.1:4452',publicUrl='https://campaign.example.test/issues/garden/';
const html=renderPage('garden',{site:{...site,mode:'production',canonicalOrigin:'https://campaign.example.test'}});
const preview=renderPage('garden');
const server=createServer(async(req,res)=>{
 if(req.url==='/share'){res.setHeader('content-type','text/html');res.end(html);return;}
 if(req.url==='/preview'){res.setHeader('content-type','text/html');res.end(preview);return;}
 if(req.url==='/assets/public.js'||req.url==='/assets/vendor/qrcode.js'){
  res.setHeader('content-type','application/javascript');
  res.end(await readFile(resolve('apps/web/public'+req.url)));return;
 }
 res.statusCode=404;res.end('Not found');
});
await new Promise(r=>server.listen(4452,'127.0.0.1',r));
try{
 for(const [name,engine] of Object.entries({chromium,firefox,webkit})){
  const browser=await engine.launch({headless:true});
  try{
   const page=await browser.newPage({viewport:{width:390,height:844}});
   await page.addInitScript(()=>{
    window.__copies=[];window.__shares=[];
    Object.defineProperty(navigator,'clipboard',{configurable:true,value:{writeText:async text=>{window.__copies.push(text);}}});
    Object.defineProperty(navigator,'share',{configurable:true,value:async data=>{window.__shares.push(data);}});
   });
   const qrRequests=[];
   page.on('request',r=>{if(r.url().includes('/assets/vendor/qrcode.js'))qrRequests.push(r.url());});
   await page.goto(origin+'/preview');
   assert.equal(await page.locator('[data-share-action]').count(),0);
   await page.goto(origin+'/share');
   await page.getByRole('button',{name:'Copy page link'}).click();
   assert.deepEqual(await page.evaluate(()=>window.__copies),[publicUrl],name);
   assert.equal(await page.locator('.issue-share [role="status"]').textContent(),'Page link copied.');
   await page.getByRole('button',{name:'Share page'}).click();
   assert.equal((await page.evaluate(()=>window.__shares))[0].url,publicUrl);
   assert.equal(await page.locator('.issue-share [role="status"]').textContent(),'Sharing completed.');
   assert.deepEqual(qrRequests,[],'No QR library before visitor request');
   assert.equal(await page.locator('#issue-share-qr').isVisible(),false);
   const showQr=page.getByRole('button',{name:'Show QR code'});
   await showQr.click();
   await page.locator('#issue-share-qr svg').waitFor();
   assert.equal(await page.locator('#issue-share-qr').isVisible(),true);
   assert.equal(await page.locator('.issue-share-qr-canvas').getAttribute('title'),publicUrl);
   assert((await page.locator('#issue-share-qr svg use').count())>100,name+' SVG contains QR modules');
   assert.equal(qrRequests.length,1,name+' first-party QR script loaded once');
   const hideQr=page.getByRole('button',{name:'Hide QR code'});
   assert.equal(await hideQr.getAttribute('aria-expanded'),'true');
   await hideQr.click();
   assert.equal(await page.locator('#issue-share-qr').isVisible(),false);
   await showQr.click();
   await page.locator('#issue-share-qr svg').waitFor();
   assert.equal(qrRequests.length,1,'library must not reload on second toggle');
  }finally{await browser.close();}
 }
}finally{await new Promise(r=>server.close(r));}
