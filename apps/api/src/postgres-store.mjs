import pg from 'pg';
import {randomUUID} from 'node:crypto';
export function databasePool(connectionString){
 const u=new URL(connectionString);const local=['localhost','127.0.0.1','[::1]'].includes(u.hostname);
 // Keep TLS verification explicit; connection-string sslmode must not silently weaken it.
 for(const p of ['sslmode','sslcert','sslkey','sslrootcert'])u.searchParams.delete(p);
 return new pg.Pool({connectionString:u.toString(),ssl:local?false:{rejectUnauthorized:true},max:5,connectionTimeoutMillis:8000,idleTimeoutMillis:10000,statement_timeout:10000,application_name:'galinsky-2028'});
}
export class PostgresStore{
 constructor(pool){this.pool=pool;}
 async healthy(){await this.pool.query('SELECT 1 FROM g28.schema_migrations LIMIT 1');return true;}
 async rate(key,limit,until){const q=await this.pool.query(`INSERT INTO g28.rate_buckets(key,count,expires_at) VALUES($1,1,$2) ON CONFLICT(key) DO UPDATE SET count=CASE WHEN g28.rate_buckets.expires_at<now() THEN 1 ELSE g28.rate_buckets.count+1 END, expires_at=CASE WHEN g28.rate_buckets.expires_at<now() THEN EXCLUDED.expires_at ELSE g28.rate_buckets.expires_at END RETURNING count`,[key,new Date(until)]);return q.rows[0].count<=limit;}
 async requestLogin(r,job){const c=await this.pool.connect();try{await c.query('BEGIN');await c.query(`INSERT INTO g28.login_requests(token_hash,binding_hash,email_key,delivery_envelope,marketing_consent,terms_version,expires_at) VALUES($1,$2,$3,$4,$5,$6,$7)`,[r.hash,r.binding,r.emailKey,r.deliveryEnvelope,r.marketing,r.termsVersion,new Date(r.expires)]);await c.query('INSERT INTO g28.outbox(id,kind,subject_key,payload_envelope) VALUES($1,$2,$3,$4)',[job.id,job.kind,r.emailKey,job.envelope]);await c.query('COMMIT');}catch(e){await c.query('ROLLBACK');throw e;}finally{c.release();}}
 async consumeLogin(hash,binding,s,now=Date.now()){
  const c=await this.pool.connect();try{await c.query('BEGIN');const found=await c.query('DELETE FROM g28.login_requests WHERE token_hash=$1 AND binding_hash=$2 AND expires_at>$3 RETURNING *',[hash,binding,new Date(now)]);if(!found.rowCount){await c.query('ROLLBACK');return null;}
  const r=found.rows[0];const accounts=await c.query(`INSERT INTO g28.accounts(id,email_key,delivery_envelope,verified_at,marketing_consent,terms_version) VALUES($1,$2,$3,$4,$5,$6) ON CONFLICT(email_key) DO UPDATE SET verified_at=g28.accounts.verified_at RETURNING *`,[randomUUID(),r.email_key,r.delivery_envelope,new Date(now),r.marketing_consent,r.terms_version]);const a=accounts.rows[0];await c.query('INSERT INTO g28.sessions(token_hash,account_id,csrf_token,expires_at) VALUES($1,$2,$3,$4)',[s.hash,a.id,s.csrf,new Date(s.expires)]);await c.query('COMMIT');return {id:a.id,verified:true,marketing:a.marketing_consent};
  }catch(e){await c.query('ROLLBACK');throw e;}finally{c.release();}
 }
 async session(hash,now=Date.now()){const q=await this.pool.query('SELECT s.token_hash,s.csrf_token,s.expires_at,a.id,a.marketing_consent FROM g28.sessions s JOIN g28.accounts a ON a.id=s.account_id WHERE s.token_hash=$1 AND s.expires_at>$2',[hash,new Date(now)]);const r=q.rows[0];return r?{hash:r.token_hash,csrf:r.csrf_token,expires:+r.expires_at,account:{id:r.id,verified:true,marketing:r.marketing_consent}}:null;}
 async logout(hash){await this.pool.query('DELETE FROM g28.sessions WHERE token_hash=$1',[hash]);}
 async consent(id,marketing){await this.pool.query('UPDATE g28.accounts SET marketing_consent=$1 WHERE id=$2',[marketing,id]);}
 async closeAccount(id){const c=await this.pool.connect();try{await c.query('BEGIN');await c.query('DELETE FROM g28.login_requests WHERE email_key=(SELECT email_key FROM g28.accounts WHERE id=$1)',[id]);await c.query('DELETE FROM g28.outbox WHERE subject_key=(SELECT email_key FROM g28.accounts WHERE id=$1)',[id]);await c.query('DELETE FROM g28.accounts WHERE id=$1',[id]);await c.query('COMMIT');}catch(e){await c.query('ROLLBACK');throw e;}finally{c.release();}}
 async listTaskCompletion(accountId){
  const q=await this.pool.query('SELECT task_id FROM g28.task_progress WHERE account_id=$1 ORDER BY task_id',[accountId]);
  return q.rows.map(r=>r.task_id);
 }
 async setTaskCompletion(accountId,taskId,completed){
  if(completed)await this.pool.query(`INSERT INTO g28.task_progress(account_id,task_id) VALUES($1,$2) ON CONFLICT(account_id,task_id) DO UPDATE SET completed_at=now()`,[accountId,taskId]);
  else await this.pool.query('DELETE FROM g28.task_progress WHERE account_id=$1 AND task_id=$2',[accountId,taskId]);
 }
 async getRolePreferences(accountId){
  const q=await this.pool.query('SELECT role_id,available_minutes,willing_to_train FROM g28.volunteer_role_preferences WHERE account_id=$1',[accountId]);
  const r=q.rows[0];
  return r?{roleId:r.role_id,minutes:r.available_minutes,willingToTrain:r.willing_to_train}:null;
 }
 async setRolePreferences(accountId,preferences){
  await this.pool.query(`INSERT INTO g28.volunteer_role_preferences(account_id,role_id,available_minutes,willing_to_train)
   VALUES($1,$2,$3,$4)
   ON CONFLICT(account_id) DO UPDATE SET role_id=EXCLUDED.role_id,available_minutes=EXCLUDED.available_minutes,
   willing_to_train=EXCLUDED.willing_to_train,updated_at=now()`,
   [accountId,preferences.roleId,preferences.minutes,preferences.willingToTrain]);
 }
 async readMaterialAck(accountId,materialId){
  const q=await this.pool.query('SELECT material_id,revision,content_sha256 FROM g28.material_reading WHERE account_id=$1 AND material_id=$2',[accountId,materialId]);
  return q.rows[0]?{materialId:q.rows[0].material_id,revision:q.rows[0].revision,contentSha256:q.rows[0].content_sha256}:null;
 }
 async setMaterialAck(accountId,materialId,record){
  if(record)await this.pool.query(`INSERT INTO g28.material_reading(account_id,material_id,revision,content_sha256) VALUES($1,$2,$3,$4) ON CONFLICT(account_id,material_id) DO UPDATE SET revision=EXCLUDED.revision,content_sha256=EXCLUDED.content_sha256,acknowledged_at=now()`,[accountId,materialId,record.revision,record.contentSha256]);
  else await this.pool.query('DELETE FROM g28.material_reading WHERE account_id=$1 AND material_id=$2',[accountId,materialId]);
 }
 async listMaterials(){const q=await this.pool.query("SELECT record FROM g28.materials WHERE status='published' AND audience='volunteer'");return q.rows.map(r=>r.record);}
 async claimJob(){const lease=randomUUID();const q=await this.pool.query(`WITH next AS (SELECT id FROM g28.outbox WHERE (status='queued' AND available_at<=now()) OR (status='leased' AND lease_until<now()) ORDER BY available_at FOR UPDATE SKIP LOCKED LIMIT 1) UPDATE g28.outbox o SET status='leased',attempts=attempts+1,lease_until=now()+interval '2 minutes',lease_token=$1 FROM next WHERE o.id=next.id RETURNING o.*`,[lease]);return q.rows[0]||null;}
 async finishJob(job,error=null){if(!error){await this.pool.query("UPDATE g28.outbox SET status='sent',payload_envelope='',lease_until=NULL,lease_token=NULL WHERE id=$1 AND lease_token=$2",[job.id,job.lease_token]);return;}const dead=job.attempts>=8||['expired','invalid_destination','provider_rejected'].includes(error);await this.pool.query("UPDATE g28.outbox SET status=$1,last_error_code=$2,payload_envelope=CASE WHEN $1='dead' THEN '' ELSE payload_envelope END,available_at=now()+($3 * interval '1 second'),lease_until=NULL,lease_token=NULL WHERE id=$4 AND lease_token=$5",[dead?'dead':'queued',error,Math.min(3600,2**job.attempts*15),job.id,job.lease_token]);}
 async cleanup(){await this.pool.query('DELETE FROM g28.login_requests WHERE expires_at<now()');await this.pool.query('DELETE FROM g28.sessions WHERE expires_at<now()');await this.pool.query('DELETE FROM g28.rate_buckets WHERE expires_at<now()');await this.pool.query("DELETE FROM g28.outbox WHERE created_at<now()-interval '1 day'");}
 async close(){await this.pool.end();}
}
