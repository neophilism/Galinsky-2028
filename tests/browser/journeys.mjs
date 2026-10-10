// Isolated test server. Synthetic material and mail transport do not ship in the app.
import {chromium,firefox,webkit} from 'playwright';
import assert from 'node:assert/strict';
import {randomBytes} from 'node:crypto';
import {mkdir,readFile,writeFile} from 'node:fs/promises';
import {createServer} from 'node:http';
import {resolve,extname} from 'node:path';
import {createApp} from '../../apps/api/src/app.mjs';
import {MemoryStore} from '../../apps/api/src/memory-store.mjs';
import {loadConfig} from '../../apps/api/src/config.mjs';
import {registerPortal} from '../../apps/api/src/static.mjs';
import {openDelivery} from '../../packages/core/auth.mjs';
const publicOrigin='http://127.0.0.1:4421',portalOrigin='http://127.0.0.1:4422';
const cfg=loadConfig({NODE_ENV:'test',PUBLIC_ORIGIN:publicOrigin,PORTAL_ORIGIN:portalOrigin,SIGNUP_ENABLED:'true',MAIL_PROVIDER:'resend',RESEND_API_KEY:'synthetic-test-only',MAIL_FROM:'test@example.test',DELIVERY_KEY:randomBytes(32).toString('base64'),LOGIN_PEPPER:randomBytes(32).toString('hex')});
const store=new MemoryStore({materials:[{id:'synthetic-guide',title:'Synthetic test guide',description:'This fixture is not campaign guidance.',category:'start',revision:1,status:'published',audience:'volunteer',body:'# Synthetic test guide\n\nOnly used to verify the application.',review:{approvedBy:'test-fixture',revision:1,at:'2026-10-10'}}]});
const app=createApp({store,config:cfg});registerPortal(app,portalOrigin);
const root=resolve('dist/web');const web=createServer(async(req,res)=>{
 try{const u=new URL(req.url,publicOrigin);let p=resolve(root,'.'+decodeURIComponent(u.pathname));if(p!==root&&!p.startsWith(root+'/'))throw Error('Invalid path');if(!extname(p))p=resolve(p,'index.html');const bytes=await readFile(p);const mime={'.html':'text/html','.js':'text/javascript','.css':'text/css','.svg':'image/svg+xml','.webp':'image/webp','.txt':'text/plain'};res.setHeader('Content-Type',mime[extname(p)]||'application/octet-stream');res.end(bytes);}catch{res.writeHead(404);res.end('Not found');}
});
await app.listen({host:'127.0.0.1',port:4422});await new Promise(r=>web.listen(4421,'127.0.0.1',r));await mkdir('test-results/browser',{recursive:true});const evidence=[];
try{
 for(const [name,engine]of Object.entries({chromium,firefox,webkit})){
  const browser=await engine.launch({headless:true});const context=await browser.newContext({reducedMotion:'reduce'});const page=await context.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));
  const outside=[];page.on('request',r=>{if(/^https?:/.test(r.url())&&!r.url().startsWith(publicOrigin)&&!r.url().startsWith(portalOrigin))outside.push(r.url());});
  for(const width of [320,390,768,1440]){
   await page.setViewportSize({width,height:900});
   for(const path of ['/','/issues/','/issues/kirk-evers/','/issues/garden/','/issues/cornerstone/','/volunteer/','/donate/','/notices/']){
    const response=await page.goto(publicOrigin+path);assert.equal(response.status(),200);await page.locator('h1').waitFor();assert.equal(await page.locator('h1').count(),1);assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false,path+' at '+width);
   }
  }
  assert.equal(outside.length,0,'No third-party request before activation');
  await page.goto(publicOrigin+'/');await page.setViewportSize({width:390,height:844});await page.locator('#menu-toggle').click();assert.equal(await page.locator('#menu-toggle').getAttribute('aria-expanded'),'true');
  await page.screenshot({path:`test-results/browser/${name}-home-mobile.png`,fullPage:true});
  await page.goto(portalOrigin+'/join');await page.getByLabel('Email address').fill(name+'@example.test');await page.getByRole('checkbox').first().check();await page.getByRole('button',{name:/Email my sign-in link/}).click();await page.getByText(/When delivery is available/).waitFor();
  const queued=store.outbox.at(-1);const mail=openDelivery(queued.envelope,cfg.deliveryKey);assert.equal(mail.email,name+'@example.test');await page.goto(mail.url);await page.getByRole('button',{name:'Continue to my workspace'}).click();await page.getByRole('button',{name:'Sign out'}).waitFor();
  await page.goto(portalOrigin+'/materials');await page.getByLabel('Search the library').fill('Synthetic');await page.getByRole('heading',{name:'Synthetic test guide'}).waitFor();await page.getByRole('link',{name:/Read the guide/}).click();await page.getByRole('heading',{name:'Synthetic test guide'}).first().waitFor();
  await page.goto(portalOrigin+'/forms/action-card');await page.getByLabel('One action I can complete').fill('Read the approved policy summary');const downloadPromise=page.waitForEvent('download');await page.getByRole('button',{name:'Download my worksheet'}).click();const download=await downloadPromise;assert.equal(download.suggestedFilename(),'action-card-planning.md');
  await page.goto(portalOrigin+'/');await page.screenshot({path:`test-results/browser/${name}-workspace-mobile.png`,fullPage:true});await page.getByRole('button',{name:'Sign out'}).click();await page.getByRole('button',{name:/Email my sign-in link/}).waitFor();
  const unauthorized=await context.request.get(portalOrigin+'/api/materials');assert.equal(unauthorized.status(),401);assert.equal(errors.length,0,errors.join('\n'));
  evidence.push({browser:name,publicLayouts:32,emailVerification:true,authenticatedLibrary:true,worksheetDownload:true,logoutRevocation:true,thirdPartyRequestsBeforeActivation:outside.length});await browser.close();
 }
}finally{await app.close();await new Promise(r=>web.close(r));await writeFile('test-results/browser/results.json',JSON.stringify(evidence,null,2));}
console.log(JSON.stringify(evidence,null,2));
