// Explicit development/test store only. server.mjs rejects it in production.
import {randomUUID} from 'node:crypto';
export class MemoryStore{
 constructor({materials=[]}={}){this.logins=new Map();this.accounts=new Map();this.sessions=new Map();this.outbox=[];this.buckets=new Map();this.materials=materials;this.taskProgress=new Map();this.materialReading=new Map();this.rolePreferences=new Map();this.bookmarks=new Map();}
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
 async closeAccount(id){const a=this.accounts.get(id);if(!a)return;this.accounts.delete(id);this.taskProgress.delete(id);this.materialReading.delete(id);this.rolePreferences.delete(id);this.bookmarks.delete(id);for(const [k,s]of this.sessions)if(s.accountId===id)this.sessions.delete(k);for(const[k,l]of this.logins)if(l.emailKey===a.emailKey)this.logins.delete(k);this.outbox=this.outbox.filter(j=>j.subjectKey!==a.emailKey);}
 async accountActivityExport(id){
  const a=this.accounts.get(id);
  if(!a)return null;
  const p=this.rolePreferences.get(id);
  const reads=this.materialReading.get(id)||new Map();
  return {
   account:{id,verifiedAt:a.verifiedAt||null,createdAt:a.createdAt||null,
    marketingConsent:Boolean(a.marketing),termsVersion:a.termsVersion||null},
   rolePreferences:p?{...p}:null,
   completedTasks:[...(this.taskProgress.get(id)||new Set())].sort(),
   bookmarkedMaterials:[...(this.bookmarks.get(id)||new Set())].sort(),
   materialAcknowledgments:[...reads.values()].map(x=>({
    materialId:x.materialId,revision:x.revision,contentSha256:x.contentSha256
   })).sort((a,b)=>a.materialId.localeCompare(b.materialId))
  };
 }
 async revokeAllSessions(id){
  for(const [hash,s] of this.sessions)if(s.accountId===id)this.sessions.delete(hash);
 }
 async listTaskCompletion(accountId){return [...(this.taskProgress.get(accountId)||new Set())];}
 async setTaskCompletion(accountId,taskId,completed){
  if(!this.accounts.has(accountId))throw new Error('Account no longer exists');
  const done=this.taskProgress.get(accountId)||new Set();
  if(completed)done.add(taskId);else done.delete(taskId);
  if(done.size)this.taskProgress.set(accountId,done);else this.taskProgress.delete(accountId);
 }
 async listBookmarks(accountId){return [...(this.bookmarks.get(accountId)||new Set())].sort();}
 async setBookmark(accountId,materialId,saved){
  if(!this.accounts.has(accountId))throw Error('Account does not exist');
  const set=this.bookmarks.get(accountId)||new Set();
  if(saved)set.add(materialId);else set.delete(materialId);
  if(set.size)this.bookmarks.set(accountId,set);else this.bookmarks.delete(accountId);
 }
 async getRolePreferences(accountId){return this.rolePreferences.get(accountId)?{...this.rolePreferences.get(accountId)}:null;}
 async setRolePreferences(accountId,preferences){
  if(!this.accounts.has(accountId))throw Error('Account does not exist');
  this.rolePreferences.set(accountId,{...preferences});
 }
 async readMaterialAck(accountId,materialId){return this.materialReading.get(accountId)?.get(materialId)||null;}
 async setMaterialAck(accountId,materialId,record){
  if(!this.accounts.has(accountId))throw new Error('Account no longer exists');
  const reads=this.materialReading.get(accountId)||new Map();
  if(record)reads.set(materialId,{...record,materialId});else reads.delete(materialId);
  if(reads.size)this.materialReading.set(accountId,reads);else this.materialReading.delete(accountId);
 }
 async listMaterials(){return structuredClone(this.materials);}
 async cleanup(){const now=Date.now();for(const [k,l]of this.logins)if(l.expires<=now)this.logins.delete(k);for(const [k,s]of this.sessions)if(s.expires<=now)this.sessions.delete(k);for(const [k,b]of this.buckets)if(b.until<=now)this.buckets.delete(k);}
 async close(){}
}
