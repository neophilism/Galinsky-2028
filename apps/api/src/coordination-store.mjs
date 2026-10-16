import {assert} from '../../../packages/core/validation.mjs';
import {randomUUID} from 'node:crypto';
// PostgreSQL row locks keep each team's membership and capacity changes atomic.
export const postgresCoordination={
 async createTeam(team,audit){const c=await this.pool.connect();try{await c.query('BEGIN');await lockAccount(c,audit.actorId);await c.query('INSERT INTO g28.coordination_teams(id,record) VALUES($1,$2)',[team.id,team]);await auditWrite(c,audit);await c.query('COMMIT');}catch(e){await c.query('ROLLBACK');throw e;}finally{c.release();}},
 async listTeams(){return (await this.pool.query('SELECT record FROM g28.coordination_teams ORDER BY id')).rows.map(r=>r.record);},
 async getTeam(id){return (await this.pool.query('SELECT record FROM g28.coordination_teams WHERE id=$1',[id])).rows[0]?.record||null;},
 async updateTeam(id,actorId,mutate){const c=await this.pool.connect();try{await c.query('BEGIN');await lockAccount(c,actorId);const team=(await c.query('SELECT record FROM g28.coordination_teams WHERE id=$1 FOR UPDATE',[id])).rows[0]?.record||null;const {result,audit}=mutate(team);await c.query('UPDATE g28.coordination_teams SET record=$2,updated_at=now() WHERE id=$1',[id,team]);await auditWrite(c,audit);await c.query('COMMIT');return result;}catch(e){await c.query('ROLLBACK');throw e;}finally{c.release();}}
};
async function auditWrite(client,audit){await client.query('INSERT INTO g28.audit_events(id,actor_subject,action,object_id,result) VALUES($1,$2,$3,$4,$5)',[randomUUID(),audit.actorId,audit.action,audit.objectId,'success']);}
export const memoryCoordination={
 async createTeam(team,audit){this.coordinationTeams??=new Map();this.coordinationAudit??=[];this.coordinationTeams.set(team.id,structuredClone(team));this.coordinationAudit.push(audit);},
 async listTeams(){return structuredClone([...(this.coordinationTeams?.values()||[])]);},
 async getTeam(id){return structuredClone(this.coordinationTeams?.get(id)||null);},
 async updateTeam(id,actorId,mutate){const team=structuredClone(this.coordinationTeams?.get(id)||null);const {result,audit}=mutate(team);this.coordinationTeams.set(id,team);this.coordinationAudit.push(audit);return result;}
};

async function lockAccount(client,id){const a=await client.query('SELECT id FROM g28.accounts WHERE id=$1 FOR KEY SHARE',[id]);assert(a.rowCount===1,'authentication_required','Your account is no longer available.',401);}
export function removeAccountCoordination(team,id,emailKey,now=Date.now()){
 team.members=team.members.filter(m=>m.accountId!==id);
 team.invitations=team.invitations.filter(i=>i.emailKey!==emailKey);
 for(const event of team.events){
  event.rsvps=event.rsvps.filter(r=>r.accountId!==id);
  if(event.proposedBy===id)event.proposedBy=null;
  if(event.status==='published'&&Date.parse(event.startsAt)>now){
   for(const next of event.rsvps.filter(r=>r.status==='waitlisted')){
    if(event.rsvps.filter(r=>r.status==='confirmed').length>=event.capacity)break;
    next.status='confirmed';
   }
  }
 }
 team.revision++;
}
export function ownCoordination(teams,id){return teams.filter(t=>!t.archived&&t.members.some(m=>m.accountId===id)).map(t=>({teamId:t.id,name:t.name,membership:{...t.members.find(m=>m.accountId===id)},rsvps:t.events.filter(e=>e.rsvps.some(r=>r.accountId===id)).map(e=>({eventId:e.id,title:e.title,status:e.rsvps.find(r=>r.accountId===id).status}))}));}
