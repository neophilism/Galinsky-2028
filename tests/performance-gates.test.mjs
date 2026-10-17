import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

test('local, GitHub Actions and CircleCI all enforce public asset budgets',()=>{
 const scripts=JSON.parse(readFileSync('package.json','utf8')).scripts;
 assert.equal(scripts['perf:budget'],'node scripts/performance-budget.mjs');
 const local=readFileSync('scripts/verify.mjs','utf8');
 const github=readFileSync('.github/workflows/ci.yml','utf8');
 const circle=readFileSync('.circleci/config.yml','utf8');
 for(const [name,body] of [['local',local],['GitHub Actions',github],['CircleCI',circle]]){
  assert.match(body,/perf:budget/,name+' missing performance budget gate');
  assert(body.indexOf('perf:budget')>body.indexOf('build'),name+' must build before enforcing budget');
 }
});
