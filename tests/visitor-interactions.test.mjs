import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {parseInteraction,parseVisitorPayload,VISITOR_ACTIONS,visitorPage} from '../packages/core/visitor-analytics.mjs';
import {visitorReport} from '../apps/api/src/visitor-report.mjs';
const action={seq:1,kind:'link_click',target:'l1',detail:'portal',amount:0};
const viewId=randomUUID();
test('schema permits meaningful anonymous actions only',()=>{
 assert(VISITOR_ACTIONS.includes('accordion_open'));
 assert.deepEqual(parseInteraction(action),action);
 assert.deepEqual(parseInteraction({...action,kind:'button_click',target:'b2',detail:'none'}),{...action,kind:'button_click',target:'b2',detail:'none'});
 assert.deepEqual(parseInteraction({...action,kind:'click_heatmap',target:'p0',detail:'none',amount:399}),{...action,kind:'click_heatmap',target:'p0',detail:'none',amount:399});
 assert.deepEqual(parseInteraction({...action,kind:'scroll_depth',target:'p0',detail:'d90'}),{...action,kind:'scroll_depth',target:'p0',detail:'d90'});
 assert.deepEqual(parseInteraction({...action,kind:'share',target:'b1',detail:'none'}),{...action,kind:'share',target:'b1',detail:'none'});
 for(const bad of [
  {...action,kind:'keystroke'}, {...action,target:'email@example.test'}, {...action,target:'l0'},
  {...action,detail:'https://example.test/?id=1'}, {...action,detail:'owner@other.test'},
  {...action,amount:1}, {...action,seq:2001}, {...action,sequence:1},
  {...action,kind:'section_time',target:'s1',amount:61}, {...action,kind:'click_heatmap',target:'p0',amount:400},
  {...action,kind:'scroll_depth',target:'p0',detail:'other'},
  {...action,kind:'accordion_open',target:'l1'}])assert.throws(()=>parseInteraction(bad));
});
test('batch parser rejects identity fields, arbitrary URLs, duplicate or excessive event volume',()=>{
 const payload={path:'/',viewId,events:[action,{...action,seq:2,kind:'accordion_open',target:'a3',detail:'none'}]};
 assert.deepEqual(parseVisitorPayload(payload),payload);
 assert.equal(visitorPage('/issues/garden/'),'/issues/garden/');
 for(const bad of [
  {...payload,email:'private'}, {...payload,referrer:'http://example.test'},
  {...payload,path:'/admin'}, {...payload,viewId:'persistent-browser-id'},
  {...payload,events:[]}, {...payload,events:[action,action]},
  {...payload,events:Array.from({length:17},(_,i)=>({...action,seq:i+1}))},
  {...payload,events:[{...action,detail:'secret-input'}]}])assert.throws(()=>parseVisitorPayload(bad));
 assert.throws(()=>visitorPage('/api/admin/visitors'));
});
test('aggregate report in development cannot claim individual visitors',async()=>{
 const result=await visitorReport({},'week','/issues/');
 assert.equal(result.source,'synthetic_memory_store');
 assert.equal(result.selectedPage,'/issues/');
 assert.deepEqual(result.interactions,[]);
 assert.deepEqual(result.clickHeatmap,[]);
 assert.equal(result.activity.clicks,0);
});
