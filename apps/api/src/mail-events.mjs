import {Webhook} from 'svix';
import {createHash} from 'node:crypto';
import {assert} from '../../../packages/core/validation.mjs';
const TYPES=['email.sent','email.delivered','email.delivery_delayed','email.bounced','email.complained','email.failed','email.suppressed'];
const UUID=/^[a-f0-9]{8}-[a-f0-9]{4}-[1-8][a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i;
export function verifyMailEvent(raw,headers,secret){
 assert(typeof secret==='string'&&secret.startsWith('whsec_'),'mail_events_unavailable','Mail delivery callbacks are not configured.',503);
 assert(Buffer.isBuffer(raw)&&raw.length>0&&raw.length<=32768,'invalid_mail_event','Invalid delivery event.');
 let event;try{new Webhook(secret).verify(raw.toString('utf8'),headers);event=JSON.parse(raw.toString('utf8'));}catch{assert(false,'invalid_mail_signature','Delivery event signature is invalid.',400);}
 assert(typeof headers['svix-id']==='string'&&/^[a-zA-Z0-9_-]{1,180}$/.test(headers['svix-id'])&&event&&TYPES.includes(event.type)&&UUID.test(event.data?.email_id),'invalid_mail_event','Unsupported delivery event.');
 return {id:headers['svix-id'],digest:createHash('sha256').update(raw).digest('hex'),providerId:event.data.email_id.toLowerCase(),type:event.type,suppress:event.type==='email.complained'||event.type==='email.suppressed'||event.type==='email.bounced'&&event.data.bounce?.type==='hard_bounce'};
}
export async function registerMailEvents(app,{store,config}){
 // Scoped parser preserves the exact signed bytes. Other JSON routes keep
 // Fastify's ordinary strict parser and their Origin/CSRF enforcement.
 app.removeContentTypeParser('application/json');
 app.addContentTypeParser('application/json',{parseAs:'buffer'},(req,body,done)=>done(null,body));
 app.post('/api/mail/events',async req=>{
  const event=verifyMailEvent(req.body,req.headers,config.mailWebhookSecret);
  return {received:true,...await store.recordMailEvent(event)};
 });
}
