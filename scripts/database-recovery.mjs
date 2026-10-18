import {createCipheriv,createDecipheriv,createHash,randomBytes} from 'node:crypto';
import {spawn} from 'node:child_process';
import {createReadStream,createWriteStream} from 'node:fs';
import {open,stat,unlink,mkdtemp,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join,resolve} from 'node:path';
import {pipeline} from 'node:stream/promises';
import pg from 'pg';

const MAGIC=Buffer.from('G28BACKUP1\n'),MAX_HEADER=4096;
function keyBytes(key){
 if(typeof key!=='string'||!/^[A-Za-z0-9+/]{43}=$/.test(key))throw Error('A separately held 32-byte base64 recovery key is required.');
 const bytes=Buffer.from(key,'base64');if(bytes.length!==32)throw Error('Invalid recovery key.');return bytes;
}
function connection(url){
 const u=new URL(url);if(!['postgres:','postgresql:'].includes(u.protocol)||!u.hostname||u.searchParams.has('options'))throw Error('Invalid database connection.');
 if([...u.searchParams.keys()].some(k=>!['sslmode','channel_binding'].includes(k)))throw Error('Unsupported connection option.');
 const database=decodeURIComponent(u.pathname.slice(1));if(!database||database.includes('/'))throw Error('Specify one database.');
 // Credentials stay in the child environment. They never appear in argv,
 // emitted evidence, command errors, or backup headers.
 const env=Object.fromEntries(Object.entries(process.env).filter(([name])=>!name.startsWith('PG')&&!/KEY|SECRET|TOKEN|PASSWORD|DATABASE_URL/.test(name)));
 return {database,fingerprint:createHash('sha256').update(u.hostname+':'+(u.port||'5432')+'/'+database).digest('hex'),env:{...env,PGHOST:u.hostname,PGPORT:u.port||'5432',PGDATABASE:database,PGUSER:decodeURIComponent(u.username),PGPASSWORD:decodeURIComponent(u.password),PGSSLMODE:u.searchParams.get('sslmode')||(['localhost','127.0.0.1','::1'].includes(u.hostname)?'disable':'verify-full'),PGCONNECT_TIMEOUT:'15',PGOPTIONS:''}};
}
function command(binary,args,env){
 const child=spawn(binary,args,{env,stdio:['ignore','pipe','pipe']});
 // Raw PostgreSQL errors can contain record values or connection information.
 child.stderr.resume();
 const done=new Promise((resolve,reject)=>{child.once('error',()=>reject(Error('PostgreSQL recovery tool is unavailable.')));child.once('exit',(code,signal)=>code===0?resolve():reject(Error('PostgreSQL recovery command failed'+(signal?' during interruption.':'.'))));});
 done.catch(()=>{});return {child,done};
}
export async function backupDatabase({url,key,file,pgDump='pg_dump',now=new Date()}){
 const started=performance.now(),k=keyBytes(key),source=connection(url),nonce=randomBytes(12);
 const header=Buffer.from(JSON.stringify({version:1,createdAt:now.toISOString(),database:source.fingerprint,keyId:createHash('sha256').update(k).digest('hex').slice(0,24),nonce:nonce.toString('base64')}));
 const prefix=Buffer.concat([MAGIC,Buffer.from(header.length.toString().padStart(4,'0')+'\n'),header]);
 const cipher=createCipheriv('aes-256-gcm',k,nonce);cipher.setAAD(prefix);
 // Exclusive creation prevents overwriting the only good recovery generation.
 const handle=await open(file,'wx',0o600);let proc;
 try{
  await handle.writeFile(prefix);await handle.close();
  proc=command(pgDump,['--format=custom','--no-password'],source.env);
  await Promise.all([pipeline(proc.child.stdout,cipher,createWriteStream(file,{flags:'a',mode:0o600})),proc.done]);
  const tag=await open(file,'a');try{await tag.writeFile(cipher.getAuthTag());await tag.sync();}finally{await tag.close();}
  return {version:1,kind:'encrypted_database_backup',createdAt:now.toISOString(),database:source.fingerprint,keyId:JSON.parse(header).keyId,bytes:(await stat(file)).size,durationMs:Math.round(performance.now()-started)};
 }catch{proc?.child.kill('SIGTERM');await handle.close().catch(()=>{});await unlink(file).catch(()=>{});throw Error('Database backup failed; no complete generation was produced.');}
}
async function archiveHeader(file){
 const h=await open(file,'r');
 try{
  const lead=Buffer.alloc(MAGIC.length+5);if((await h.read(lead,0,lead.length,0)).bytesRead!==lead.length||!lead.subarray(0,MAGIC.length).equals(MAGIC)||!/^\d{4}\n$/.test(lead.subarray(MAGIC.length).toString()))throw Error('Invalid backup archive.');
  const length=Number(lead.subarray(MAGIC.length,lead.length-1).toString());if(length<1||length>MAX_HEADER)throw Error('Invalid backup header.');
  const header=Buffer.alloc(length);if((await h.read(header,0,length,lead.length)).bytesRead!==length)throw Error('Truncated backup header.');
  const meta=JSON.parse(header),size=(await h.stat()).size,start=lead.length+length;
  if(meta.version!==1||size<=start+16||!/^[a-f0-9]{64}$/.test(meta.database)||!/^[a-f0-9]{24}$/.test(meta.keyId)||typeof meta.nonce!=='string'||Buffer.from(meta.nonce,'base64').length!==12)throw Error('Invalid backup metadata.');
  const tag=Buffer.alloc(16);await h.read(tag,0,16,size-16);
  return {meta,prefix:Buffer.concat([lead,header]),tag,start,end:size-17};
 }finally{await h.close();}
}
export async function restoreDatabase({url,key,file,confirmation,pgRestore='pg_restore'}){
 const started=performance.now(),target=connection(url),k=keyBytes(key);
 // Recovery only ever targets an explicitly named, isolated new database.
 if(!/^g28_restore_[a-z0-9_]{3,60}$/.test(target.database)||confirmation!==target.database)throw Error('Confirm an isolated g28_restore_ database by its exact name.');
 const archive=await archiveHeader(file);
 if(target.fingerprint===archive.meta.database)throw Error('Source and recovery target must differ.');
 if(archive.meta.keyId!==createHash('sha256').update(k).digest('hex').slice(0,24))throw Error('This recovery key does not match the backup generation.');
 const dir=await mkdtemp(join(tmpdir(),'g28-recovery-')),plain=join(dir,'archive.dump');let pool,proc;
 try{
  const decipher=createDecipheriv('aes-256-gcm',k,Buffer.from(archive.meta.nonce,'base64'));decipher.setAAD(archive.prefix);decipher.setAuthTag(archive.tag);
  // Authenticate the entire archive BEFORE any SQL is executed. Temporary
  // plaintext has mode 0600 inside a private directory and is always removed.
  await pipeline(createReadStream(file,{start:archive.start,end:archive.end}),decipher,createWriteStream(plain,{flags:'wx',mode:0o600}));
  pool=new pg.Pool({connectionString:url,connectionTimeoutMillis:15000,max:1});
  const existing=await pool.query("SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname NOT LIKE 'pg_%' AND n.nspname<>'information_schema' LIMIT 1");
  const schemas=await pool.query("SELECT 1 FROM pg_namespace WHERE nspname NOT LIKE 'pg_%' AND nspname NOT IN ('information_schema','public') LIMIT 1");
  if(existing.rowCount||schemas.rowCount)throw Error('Recovery target must be empty.');
  // A transaction prevents a failed restore from leaving half a database.
  // Cluster roles are separately provisioned. Preserve all original ACLs,
  // especially REVOKE on SECURITY DEFINER functions; missing roles fail closed.
  proc=command(pgRestore,['--exit-on-error','--single-transaction','--no-owner','--no-password','--dbname',target.database,plain],target.env);
  proc.child.stdout.resume();await proc.done;
  return {version:1,kind:'isolated_database_restore',sourceCreatedAt:archive.meta.createdAt,sourceDatabase:archive.meta.database,targetDatabase:target.fingerprint,durationMs:Math.round(performance.now()-started),originalPermissionsPreserved:true,productionRecoveryProven:false};
 }catch{proc?.child.kill('SIGTERM');throw Error('Isolated database restore failed; inspect private operator diagnostics.');}
 finally{await pool?.end();await rm(dir,{recursive:true,force:true});}
}
async function main(){
 const [action,file]=process.argv.slice(2);if(!file||!['backup','restore'].includes(action))throw Error('Use backup|restore and an archive path.');
 const key=process.env.RECOVERY_KEY_BASE64;
 const result=action==='backup'?await backupDatabase({url:process.env.DATABASE_URL,key,file:resolve(file)}):await restoreDatabase({url:process.env.RESTORE_DATABASE_URL,key,file:resolve(file),confirmation:process.env.RESTORE_CONFIRM_DATABASE});
 console.log(JSON.stringify(result));
}
if(process.argv[1]&&import.meta.url===new URL('file://'+process.argv[1]).href)main().catch(e=>{console.error(e.message);process.exitCode=1;});
