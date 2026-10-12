import {randomUUID} from 'node:crypto';
import {selectRotatingProvider,evaluateIncident,HEALTH_SIGNALS} from '../../packages/core/donation-rotation.mjs';

const validId=x=>typeof x==='string' && /^[a-z][a-z0-9-]{1,39}$/.test(x);
const validRef=x=>typeof x==='string' && /^[a-zA-Z0-9][a-zA-Z0-9._:-]{5,127}$/.test(x);
const validEvidence=x=>typeof x==='string'&&x.length>=8&&x.length<=180&&/^[a-zA-Z0-9][a-zA-Z0-9._:/ -]*$/.test(x);
export class DonationRotationStore {
 constructor(pool){this.pool=pool;}
 async bootstrap(routes) {
  if (!Array.isArray(routes)||(routes.length<1||routes.length>16)||new Set(routes.map(x=>x.id)).size!==routes.length||!routes.every(x=>validId(x.id)))
   throw new Error('Between one and sixteen approved, distinct processor IDs are required');
  const c=await this.pool.connect();
  try {
   await c.query('BEGIN');
   for (const route of routes) await c.query(
    "INSERT INTO g28.donation_provider_state(provider_id,status,reason) VALUES($1,'quarantined','not_activated') ON CONFLICT(provider_id) DO NOTHING",
    [route.id]);
   await c.query('COMMIT');
  }catch(e){await c.query('ROLLBACK');throw e;}finally{c.release();}
 }
 async selectRoute(routes,draw) {
  if (!Array.isArray(routes)||(routes.length<1||routes.length>16))throw new Error('Between one and sixteen approved providers must be configured');
  const c=await this.pool.connect();
  try {
   await c.query('BEGIN');
   const result=await c.query(
    "SELECT provider_id,status FROM g28.donation_provider_state WHERE provider_id=ANY($1::text[]) ORDER BY provider_id FOR SHARE",
    [routes.map(x=>x.id)]);
   const route=selectRotatingProvider(routes,result.rows,draw);
   if (!route){await c.query('ROLLBACK');return null;}
   const selectionId=randomUUID();
   await c.query('INSERT INTO g28.donation_route_selections(id,provider_id) VALUES($1,$2)',[selectionId,route.id]);
   await c.query('COMMIT');
   return {providerId:route.id,url:route.url,selectionId};
  }catch(e){await c.query('ROLLBACK');throw e;}finally{c.release();}
 }
 async observe(providerId,{eventId,attemptRef,signal}) {
  if(!validId(providerId)||!validRef(eventId)||!validRef(attemptRef)||!HEALTH_SIGNALS.includes(signal))
   throw new Error('Invalid trusted processor observation');
  const c=await this.pool.connect();
  try {
   await c.query('BEGIN');
   const current=await c.query('SELECT status,updated_at FROM g28.donation_provider_state WHERE provider_id=$1 FOR UPDATE',[providerId]);
   if(!current.rowCount)throw new Error('Provider must be registered before recording health evidence');
   const inserted=await c.query(
    'INSERT INTO g28.donation_provider_observations(provider_id,event_id,attempt_ref,signal) VALUES($1,$2,$3,$4) ON CONFLICT(provider_id,event_id) DO NOTHING RETURNING observation_seq',
    [providerId,eventId,attemptRef,signal]);
   let status=current.rows[0].status,reason=null;
   if(inserted.rowCount && status==='active'){
    const recent=await c.query(
     'SELECT signal,attempt_ref,observed_at FROM g28.donation_provider_observations WHERE provider_id=$1 AND observed_at > $2 ORDER BY observation_seq DESC LIMIT 20',
     [providerId,current.rows[0].updated_at]);
    const verdict=evaluateIncident(recent.rows);
    if(verdict.quarantine){
     status='quarantined';reason=verdict.reason;
     await c.query(
      'UPDATE g28.donation_provider_state SET status=$2,reason=$3,evidence_ref=$4,updated_at=now() WHERE provider_id=$1',
      [providerId,status,reason,'event:'+eventId]);
    }
   }
   await c.query('COMMIT');
   return {accepted:Boolean(inserted.rowCount),status,reason};
  }catch(e){await c.query('ROLLBACK');throw e;}finally{c.release();}
 }
 async setStatus(providerId,status,evidenceRef) {
  if(!validId(providerId)||!['active','quarantined','excluded'].includes(status)||!validEvidence(evidenceRef))
   throw new Error('Provider state change requires a valid status and explicit evidence reference');
  const c=await this.pool.connect();
  try {
   await c.query('BEGIN');
   const current=await c.query('SELECT status FROM g28.donation_provider_state WHERE provider_id=$1 FOR UPDATE',[providerId]);
   if(!current.rowCount)throw new Error('Provider is not registered');
   if(current.rows[0].status==='excluded' && status!=='excluded')throw new Error('A permanently excluded provider cannot be restored');
   await c.query(
    'UPDATE g28.donation_provider_state SET status=$2,reason=$3,evidence_ref=$4,updated_at=now() WHERE provider_id=$1',
    [providerId,status,status==='active'?'verified_repair':status==='excluded'?'documented_exclusion':'operator_quarantine',evidenceRef]);
   await c.query('COMMIT');
   return {providerId,status,evidenceRef};
  }catch(e){await c.query('ROLLBACK');throw e;}finally{c.release();}
 }
 async statuses() {
  const result=await this.pool.query('SELECT provider_id,status,reason,evidence_ref,updated_at FROM g28.donation_provider_state ORDER BY provider_id');
  return result.rows;
 }
 async close(){await this.pool.end();}
}
