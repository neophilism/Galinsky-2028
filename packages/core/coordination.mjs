import {randomUUID} from 'node:crypto';
import {assert,exactKeys,safeText} from './validation.mjs';

export function shortText(value,max=160){
 const text=safeText(value,max).trim();
 assert(text.length>0&&!/[<>\r\n]/.test(text),'invalid_text','Enter plain text without markup.');
 return text;
}
export function eventInput(body,now){
 const b=exactKeys(body,['title','startsAt','endsAt','timeZone','capacity','accessibility','venue','safety']);
 const title=shortText(b.title),accessibility=shortText(b.accessibility,500),venue=shortText(b.venue,300),safety=shortText(b.safety,500);
 assert(typeof b.startsAt==='string'&&typeof b.endsAt==='string'&&/Z$/.test(b.startsAt)&&/Z$/.test(b.endsAt),'invalid_time','Use UTC event timestamps.');
 const start=Date.parse(b.startsAt),end=Date.parse(b.endsAt);
 assert(Number.isFinite(start)&&Number.isFinite(end)&&start>now&&end>start&&end-start<=86400000&&start-now<=366*86400000,'invalid_time','Choose a future event lasting no more than one day.');
 assert(typeof b.timeZone==='string'&&b.timeZone.length<80,'invalid_timezone','Choose a valid time zone.');
 try{new Intl.DateTimeFormat('en',{timeZone:b.timeZone});}catch{assert(false,'invalid_timezone','Choose a valid time zone.');}
 assert(Number.isInteger(b.capacity)&&b.capacity>=1&&b.capacity<=200,'invalid_capacity','Capacity must be between 1 and 200.');
 return {title,startsAt:new Date(start).toISOString(),endsAt:new Date(end).toISOString(),timeZone:b.timeZone,capacity:b.capacity,accessibility,venue,safety};
}
function member(team,actor){return team.members.find(m=>m.accountId===actor.id);}
function manager(team,actor){return actor.owner||member(team,actor)?.role==='captain';}
function available(team,actor){assert(team&&!team.archived&&(actor.owner||member(team,actor)),'not_found','Team not available.',404);}
function requireManager(team,actor){available(team,actor);assert(manager(team,actor),'coordination_forbidden','A captain for this team must perform this action.',403);}
export function teamSummary(team,actor){
 if(team.archived)return null;
 const m=member(team,actor);
 if(!actor.owner&&!m)return null;
 return {id:team.id,name:team.name,region:team.region,role:actor.owner?'owner':m.role,memberCount:team.members.length};
}
export function teamView(team,actor,now){
 available(team,actor);
 const m=member(team,actor),canManage=manager(team,actor);
 const events=team.events.filter(e=>canManage||['published','cancelled'].includes(e.status)).map(e=>{
  const rsvp=e.rsvps.find(r=>r.accountId===actor.id);
  return {id:e.id,title:e.title,startsAt:e.startsAt,endsAt:e.endsAt,timeZone:e.timeZone,capacity:e.capacity,accessibility:e.accessibility,status:e.status,revision:e.revision,confirmed:e.rsvps.filter(r=>r.status==='confirmed').length,waitlisted:e.rsvps.filter(r=>r.status==='waitlisted').length,myRsvp:rsvp?.status||null,
   ...(canManage||rsvp?.status==='confirmed'?{venue:e.venue}:{}),...(canManage?{safety:e.safety}:{})};
 });
 return {...teamSummary(team,actor),revision:team.revision,canManage,events,
  // New members cannot read previous team plans. No member contact directory.
  plans:team.plans.filter(p=>actor.owner||p.createdRevision>=m.joinRevision).map(p=>({...p})),
  invitations:canManage?team.invitations.filter(i=>i.expires>now).map(i=>({id:i.id,expiresAt:new Date(i.expires).toISOString()})):[],
  members:canManage?team.members.map(x=>({accountId:x.accountId,label:x.label,role:x.role})):[]};
}
export class Coordination {
 constructor(store,clock=()=>Date.now()){this.store=store;this.clock=clock;}
 async create(actor,body){
  assert(actor.owner,'coordination_forbidden','Only the campaign owner can create teams.',403);
  const b=exactKeys(body,['name','region']);
  const team={id:randomUUID(),name:shortText(b.name,100),region:shortText(b.region,100),revision:1,archived:false,members:[],invitations:[],events:[],plans:[]};
  await this.store.createTeam(team,{actorId:actor.id,action:'team_create',objectId:team.id});
  return teamSummary(team,actor);
 }
 async list(actor){return (await this.store.listTeams()).map(t=>teamSummary(t,actor)).filter(Boolean);}
 async view(actor,id){return teamView(await this.store.getTeam(id),actor,this.clock());}
 async invitations(actor){return (await this.store.listTeams()).filter(t=>!t.archived).flatMap(t=>t.invitations.filter(i=>i.emailKey===actor.emailKey&&i.expires>this.clock()).map(i=>({id:i.id,teamId:t.id,teamName:t.name,expiresAt:new Date(i.expires).toISOString()})));}
 async change(actor,id,action,body){
  const now=this.clock();
  return this.store.updateTeam(id,actor.id,team=>{
   assert(team&&!team.archived,'not_found','Team not available.',404);
   let result;
   if(action==='accept'){
    const b=exactKeys(body,['invitationId','displayName','consent']);
    assert(b.consent===true,'consent_required','Choose to join this team and share your display name with its captain.');
    const invite=team.invitations.find(i=>i.id===b.invitationId&&i.emailKey===actor.emailKey&&i.expires>now);
    assert(invite,'not_found','Invitation not available.',404);
    assert(!member(team,actor),'already_joined','You already belong to this team.',409);
    assert(team.members.length<200,'team_full','This team is full.',409);
    const label=shortText(b.displayName,80);
    team.members.push({accountId:actor.id,label,role:'member',joinRevision:team.revision+1,joinedAt:new Date(now).toISOString()});
    team.invitations=team.invitations.filter(i=>i.emailKey!==actor.emailKey);
    result={joined:true};
   }else if(action==='leave'){
    exactKeys(body,[]);available(team,actor);
    this.removeMember(team,actor.id);result={left:true};
   }else{
    requireManager(team,actor);
    if(action==='invite'){
     const b=exactKeys(body,['emailKey']);
     assert(typeof b.emailKey==='string'&&/^[a-f0-9]{64}$/.test(b.emailKey),'invalid_invitation','Invalid invitation destination.');
     team.invitations=team.invitations.filter(i=>i.expires>now&&i.emailKey!==b.emailKey);
     assert(team.invitations.length<200,'too_many_invitations','Revoke unused invitations first.',409);
     const invite={id:randomUUID(),emailKey:b.emailKey,expires:now+7*86400000};
     team.invitations.push(invite);result={invited:true,invitationId:invite.id};
    }else if(action==='revoke-invite'){
     const b=exactKeys(body,['invitationId']);team.invitations=team.invitations.filter(i=>i.id!==b.invitationId);result={revoked:true};
    }else if(action==='membership'){
     const b=exactKeys(body,['accountId','role']);
     assert(['member','captain','removed'].includes(b.role),'invalid_role','Choose a valid team role.');
     const target=team.members.find(m=>m.accountId===b.accountId);assert(target,'not_found','Member not available.',404);
     assert(actor.owner||(target.role==='member'&&b.role==='removed'),'coordination_forbidden','Only the owner can assign or revoke captains.',403);
     if(b.role==='removed')this.removeMember(team,b.accountId);else target.role=b.role;
     result={updated:true};
    }else if(action==='plan'){
     const b=exactKeys(body,['summary','weekOf']);
     assert(/^\d{4}-\d{2}-\d{2}$/.test(b.weekOf||'')&&Number.isFinite(Date.parse(b.weekOf+'T00:00:00Z'))&&new Date(b.weekOf+'T00:00:00Z').toISOString().slice(0,10)===b.weekOf,'invalid_date','Choose a valid week start.');
     assert(team.plans.length<104,'plan_limit','Archive this team before adding more plans.',409);
     team.plans.push({id:randomUUID(),weekOf:b.weekOf,summary:shortText(b.summary,1500),createdRevision:team.revision+1,createdAt:new Date(now).toISOString()});result={saved:true};
    }else if(action==='propose-event'){
     assert(team.events.length<100,'event_limit','Archive this team before adding more events.',409);
     const event={id:randomUUID(),...eventInput(body,now),status:'draft',revision:1,rsvps:[],proposedBy:actor.id};
     team.events.push(event);result={eventId:event.id,status:'draft'};
    }else if(action==='review-event'){
     assert(actor.owner,'coordination_forbidden','Only the campaign owner can publish or withdraw events.',403);
     const b=exactKeys(body,['eventId','revision','decision','acknowledge']);
     assert(b.acknowledge===true,'confirmation','Confirm venue, accessibility, safety and required authorizations were reviewed.');
     assert(['publish','cancel'].includes(b.decision),'invalid_decision','Choose publish or cancel.');
     const event=team.events.find(e=>e.id===b.eventId);assert(event,'not_found','Event not available.',404);
     assert(event.revision===b.revision,'stale_event','Reload the updated event before reviewing.',409);
     if(b.decision==='publish')assert(event.status==='draft'&&Date.parse(event.startsAt)>now,'event_unavailable','Only future draft events can be published.',409);
     else assert(event.status!=='cancelled','event_unavailable','This event is already cancelled.',409);
     event.status=b.decision==='publish'?'published':'cancelled';event.revision++;
     if(event.status==='cancelled')event.rsvps.forEach(r=>{r.status='cancelled';});
     result={status:event.status,revision:event.revision};
    }else if(action==='archive'){
     assert(actor.owner,'coordination_forbidden','Only the owner can archive a team.',403);
     const b=exactKeys(body,['confirm']);assert(b.confirm===team.name,'confirmation','Type the team name to archive it.');
     team.archived=true;team.invitations=[];team.members=[];team.plans=[];
     team.events.forEach(e=>{e.status='cancelled';e.rsvps=[];e.venue='';e.safety='';});result={archived:true};
    }else assert(false,'invalid_action','Action not available.');
   }
   team.revision++;
   return {result,audit:{actorId:actor.id,action:'team_'+action,objectId:id}};
  });
 }
 removeMember(team,accountId){
  team.members=team.members.filter(m=>m.accountId!==accountId);
  for(const e of team.events){e.rsvps=e.rsvps.filter(r=>r.accountId!==accountId);this.promote(e);}
 }
 promote(event){
  if(event.status!=='published'||Date.parse(event.startsAt)<=this.clock())return;
  while(event.rsvps.filter(r=>r.status==='confirmed').length<event.capacity){const next=event.rsvps.find(r=>r.status==='waitlisted');if(!next)break;next.status='confirmed';}
 }
 async rsvp(actor,id,eventId,body){
  const b=exactKeys(body,['attending']);assert(typeof b.attending==='boolean','invalid_rsvp','Choose whether to attend.');
  return this.store.updateTeam(id,actor.id,team=>{
   available(team,actor);assert(member(team,actor),'membership_required','Join this team before reserving a place.',403);
   const event=team.events.find(e=>e.id===eventId);
   assert(event&&event.status==='published'&&Date.parse(event.startsAt)>this.clock(),'event_unavailable','This event is not taking reservations.',409);
   const existing=event.rsvps.find(r=>r.accountId===actor.id);
   if(b.attending&&!existing){assert(event.rsvps.length<200,'event_full','This event and its waitlist are full.',409);event.rsvps.push({accountId:actor.id,status:'waitlisted'});}
   if(!b.attending)event.rsvps=event.rsvps.filter(r=>r.accountId!==actor.id);
   this.promote(event);team.revision++;
   return {result:{status:event.rsvps.find(r=>r.accountId===actor.id)?.status||'not_attending'},audit:{actorId:actor.id,action:b.attending?'event_rsvp':'event_leave',objectId:eventId}};
  });
 }
}
