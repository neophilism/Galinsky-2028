import {randomBytes,randomUUID} from 'node:crypto';
import {createReviewAuth,createReviewController} from './review-auth.mjs';

// Checks the deployed PostgreSQL adapter using one disposable, short-lived
// website-only identity. No mail, supporter data, staff or treasury is involved.
export async function verifyReviewRuntime({auth,pool,origin,secret}){
 const username='check.'+randomUUID().replaceAll('-','');
 const password=randomBytes(32).toString('hex');
 let userId;
 try{
  const user=await auth.api.createUser({body:{email:randomUUID()+'@checks.preview.invalid',name:'Runtime verification',password,role:'user',data:{username,previewExpiresAt:new Date(Date.now()+60000)}}});
  userId=user.user.id;
  const result=await auth.api.signInUsername({body:{username,password},returnHeaders:true});
  const cookie=result.headers.getSetCookie().map(c=>c.split(';')[0]).join('; ');
  if(!cookie)throw Error('Private review session creation failed.');
  const separate=createReviewAuth({database:pool,origin,secret});
  const controller=createReviewController({auth:separate,database:pool,pool,origin,setupKey:null});
  const session=await controller.session({headers:{cookie}});
  if(session?.user.id!==userId||session.user.role!=='user')throw Error('Private review session persistence failed.');
  await pool.query('UPDATE g28_review_user SET banned=true WHERE id=$1',[userId]);
  if(await controller.session({headers:{cookie}}))throw Error('Private review revocation check failed.');
  const boundaries=await pool.query("SELECT has_table_privilege(current_user,(SELECT c.oid FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='g28' AND c.relname='accounts'),'SELECT') AS volunteers,has_table_privilege(current_user,(SELECT c.oid FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='g28' AND c.relname='treasury_secrets'),'SELECT') AS treasury");
  if(boundaries.rows[0].volunteers||boundaries.rows[0].treasury)throw Error('Private review database credential has excessive authority.');
  return {postgresPasswordLogin:true,sessionAcrossInstances:true,immediateRevocation:true,volunteerDatabaseAccess:false,treasuryDatabaseAccess:false};
 }finally{if(userId)await pool.query('DELETE FROM g28_review_user WHERE id=$1',[userId]);}
}
