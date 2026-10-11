import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
test('deployment blueprint never publishes a public static site or auto-deploys',()=>{
 const yaml=readFileSync('render.yaml','utf8');
 assert.match(yaml,/runtime: node/);
 assert.match(yaml,/startCommand: npm run preview:serve/);
 assert.match(yaml,/autoDeployTrigger: off/);
 assert.match(yaml,/PREVIEW_ACCESS_PASSWORD\n\s+sync: false/);
 assert.doesNotMatch(yaml,/runtime: static|staticPublishPath:/);
});
test('protected preview is the documented only approved deployment path',()=>{
 const doc=readFileSync('docs/operations/PRIVATE_PASSWORD_PREVIEW.md','utf8');
 assert.match(doc,/Web Service/);
 assert.match(doc,/not a Static Site|NOT Static Site/i);
 assert.match(doc,/does not|DOES NOT|not an?/i);
 assert.match(doc,/Phillip.s workspace/);
 assert.match(doc,/soft-bread-25523698/);
});
