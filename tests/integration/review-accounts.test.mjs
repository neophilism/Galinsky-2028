import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {readFile,mkdtemp,writeFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {databasePool} from '../../apps/api/src/postgres-store.mjs';
import {createReviewAuth,createReviewController} from '../../apps/web/review-auth.mjs';
import {createPrivatePreviewServer} from '../../apps/web/private-preview.mjs';
const url=process.env.TEST_DATABASE_URL;
test('PostgreSQL reviewer sessions survive server restarts and revoke across separate instances',{skip:!url},async()=>{
 assert(['127.0.0.1','localhost'].includes(new URL(url).hostname),'Only isolated loopback Postgres is allowed.');
 const pool=databasePool(url);
 const directory=await mkdtemp(join(tmpdir(),'g28-review-postgres-'));
 const origin='http://127.0.0.1:4321',secret='synthetic-postgres-review-auth-secret-32-characters';
 const username='pg'+randomUUID().replaceAll('-','');
 let userId,first,second;
 const makeServer=()=>{const auth=createReviewAuth({database:pool,secret,origin,production:false});const controller=createReviewController({auth,database:pool,pool,origin,production:false,setupKey:null});const server=createPrivatePreviewServer({directory,reviewController:controller,env:{PREVIEW_ACCESS_USER:'preview',PREVIEW_ACCESS_PASSWORD:'synthetic-existing-preview-password-32-characters',G28_REVIEW_ACCOUNTS_ENABLED:'true'}});return {auth,server};};
 try{
  await pool.query('CREATE SCHEMA IF NOT EXISTS g28;CREATE TABLE IF NOT EXISTS g28.schema_migrations(version text PRIMARY KEY,applied_at timestamptz DEFAULT now())');
  await pool.query(await readFile('db/migrations/011_private_review_accounts.sql','utf8'));
  await pool.query(await readFile('db/migrations/012_private_review_credentials.sql','utf8'));
  await writeFile(join(directory,'index.html'),'<h1>Private policy preview</h1>');
  const a=makeServer();first=a.server;await new Promise(r=>first.listen(0,'127.0.0.1',r));
  const b=makeServer();second=b.server;await new Promise(r=>second.listen(0,'127.0.0.1',r));
  const base='http://127.0.0.1:'+first.address().port,other='http://127.0.0.1:'+second.address().port;
  const created=await a.auth.api.createUser({body:{email:username+'@fixture.example.test',name:'Synthetic reviewer',password:'postgres-review-password-12345',role:'user',data:{username}}});userId=created.user.id;
  const login=await fetch(base+'/preview/auth/sign-in/username',{method:'POST',headers:{Origin:origin,'Content-Type':'application/json'},body:JSON.stringify({username,password:'postgres-review-password-12345'})});
  assert.equal(login.status,200,await login.clone().text());
  const cookie=login.headers.getSetCookie().map(c=>c.split(';')[0]).join('; ');
  assert.equal((await fetch(base+'/',{headers:{Cookie:cookie}})).status,200);
  assert.equal((await fetch(other+'/',{headers:{Cookie:cookie}})).status,200,'The second instance finds the durable session');
  await new Promise(r=>first.close(r));first=null;
  const restart=makeServer();first=restart.server;await new Promise(r=>first.listen(0,'127.0.0.1',r));
  assert.equal((await fetch('http://127.0.0.1:'+first.address().port+'/',{headers:{Cookie:cookie}})).status,200,'Process restart preserves access');
  await pool.query('UPDATE g28_review_user SET banned=true WHERE id=$1',[userId]);
  assert.equal((await fetch(other+'/',{headers:{Cookie:cookie}})).status,401,'Database revocation takes effect without a cache delay');
  const raw=await pool.query('SELECT password FROM g28_review_account WHERE "userId"=$1',[userId]);assert(!raw.rows[0].password.includes('postgres-review-password-12345'));
  assert.equal((await fetch(other+'/preview/api/users',{headers:{Cookie:cookie}})).status,401);
 }finally{
  if(first)await new Promise(r=>first.close(r));if(second)await new Promise(r=>second.close(r));
  if(userId)await pool.query('DELETE FROM g28_review_user WHERE id=$1',[userId]);
  await pool.end();await rm(directory,{recursive:true,force:true});
 }
});
