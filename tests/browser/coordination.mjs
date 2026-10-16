// Synthetic accounts only; mail is captured in memory and never sent.
import {chromium,firefox,webkit} from 'playwright';
import {randomBytes} from 'node:crypto';
import {mkdir,writeFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
import {createApp} from '../../apps/api/src/app.mjs';
import {MemoryStore} from '../../apps/api/src/memory-store.mjs';
import {loadConfig} from '../../apps/api/src/config.mjs';
import {registerPortal} from '../../apps/api/src/static.mjs';
import {openDelivery} from '../../packages/core/auth.mjs';
const evidence=[];
await mkdir('test-results/coordination-browser',{recursive:true});
try{
 for(const [name,engine]of Object.entries({chromium,firefox,webkit})){
  const origin='http://127.0.0.1:4432';
  const config=loadConfig({NODE_ENV:'test',PORTAL_ORIGIN:origin,PUBLIC_ORIGIN:'http://127.0.0.1:4431',COORDINATION_ENABLED:'true',SIGNUP_ENABLED:'true',MAIL_PROVIDER:'resend',RESEND_API_KEY:'synthetic-only',MAIL_FROM:'synthetic@example.test',DELIVERY_KEY:randomBytes(32).toString('base64'),LOGIN_PEPPER:randomBytes(32).toString('hex'),G28_ADMIN_LOGIN_ENABLED:'true',G28_OWNER_ADMIN_EMAIL:'owner@example.test',G28_TREASURY_VAULT_KEY:randomBytes(32).toString('base64')});
  const store=new MemoryStore(),app=createApp({store,config});registerPortal(app,origin);await app.listen({host:'127.0.0.1',port:4432});
  let browser;
  try{
   browser=await engine.launch({headless:true});const context=await browser.newContext({viewport:{width:390,height:844}}),page=await context.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));
   async function login(email){await page.goto(origin+'/join');await page.getByLabel('Email address').fill(email);await page.getByRole('checkbox').first().check();await page.getByRole('button',{name:/Email my sign-in link/}).click();await page.getByText(/When delivery is available/).waitFor();await page.goto(openDelivery(store.outbox.at(-1).envelope,config.deliveryKey).url);await page.getByRole('button',{name:'Continue to my workspace'}).click();await page.getByRole('button',{name:'Sign out',exact:true}).waitFor();}
   await login('owner@example.test');await page.getByRole('link',{name:'Teams & events'}).click();
   await page.getByLabel('Team name',{exact:true}).fill('Example team');await page.getByLabel('General region').fill('Synthetic region');await page.getByRole('button',{name:'Create team',exact:true}).click();await page.getByText('Team created.',{exact:true}).waitFor();await page.getByRole('button',{name:'Open Example team'}).click();
   await page.getByLabel('Invitation email').fill('member@example.test');await page.getByRole('button',{name:'Create invitation'}).click();await page.getByText(/Invitation created/).waitFor();
   await page.getByLabel('Event title').fill('Orientation');const localTime=ms=>{const d=new Date(ms);return new Date(d.getTime()-d.getTimezoneOffset()*60000).toISOString().slice(0,16);};await page.getByLabel('Start time',{exact:true}).fill(localTime(Date.now()+86400000));await page.getByLabel('End time',{exact:true}).fill(localTime(Date.now()+90000000));await page.getByLabel('Venue instructions').fill('Synthetic attendee location');await page.getByLabel('Accessibility details').fill('Step-free access');await page.getByLabel('Safety and required authorizations').fill('Orientation only');await page.getByRole('button',{name:'Submit event for review'}).click();await page.getByText('Event saved for owner review.').waitFor();
   await page.getByRole('checkbox',{name:/I reviewed the venue/}).check();await page.getByRole('button',{name:'Publish event'}).click();await page.getByText('Event review saved.').waitFor();
   await page.getByRole('button',{name:'Sign out',exact:true}).click();await login('member@example.test');await page.getByRole('link',{name:'Teams & events'}).click();
   await page.getByLabel('Your display name').fill('Test volunteer');await page.getByRole('checkbox',{name:/I want to join/}).check();await page.getByRole('button',{name:'Join Example team'}).click();await page.getByText('You joined the team.').waitFor();
   assert.equal(await page.getByText('Synthetic attendee location',{exact:false}).count(),0);
   await page.getByRole('button',{name:'Reserve a place'}).click();await page.getByText('Your RSVP: confirmed').waitFor();await page.getByText('Synthetic attendee location',{exact:false}).waitFor();
   await page.reload();await page.getByRole('button',{name:'Open Example team'}).click();await page.getByText('Your RSVP: confirmed').waitFor();
   assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
   await page.screenshot({path:`test-results/coordination-browser/${name}-member.png`,fullPage:true});
   await page.getByRole('button',{name:'Cancel my RSVP'}).click();await page.getByText('Your RSVP: Not attending').waitFor();assert.equal(await page.getByText('Synthetic attendee location',{exact:false}).count(),0);
   await page.getByRole('button',{name:'Leave team',exact:true}).click();await page.getByText('You left the team. Future access has ended.').waitFor();assert.equal(await page.getByRole('button',{name:'Open Example team'}).count(),0);assert.deepEqual(errors,[]);
   evidence.push({browser:name,ownerCreateAndPublish:true,invitedJoin:true,privateVenue:true,rsvpReloadAndCancel:true,leaveRevocation:true,mobileReflow:true});
  }finally{await browser?.close();await app.close();}
 }
}finally{await writeFile('test-results/coordination-browser/results.json',JSON.stringify(evidence,null,2));}
console.log(JSON.stringify(evidence,null,2));
