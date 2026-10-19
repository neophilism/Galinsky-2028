import test from 'node:test';
import assert from 'node:assert/strict';
import {treasuryExportRequest,treasuryExportDocument,treasuryExportBytes,csvCell} from '../packages/core/treasury-export.mjs';
const input={from:'2026-10-01T00:00:00Z',until:'2026-11-01T00:00:00Z',format:'csv',purpose:'reconciliation',confirm:'export treasury ledger'};
const row=(id,kind,amount,provider='stripe-test')=>({provider,event_id:id,payment_id:'synthetic-payment',event_kind:kind,event_digest:'a'.repeat(64),amount_cents:amount,occurred_at:new Date('2026-10-18T12:00:00Z')});
test('bounded treasury exports preserve exact source identity, totals and explicit review limitations',()=>{
 const range=treasuryExportRequest(input),document=treasuryExportDocument([row('one','captured','1000'),row('two','partially_refunded',100),row('three','disputed',500)],range);
 assert.deepEqual(document.totals['stripe-test'],{capturedCents:1000,refundedCents:100,disputedCents:500,events:3});assert(document.notice.includes('not reconciled bank deposits'));
 const csv=treasuryExportBytes(document,'csv');assert(csv.startsWith('"row_type","provider"'));assert(csv.includes('"period_total","stripe-test","","","refundedCents","100"'));assert(csv.endsWith('\r\n'));
 assert.deepEqual(JSON.parse(treasuryExportBytes(document,'json')).events[0],document.events[0]);
 assert.throws(()=>treasuryExportDocument([row('one','captured',100),row('one','captured',100)],range));assert.throws(()=>treasuryExportDocument([row('one','captured',-1)],range));assert.throws(()=>treasuryExportDocument(Array(10001).fill(row('one','captured',100)),range));
 for(const changed of [{confirm:'yes'},{from:'2026-02-30T00:00:00Z'},{until:'2030-01-01T00:00:00Z'},{format:'fec-file'},{donorEmail:'not-allowed@example.test'}])assert.throws(()=>treasuryExportRequest({...input,...changed}));
});
test('CSV escapes executable formulas, control prefixes, commas and quotes; provider keys never alter prototypes',()=>{
 for(const text of ['=1+1','+1+1','-1+1','@SUM(A1:A2)','\t=1+1','\r\n=1+1','\ufeff=1+1'])assert(csvCell(text).startsWith('"\''));assert.equal(csvCell('a,"b"'),'"a,""b"""');
 const document=treasuryExportDocument([row('one','captured',100,'__proto__')],treasuryExportRequest(input));assert.equal(document.totals.__proto__.capturedCents,100);assert.equal(Object.prototype.capturedCents,undefined);
 assert(treasuryExportBytes(treasuryExportDocument([row('one','captured',100,'-formula')],treasuryExportRequest(input)),'csv').includes('"\'-formula"'));
});
