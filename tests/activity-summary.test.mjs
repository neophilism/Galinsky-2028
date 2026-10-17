import test from 'node:test';import assert from 'node:assert/strict';
import {summarizePublishedModule} from '../packages/core/activity-summary.mjs';
const now=new Date('2026-10-17T12:00:00Z');
const base={id:'fixture-training',revision:1,status:'published',jurisdiction:'CT',election:'2028 General',activity:'Synthetic training',validFrom:'2026-10-17T01:00:00Z',validUntil:'2026-10-18T01:00:00Z',
 verifiers:[{id:'do-not-show-one',revision:1,evidence:'reviewed'},{id:'do-not-show-two',revision:1,evidence:'reviewed'}],
 approval:{by:'private-approver',revision:1},
 approvedTools:['private-tool'],training:['sensitive-training-id'],sources:[{url:'https://example.org/official',checkedAt:'2026-10-17'}]};
test('current published module projects only fixed safe fields, never an action grant',()=>{
 const s=summarizePublishedModule(base,now);
 assert.equal(s.publishedCurrent,true);assert.equal(s.activityAuthorized,false);
 assert.equal(s.requiredTrainingCount,1);
 for(const word of ['do-not-show','private-tool','private-approver','sensitive-training-id','https://example.org'])assert(!JSON.stringify(s).includes(word));
});
test('draft, unsafe, expired and incompletely reviewed modules remain absent/inactive',()=>{
 assert.equal(summarizePublishedModule({...base,status:'draft'},now),null);
 assert.equal(summarizePublishedModule({...base,activity:'<script>'},now),null);
 assert.equal(summarizePublishedModule({...base,validUntil:'invalid'},now),null);
 assert.equal(summarizePublishedModule({...base,validUntil:'2026-10-17T11:00:00Z'},now)?.publishedCurrent,false);
 assert.equal(summarizePublishedModule({...base,verifiers:[]},now)?.publishedCurrent,false);
});
