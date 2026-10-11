import test from 'node:test';import assert from 'node:assert/strict';
import {parseMaterialMarkdown,materialLinks} from '../packages/core/material-outline.mjs';
test('long document yields stable, deduplicated and readable section links',()=>{
 const body='# Welcome\nText after a title without a blank separator.\n\n## Procedures\n\n- Step one\n- Step two\n\n## Procedures\n\nEnd';
 const parsed=parseMaterialMarkdown(body);
 assert.deepEqual(parsed.headings.map(h=>h.id),['welcome','procedures','procedures-2']);
 assert.deepEqual(parsed.blocks.map(b=>b.type),['heading','paragraph','heading','ul','heading','paragraph']);
 assert.deepEqual(parsed.blocks[3].items,['Step one','Step two']);
});
test('preserves code, quotes, numbered lists, tables and plain-text script tags',()=>{
 const body='1. First\n2. Second\n\n> Say what you know\n\n```sh\necho hi\n```\n\n| Field | Meaning |\n| --- | --- |\n| status | pending |\n\n<script>alert(1)</script>';
 const p=parseMaterialMarkdown(body);
 assert.deepEqual(p.blocks.map(b=>b.type),['ol','quote','code','table','paragraph']);
 assert.deepEqual(p.blocks[3].rows,[['status','pending']]);
 assert.equal(p.blocks[4].text,'<script>alert(1)</script>');
});
test('rejects unbounded input and keeps non-ASCII heading IDs stable',()=>{
 assert.throws(()=>parseMaterialMarkdown({}));
 assert.throws(()=>parseMaterialMarkdown('x'.repeat(100001)));
 assert.equal(parseMaterialMarkdown('# Justicia para todos').headings[0].id,'justicia-para-todos');
});
test('inline source links are safe and leave invalid Markdown as literal text',()=>{
 const good=materialLinks('Official [source](https://agency.gov/rule) and [issue](/issues/garden/)');
 assert.equal(good.filter(v=>v.type==='link').length,2);
 assert.equal(good.find(v=>v.type==='link').url,'https://agency.gov/rule');
 assert.equal(good.find(v=>v.type==='link'&&!v.external)?.url,'/issues/garden/');
 for(const bad of ['[bad](javascript:alert(1))','[bad](//evil.test)','[bad](http://example.com)','[bad](https://user@evil.test)','[bad](/../admin)']){
  assert.equal(materialLinks(bad).some(v=>v.type==='link'),false,bad);
 }
});
