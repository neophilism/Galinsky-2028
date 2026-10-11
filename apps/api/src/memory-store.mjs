// Explicit development/test store only. server.mjs rejects it in production.
import {randomUUID} from 'node:crypto';
export class MemoryStore{
 constructor({materials=[]}={}){this.logins=new Map();this.accounts=new Map();this.sessions=new Map();this.outbox=[];this.buckets=new Map();this.materials=materials;this.taskProgress=new Map();}
 async healthy(){return true;}
 async rate(key,limit,until){const old=this.buckets.get(key);const item=!old||old.until<Date.now()?{count:0,until}:old;item.count++;this.buckets.set(key,item);return item.count<=limit;}
 async requestLogin(record,job){this.logins.set(record.hash,record);this.outbox.push({...job,subjectKey:record.emailKey,status:'queued',attempts:0,availableAt:Date.now()});}
 async consumeLogin(hash,binding,session,now=Date.now()){
  const r=this.logins.get(hash);if(!r||r.binding!==binding||r.expires<=now)return null;this.logins.delete(hash);
  let a=[...this.accounts.values()].find(x=>x.emailKey===r.emailKey);
  if(!a){a={id:randomUUID(),emailKey:r.emailKey,deliveryEnvelope:r.deliveryEnvelope,marketing:r.marketing,termsVersion:r.termsVersion,verified:true};this.accounts.set(a.id,a);}
  this.sessions.set(session.hash,{...session,accountId:a.id});return {...a};
 }
 async session(hash,now=Date.now()){const s=this.sessions.get(hash);const a=s&&this.accounts.get(s.accountId);return s&&s.expires>now&&a?{...s,account:{...a}}:null;}
 async logout(hash){this.sessions.delete(hash);}
 async consent(accountId,value){const a=this.accounts.get(accountId);if(a)a.marketing=value;}
 async closeAccount(id){const a=this.accounts.get(id);if(!a)return;this.accounts.delete(id);this.taskProgress.delete(id);for(const [k,s]of this.sessions)if(s.accountId===id)this.sessions.delete(k);for(const[k,l]of this.logins)if(l.emailKey===a.emailKey)this.logins.delete(k);this.outbox=this.outbox.filter(j=>j.subjectKey!==a.emailKey);}
 async listTaskCompletion(accountId){return [...(this.taskProgress.get(accountId)||new Set())];}
 async setTaskCompletion(accountId,taskId,completed){
  if(!this.accounts.has(accountId))throw new Error('Account no longer exists');
  const done=this.taskProgress.get(accountId)||new Set();
  if(completed)done.add(taskId);else done.delete(taskId);
  if(done.size)this.taskProgress.set(accountId,done);else this.taskProgress.delete(accountId);
 }
 async listMaterials(){return structuredClone(this.materials);}
 async cleanup(){const now=Date.now();for(const [k,l]of this.logins)if(l.expires<=now)this.logins.delete(k);for(const [k,s]of this.sessions)if(s.expires<=now)this.sessions.delete(k);for(const [k,b]of this.buckets)if(b.until<=now)this.buckets.delete(k);}
 async close(){}
}
