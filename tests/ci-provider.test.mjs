import test from 'node:test';
import assert from 'node:assert/strict';
import {existsSync,readFileSync} from 'node:fs';

test('public Galinsky 2028 repository uses GitHub Actions, not CircleCI',()=>{
 assert.equal(existsSync('.circleci/config.yml'),false,'CircleCI configuration must not be reintroduced');
 const workflow=readFileSync('.github/workflows/ci.yml','utf8');
 assert.match(workflow,/runs-on:\s*ubuntu-latest/);
 assert.match(workflow,/pull_request:/);
 assert.match(workflow,/npm run test:api/);
 assert.match(workflow,/npm run test:browser/);
 assert.match(workflow,/npm run secrets:check/);
});
