import {chromium} from 'playwright';
import {createServer} from 'node:http';
import {readFile} from 'node:fs/promises';
import {resolve,extname} from 'node:path';
import assert from 'node:assert/strict';

const root=resolve('dist/web'),received=[];
const server=createServer(async(req,res)=>{
 try{
  const path=new URL(req.url,'http://127.0.0.1').pathname;
  if(path==='/api/visitor-analytics'){
   let data='';for await(const chunk of req)data+=chunk;
   received.push(JSON.parse(data));res.writeHead(204);res.end();return;
  }
  let file=resolve(root,'.'+path);
  assert(file===root||file.startsWith(root+'/'));
  if(!extname(file))file=resolve(file,'index.html');
  const types={'.html':'text/html','.js':'application/javascript','.css':'text/css','.svg':'image/svg+xml','.webp':'image/webp'};
  res.setHeader('Content-Type',types[extname(file)]||'application/octet-stream');
  res.end(await readFile(file));
 }catch{res.writeHead(404);res.end('Not found');}
});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
const origin='http://127.0.0.1:'+server.address().port,browser=await chromium.launch({headless:true});
try{
 const context=await browser.newContext({viewport:{width:450,height:850}});
 const page=await context.newPage();
 await page.goto(origin+'/');
 await page.locator('.analytics-choice').waitFor();
 assert.equal(received.length,0,'No collection before opt-in');
 await page.getByRole('button',{name:'No thanks'}).click();
 await page.waitForTimeout(100);
 assert.equal(received.length,0,'Decline must not transmit');
 await page.reload();
 assert.equal(await page.locator('.analytics-choice').count(),0,'Decline persisted');
 await page.goto(origin+'/notices/');
 await page.getByRole('button',{name:'Change or revoke analytics preference'}).click();
 await page.getByRole('button',{name:'Allow anonymous analytics'}).click();
 await page.waitForTimeout(250);
 assert(received.some(x=>x.action==='start'),'Opt-in should start tracking');
 received.length=0;
 await page.goto(origin+'/issues/kirk-evers/');
 await page.locator('main details summary').first().click();
 await page.waitForTimeout(1800);
 const events=received.filter(x=>Array.isArray(x.events)).flatMap(x=>x.events);
 assert(events.some(e=>e.kind==='accordion_open'),'FAQ opening was not recorded');
 assert(events.some(e=>e.kind==='click_heatmap'),'Document click density was not recorded');
 assert(events.every(e=>Object.keys(e).sort().join(',')==='amount,detail,kind,seq,target'));
 assert(!JSON.stringify(received).includes('Does this protect people'));
 await page.goto(origin+'/notices/');
 await page.getByRole('button',{name:'Change or revoke analytics preference'}).click();
 const count=received.length;
 await page.goto(origin+'/');
 await page.waitForTimeout(100);
 assert.equal(received.length,count,'Revocation must stop future measurement');
 await context.close();

 const privateContext=await browser.newContext();
 await privateContext.addInitScript(()=>{Object.defineProperty(navigator,'globalPrivacyControl',{value:true,configurable:true});});
 const privatePage=await privateContext.newPage();
 received.length=0;
 await privatePage.goto(origin+'/');
 await privatePage.waitForTimeout(200);
 assert.equal(await privatePage.locator('.analytics-choice').count(),0,'Global Privacy Control avoids prompting');
 assert.equal(received.length,0,'Global Privacy Control blocks collection');
 await privateContext.close();
 console.log('Visitor analytics consent, FAQ and click events: verified in Chromium');
}finally{
 await browser.close();await new Promise(resolve=>server.close(resolve));
}
