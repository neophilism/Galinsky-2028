import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,readdirSync} from 'node:fs';
test('source archive is preserved privately and is not published as current',()=>{
 const manifest=JSON.parse(readFileSync('content/materials/archive-manifest.json','utf8'));
 const current=JSON.parse(readFileSync('content/materials/current.json','utf8'));
 const copies=readdirSync('content/materials/source-edition-1').filter(n=>/^\d\d_.+\.md$/.test(n));
 assert.equal(manifest.length,36);
 assert.equal(copies.length,35);
 assert(!copies.some(n=>n.startsWith('35_')),'Do not duplicate the compiled manual');
 for(const x of manifest){
  assert.equal(x.status,'unreviewed');
  assert.equal(x.review,null);
  if(!x.compiled)assert(copies.includes(x.source.filename));
 }
 assert.equal(current.materials.length,0,'Import must not publish historical content');
});
