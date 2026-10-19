import {assert,exactKeys} from './validation.mjs';
export const TREASURY_EXPORT_NOTICE='Ledger review data only. Captured payments are not reconciled bank deposits. Period totals are not an opening/closing balance, accepted filing, donor eligibility determination or authorization to charge/refund.';
export function treasuryExportRequest(input){
 const b=exactKeys(input,['from','until','format','purpose','confirm']);
 const iso=x=>typeof x==='string'&&/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d(?:\.\d{3})?Z$/.test(x)&&Number.isFinite(Date.parse(x))&&new Date(x).toISOString()===x.replace(/(?<!\.\d{3})Z$/,'.000Z');
 assert(iso(b.from)&&iso(b.until)&&Date.parse(b.until)>Date.parse(b.from)&&Date.parse(b.until)-Date.parse(b.from)<=366*86400000,'invalid_export_range','Choose an exact UTC period no longer than 366 days.');
 assert(['csv','json'].includes(b.format)&&['reconciliation','authorized_review'].includes(b.purpose)&&b.confirm==='export treasury ledger','export_confirmation','Choose the format, purpose and explicit export confirmation.');
 return {from:new Date(b.from).toISOString(),until:new Date(b.until).toISOString(),format:b.format,purpose:b.purpose};
}
const money=n=>{const v=Number(n);assert(Number.isSafeInteger(v)&&v>0&&v<=100000000,'invalid_export_source','A ledger amount is invalid.',409);return v;};
export function treasuryExportDocument(rows,range,generatedAt=new Date().toISOString()){
 assert(Array.isArray(rows)&&rows.length<=10000,'export_too_large','Narrow the export period to at most 10,000 records.',409);
 const totals=Object.create(null),seen=new Set(),events=[];
 for(const r of rows){
  assert(typeof r.provider==='string'&&/^[a-zA-Z0-9_-]{1,128}$/.test(r.provider)&&typeof r.event_id==='string'&&/^[a-zA-Z0-9_-]{1,128}$/.test(r.event_id)&&typeof r.payment_id==='string'&&/^[a-zA-Z0-9_-]{1,128}$/.test(r.payment_id)&&/^[a-f0-9]{64}$/.test(r.event_digest)&&['captured','partially_refunded','refunded','disputed'].includes(r.event_kind),'invalid_export_source','Ledger source validation failed.',409);
  assert(Number.isFinite(+new Date(r.occurred_at)),'invalid_export_source','A ledger date is invalid.',409);
  const occurredAt=new Date(r.occurred_at).toISOString();assert(Date.parse(occurredAt)>=Date.parse(range.from)&&Date.parse(occurredAt)<Date.parse(range.until),'invalid_export_source','A source row falls outside the requested period.',409);
  const unique=JSON.stringify([r.provider,r.event_id]);assert(!seen.has(unique),'duplicate_export_source','Duplicate ledger events cannot be exported.',409);seen.add(unique);
  const amountCents=money(r.amount_cents);totals[r.provider]??={capturedCents:0,refundedCents:0,disputedCents:0,events:0};
  const t=totals[r.provider];t.events++;t[r.event_kind==='captured'?'capturedCents':r.event_kind==='disputed'?'disputedCents':'refundedCents']+=amountCents;
  events.push({provider:r.provider,eventId:r.event_id,paymentId:r.payment_id,kind:r.event_kind,amountCents,occurredAt,evidenceDigest:r.event_digest});
 }
 return {schemaVersion:1,generatedAt,range:{from:range.from,until:range.until},purpose:range.purpose,events,totals,notice:TREASURY_EXPORT_NOTICE};
}
export function csvCell(value){let s=String(value);if(/^[\s\u0000-\u001f\u007f\ufeff]*[=+@-]/u.test(s))s="'"+s;return '"'+s.replaceAll('"','""')+'"';}
export function treasuryExportBytes(document,format){
 if(format==='json')return JSON.stringify(document,null,2)+'\n';
 assert(format==='csv','invalid_export_format','Choose CSV or JSON.');
 const rows=[['row_type','provider','event_id','payment_id','kind','amount_cents','occurred_at','evidence_digest']];
 for(const e of document.events)rows.push(['event',e.provider,e.eventId,e.paymentId,e.kind,e.amountCents,e.occurredAt,e.evidenceDigest]);
 for(const [provider,t]of Object.entries(document.totals))for(const kind of ['capturedCents','refundedCents','disputedCents'])rows.push(['period_total',provider,'','',kind,t[kind],'','']);
 return rows.map(r=>r.map(csvCell).join(',')).join('\r\n')+'\r\n';
}
