import test from 'node:test';
import assert from 'node:assert/strict';
import {operationDefinition,operationReadiness,operationReport} from '../packages/core/operations.mjs';
const now=Date.now(),task={id:'practice-task',title:'Practice task',active:true,roleId:'network',description:'Read the approved guide.',stopConditions:'Stop if guidance changes.',estimatedMinutes:15,capacity:1,startsAt:new Date(now-1000).toISOString(),endsAt:new Date(now+3600000).toISOString(),materialId:'practice-guide',materialRevision:1,training:[],restricted:false,moduleId:null,moduleRevision:null,toolId:null,reviewers:[]};
const guide={revision:1,status:'published',audience:'volunteer'};
test('typed operations reject mismatched scope, unbounded capacity and personal-data reporting fields',()=>{
 assert.equal(operationDefinition('task',task).capacity,1);
 assert.throws(()=>operationDefinition('task',{...task,capacity:0}));
 assert.throws(()=>operationDefinition('task',{...task,capacity:10001}));
 assert.throws(()=>operationReport({count:1,minutes:3,feedback:'completed',email:'not-allowed@example.test'}));
 assert.throws(()=>operationReport({count:-1,minutes:3,feedback:'completed'}));
 assert.equal(operationReport({count:1,minutes:3,feedback:'completed'}).provenance,'self_reported');
});
test('task readiness binds guide versions, expiry, exact module, real training and tool review',()=>{
 assert.equal(operationReadiness(task,{material:guide},now).allowed,true);
 assert.equal(operationReadiness(task,{material:{...guide,revision:2}},now).allowed,false);
 assert.equal(operationReadiness({...task,active:false},{material:guide},now).allowed,false);
 const restricted={...task,restricted:true,moduleId:'practice-module',moduleRevision:2,toolId:'practice-tool',training:['practice-training']};
 const module={id:'practice-module',revision:2,status:'published',jurisdiction:'CT',election:'2028',activity:'Synthetic practice',validFrom:task.startsAt,validUntil:task.endsAt,training:['practice-training'],approvedTools:['practice-tool'],sources:[{url:'https://example.org/official',checkedAt:new Date(now).toISOString()}],verifiers:[{id:'a',revision:2,evidence:'one'},{id:'b',revision:2,evidence:'two'}],approval:{by:'c',revision:2}};
 const context={material:guide,module,tool:{active:true,reviewUntil:task.endsAt},training:[{id:'practice-training',revision:2,active:true}],attestations:[{trainingId:'practice-training',revision:2,expiresAt:task.endsAt,revoked:false}]};
 assert.equal(operationReadiness(restricted,context,now).allowed,true);
 for(const c of [{...context,attestations:[]},{...context,attestations:[{...context.attestations[0],revision:1}]},{...context,tool:{...context.tool,active:false}},{...context,module:{...module,status:'revoked'}},{...context,module:{...module,revision:3}},{...context,module:{...module,sources:[{...module.sources[0],checkedAt:new Date(now-31*86400000).toISOString()}]}}])assert.equal(operationReadiness(restricted,c,now).allowed,false);
});
