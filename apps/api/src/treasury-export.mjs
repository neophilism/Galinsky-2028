import {randomUUID,createHash} from 'node:crypto';
import {assert} from '../../../packages/core/validation.mjs';
import {treasuryExportRequest,treasuryExportDocument,treasuryExportBytes} from '../../../packages/core/treasury-export.mjs';
export const postgresTreasuryExport={
 async exportTreasury(range,actor,generatedAt){
  const c=await this.pool.connect();try{await c.query('BEGIN ISOLATION LEVEL REPEATABLE READ');
   const q=await c.query('SELECT provider,event_id,payment_id,event_digest,event_kind,amount_cents,occurred_at FROM g28.financial_provider_events WHERE occurred_at>=$1 AND occurred_at<$2 ORDER BY occurred_at,provider,event_id LIMIT 10001',[range.from,range.until]);
   const document=treasuryExportDocument(q.rows,range,generatedAt),bytes=treasuryExportBytes(document,range.format),digest=createHash('sha256').update(bytes).digest('hex'),reference=randomUUID();
   await c.query('INSERT INTO g28.treasury_exports(id,actor_id,range_from,range_until,format,purpose,row_count,sha256) VALUES($1,$2,$3,$4,$5,$6,$7,$8)',[reference,actor,range.from,range.until,range.format,range.purpose,q.rowCount,digest]);
   await c.query("INSERT INTO g28.audit_events(id,actor_subject,action,object_id,result) VALUES($1,$2,'treasury_export',$3,'success')",[randomUUID(),actor,reference]);
   await c.query('COMMIT');return {bytes,digest,reference};
  }catch(e){await c.query('ROLLBACK');throw e;}finally{c.release();}
 }
};
export function registerTreasuryExports(app,{store,config,writeSession,clock}){
 app.post('/api/staff/treasury/export',async(req,reply)=>{
  assert(config.staffIdentity&&config.adminLoginReady,'treasury_export_unavailable','Verified staff identity and passkeys are required.',503);
  const s=await writeSession(req),role=await store.adminRole(s.account,config.adminOwnerEmailKey);assert(['owner','treasurer'].includes(role),'treasury_forbidden','Only the authorized owner or treasurer can export the ledger.',403);
  assert(await store.staffMfaValid(s.account.id,s.hash,clock()),'mfa_required','Verify your staff passkey before exporting.',403);
  const range=treasuryExportRequest(req.body);assert(await store.rate('treasury-export:'+s.account.id,3,clock()+3600000),'export_rate_limited','Wait before another bulk export.',429);
  const result=await store.exportTreasury(range,s.account.id,new Date(clock()).toISOString());
  return reply.header('Cache-Control','private, no-store').header('Content-Disposition','attachment; filename="galinsky-treasury-ledger.'+range.format+'"').header('X-Export-Reference',result.reference).header('X-Content-SHA256',result.digest).type(range.format==='csv'?'text/csv; charset=utf-8':'application/json; charset=utf-8').send(result.bytes);
 });
}
