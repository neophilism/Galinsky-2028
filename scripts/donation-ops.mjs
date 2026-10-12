// Privileged operator-only CLI: run from a trusted Render shell or equivalent.
// Never expose this interface as a public HTTP endpoint or put secrets in arguments.
import {databasePool} from '../apps/api/src/postgres-store.mjs';
import {DonationRotationStore} from '../apps/web/donation-rotation-store.mjs';
import {approvedDonationRoutes} from '../packages/core/donation-provider.mjs';

if(!process.env.DATABASE_URL)throw new Error('DATABASE_URL must refer to the approved campaign database');
const store=new DonationRotationStore(databasePool(process.env.DATABASE_URL));
const [command,...args]=process.argv.slice(2);
try {
 let result;
 if(command==='status' && args.length===0)result=await store.statuses();
 else if(command==='bootstrap' && args.length===0){
  const routes=approvedDonationRoutes(process.env,'production');
  await store.bootstrap(routes);
  result={registered:routes.map(x=>x.id),state:'quarantined until verified activation'};
 }else if(command==='observe' && args.length===4){
  const [providerId,eventId,attemptRef,signal]=args;
  result=await store.observe(providerId,{eventId,attemptRef,signal});
 }else if(command==='set-state' && args.length===3){
  const [providerId,state,evidenceRef]=args;
  result=await store.setStatus(providerId,state,evidenceRef);
 }else{
  throw new Error('Usage: status | bootstrap | observe PROVIDER EVENT_ID ATTEMPT_REF SIGNAL | set-state PROVIDER active|quarantined|excluded EVIDENCE_REF');
 }
 console.log(JSON.stringify(result));
}catch(e){console.error(e.message);process.exitCode=1;}
finally{await store.close();}
