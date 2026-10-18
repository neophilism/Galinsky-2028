import {databasePool} from '../api/src/postgres-store.mjs';
import {parseVisitorPayload} from '../../packages/core/visitor-analytics.mjs';

function respond(res,status){
 res.statusCode=status;
 res.setHeader('Cache-Control','private, no-store, max-age=0');
 res.setHeader('Content-Length','0');
 res.end();
}
export class PostgresVisitorWriter{
 constructor(pool){this.pool=pool;}
 async ingest(event){
  if(event.events){
   await this.pool.query('SELECT g28.ingest_page_events($1::uuid,$2::text,$3::jsonb)',
    [event.viewId,event.path,JSON.stringify(event.events)]);
  }else{
   await this.pool.query('SELECT g28.ingest_page_visit($1::uuid,$2::text,$3::text,$4::integer)',
    [event.viewId,event.path,event.action,event.seconds]);
  }
 }
}
// The preview gate must authorize requests before this handler. Web DB role
// must have only EXECUTE on the guarded ingestion function.
export function createVisitorCollector({env=process.env,store=null,poolFactory=databasePool}={}){
 const enabled=env.G28_VISITOR_ANALYTICS_ENABLED==='true';
 if(!enabled)return {enabled:false,handle:async()=>false,close:async()=>{}};
 if(!store&&!env.G28_VISITOR_ANALYTICS_DATABASE_URL)
  throw Error('Visitor analytics requires its separate restricted database credential.');
 const configured=env.G28_VISITOR_ANALYTICS_ORIGIN||env.PUBLIC_ORIGIN;
 let expected;
 try{
  const url=new URL(configured);
  if(url.username||url.password||url.pathname!=='/'||url.search||url.hash||
   !['https:','http:'].includes(url.protocol)||
   (env.NODE_ENV==='production'&&url.protocol!=='https:'))throw Error('origin');
  expected=url.origin;
 }catch{throw Error('Visitor analytics requires a valid first-party origin.');}
 const pool=store?null:poolFactory(env.G28_VISITOR_ANALYTICS_DATABASE_URL);
 const writer=store||new PostgresVisitorWriter(pool);
 const limits=new Map();let accepted=0,globalMinute={at:Date.now(),count:0};
 return{
  enabled:true,
  async handle(req,res,pathname){
   if(pathname!=='/api/visitor-analytics')return false;
   if(req.method!=='POST'){res.setHeader('Allow','POST');respond(res,405);return true;}
   if(req.headers.origin!==expected||
    (req.headers['sec-fetch-site']&&!['same-origin','none'].includes(req.headers['sec-fetch-site']))){
    respond(res,403);return true;
   }
   if(!/^application\/json(?:;|$)/i.test(req.headers['content-type']||'')){
    respond(res,415);return true;
   }
   // Rate limits use only an ephemeral page-view ID after validation.
   // Proxy IPs may be shared among legitimate visitors; no address key is kept.
   let raw='',event;
   try{
    for await(const chunk of req){
     raw+=chunk.toString('utf8');
     if(Buffer.byteLength(raw)>8192){respond(res,413);return true;}
    }
    event=parseVisitorPayload(JSON.parse(raw));
   }catch{respond(res,400);return true;}
   const now=Date.now(),key=event.viewId;
   if(now-globalMinute.at>=60000)globalMinute={at:now,count:0};
   if(++globalMinute.count>12000){respond(res,429);return true;}
   let bucket=limits.get(key);
   if(!bucket||now-bucket.at>=60000){bucket={at:now,count:0};limits.set(key,bucket);}
   if(++bucket.count>120){respond(res,429);return true;}
   if(++accepted%500===0){
    for(const [id,value] of limits)if(now-value.at>=60000)limits.delete(id);
    if(limits.size>12000)limits.clear();
   }
   try{await writer.ingest(event);respond(res,204);}
   catch{
    // Never log event IDs, addresses, paths, headers or database errors.
    console.error(JSON.stringify({event:'visitor_analytics_ingest_unavailable'}));
    respond(res,503);
   }
   return true;
  },
  async close(){if(pool)await pool.end();}
 };
}
