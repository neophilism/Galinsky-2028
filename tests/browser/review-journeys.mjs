import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {createServer} from 'node:net';
import {mkdir,writeFile} from 'node:fs/promises';
import {chromium,firefox,webkit} from 'playwright';
import {getMigrations} from 'better-auth/db/migration';
import {createReviewAuth,createReviewController} from '../../apps/web/review-auth.mjs';
import {createPrivatePreviewServer} from '../../apps/web/private-preview.mjs';

const probe=createServer();await new Promise(r=>probe.listen(0,'127.0.0.1',r));const port=probe.address().port;await new Promise(r=>probe.close(r));
const origin='http://127.0.0.1:'+port,db=new DatabaseSync(':memory:');
const auth=createReviewAuth({database:db,origin,secret:'synthetic-browser-review-auth-secret-32-characters',production:false});
await (await getMigrations(auth.options)).runMigrations();
const controller=createReviewController({auth,database:db,origin,production:false,setupKey:'synthetic-browser-owner-setup-key-32-characters',ownerState:{claimed:false}});
const server=createPrivatePreviewServer({directory:'dist/web',reviewController:controller,env:{PREVIEW_ACCESS_USER:'preview',PREVIEW_ACCESS_PASSWORD:'synthetic-existing-preview-password-32-characters',G28_REVIEW_ACCOUNTS_ENABLED:'true'}});
await new Promise(r=>server.listen(port,'127.0.0.1',r));await mkdir('test-results/review-browser',{recursive:true});
const engines={chromium,firefox,webkit},selected=(process.env.G28_BROWSER_ENGINES||'chromium,firefox,webkit').split(',');
assert(selected.length&&selected.every(n=>Object.hasOwn(engines,n)));const evidence=[];
try{
 for(const name of selected){
  const options={headless:true};if(name==='chromium'&&process.env.G28_CHROMIUM_EXECUTABLE){options.executablePath=process.env.G28_CHROMIUM_EXECUTABLE;options.args=['--no-sandbox','--disable-gpu'];}
  const browser=await engines[name].launch(options),own=await browser.newContext(),view=await browser.newContext();
  const page=await own.newPage(),reader=await view.newPage(),errors=[];
  page.on('pageerror',e=>errors.push(e.message));reader.on('pageerror',e=>errors.push(e.message));
  try{
   if(!evidence.length){
    await page.goto(origin+'/preview/setup/');
    await page.getByLabel('One-time setup key').fill('synthetic-browser-owner-setup-key-32-characters');await page.getByLabel('Your display name').fill('Preview Owner');await page.getByLabel('Your username').fill('previewowner');await page.getByLabel('Password',{exact:true}).fill('synthetic-owner-password-12345');
    await page.getByRole('button',{name:'Create owner account'}).click();await page.getByText('Owner account created. Sign in using your chosen username and password.').waitFor();
   }else await page.goto(origin+'/preview/');
   await page.getByLabel('Username',{exact:true}).fill('previewowner');await page.getByLabel('Password',{exact:true}).fill('synthetic-owner-password-12345');const signInResponse=page.waitForResponse(r=>r.url().endsWith('/preview/auth/sign-in/username')&&r.request().method()==='POST');await page.getByRole('button',{name:'Sign in',exact:true}).click();const signInResult=await signInResponse;assert.equal(signInResult.status(),200,'Owner sign-in rejected in '+name+' HTTP '+signInResult.status());await page.waitForURL(origin+'/',{waitUntil:'domcontentloaded'});
   await page.goto(origin+'/preview/admin/');await page.getByLabel('Display name',{exact:true}).fill('Reviewer '+name);await page.getByLabel('Username',{exact:true}).fill('reviewer'+name);await page.getByLabel('Password',{exact:true}).fill('synthetic-initial-password-12345');await page.getByRole('button',{name:'Create reviewer account'}).click();await page.getByText('Username: reviewer'+name,{exact:true}).waitFor();
   assert.equal(await page.getByLabel('Password',{exact:true}).inputValue(),'');
   await reader.goto(origin+'/preview/');await reader.getByLabel('Username',{exact:true}).fill('reviewer'+name);await reader.getByLabel('Password',{exact:true}).fill('synthetic-initial-password-12345');await reader.getByRole('button',{name:'Sign in',exact:true}).click();
   await reader.getByText('Choose your own password before opening the policy website. The temporary password will stop working.').waitFor();await reader.getByLabel('Current password').fill('synthetic-initial-password-12345');await reader.getByLabel('New password').fill('synthetic-chosen-password-12345');await reader.getByRole('button',{name:'Update password'}).click();await reader.getByText('Password updated. Your other sessions have been signed out.').waitFor();
   let views=0;for(const width of [320,390,768,1280]){
    await reader.setViewportSize({width,height:900});
    for(const path of ['/','/issues/','/issues/kirk-evers/','/issues/garden/','/issues/cornerstone/']){const response=await reader.goto(origin+path);assert.equal(response.status(),200,path);assert.equal(await reader.locator('h1').count(),1);views++;}
   }
   assert.equal((await view.request.get(origin+'/preview/api/users')).status(),403);
   assert.equal((await view.request.get(origin+'/donate/stripe')).status(),403);
   await reader.goto(origin+'/preview/');assert.equal(await reader.getByRole('link',{name:'Manage reviewer accounts'}).count(),0);
   const reviewerCard=page.locator('article.account').filter({hasText:'Username: reviewer'+name});
    assert.equal(await reviewerCard.count(),1,'Exactly one row matches the active synthetic reviewer');
    await reviewerCard.getByRole('button',{name:'Reset password'}).click();await reviewerCard.getByLabel('New reviewer password').fill('synthetic-reset-password-12345');await reviewerCard.getByRole('button',{name:'Save new password'}).click();await page.getByText('Password reset. The reviewer’s existing sessions have been revoked.').waitFor();
   assert.equal((await view.request.get(origin+'/issues/garden/')).status(),401);
   await reader.reload();await reader.getByLabel('Username',{exact:true}).fill('reviewer'+name);await reader.getByLabel('Password',{exact:true}).fill('synthetic-reset-password-12345');await reader.getByRole('button',{name:'Sign in',exact:true}).click();await reader.getByLabel('Current password').fill('synthetic-reset-password-12345');await reader.getByLabel('New password').fill('synthetic-final-password-12345');await reader.getByRole('button',{name:'Update password'}).click();await reader.getByText('Password updated. Your other sessions have been signed out.').waitFor();
   await reviewerCard.getByRole('button',{name:'Disable access'}).click();await page.getByText('Reviewer access disabled and sessions revoked.').waitFor();assert.equal((await view.request.get(origin+'/issues/garden/')).status(),401);
   await reader.reload();await reader.getByRole('button',{name:'Sign in',exact:true}).waitFor();
   assert.deepEqual(errors,[]);evidence.push({browser:name,policyViews:views,ownerCreation:true,requiredPasswordChange:true,resetRevokesSessions:true,revocation:true,reviewerCannotManage:true});
   // Capture only the empty login screen; no credentials or account roster.
   await reader.screenshot({path:'test-results/review-browser/'+name+'-signin.png',fullPage:true});
  }finally{await own.close();await view.close();await browser.close();}
 }
 await writeFile('test-results/review-browser/evidence.json',JSON.stringify(evidence,null,2));console.log(JSON.stringify(evidence));
}finally{await new Promise(r=>server.close(r));db.close();}
