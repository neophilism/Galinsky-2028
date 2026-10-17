import test from 'node:test';
import assert from 'node:assert/strict';
import {publicOrientation,evaluateOrientation,ORIENTATION_REVISION,ORIENTATION_COMPLETION_ID} from '../packages/core/orientation.mjs';
const good={revision:ORIENTATION_REVISION,answers:{'current-guides':'no','personal-details':'own-notes','outdated-content':'verify'}};
test('public orientation hides correct choices and pins revision',()=>{
 const o=publicOrientation();
 assert.equal(o.revision,ORIENTATION_REVISION);
 assert.equal(ORIENTATION_COMPLETION_ID,'orientation-first-hour-v1');
 assert.equal(o.questions.length,3);
 assert(!JSON.stringify(o).includes('"correct"'));
});
test('only all valid, correct choices pass without granting permission',()=>{
 assert.deepEqual(evaluateOrientation(good),{passed:true,missed:[],activityAuthorized:false,verified:false});
 assert.deepEqual(evaluateOrientation({...good,answers:{...good.answers,'current-guides':'yes'}}).missed,['current-guides']);
 for(const broken of [
  {...good,revision:'old'},
  {...good,answers:{'current-guides':'no'}},
  {...good,answers:{...good.answers,admin:'yes'}},
  {...good,answers:{...good.answers,'outdated-content':'not-a-choice'}},
  {...good,answers:null},
  {...good,extra:true}
 ])assert.throws(()=>evaluateOrientation(broken));
});
