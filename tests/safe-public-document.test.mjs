import test from 'node:test';import assert from 'node:assert/strict';
import {mkdtempSync,writeFileSync,readFileSync,existsSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';import {join} from 'node:path';import {createHash} from 'node:crypto';
import {renderSafePolicyHtml} from '../packages/core/safe-policy-document.mjs';
import {preparePolicyFile,args} from '../scripts/prepare-public-document.mjs';
const sample='# Part One\n\nProposed terms <script>alert("bad")</script>\n\n## Rights\n\nA [verified source](https://agency.gov/law) and [unsafe](javascript:alert(1)) URL.\n\n| Section | Purpose |\n| --- | --- |\n| 1 | speech |\n';
test('generated standalone HTML is accessible and has CSP with no executable source',()=>{
 const html=renderSafePolicyHtml({title:'Kirk–Evers Bill — draft',edition:'Draft 1',source:sample});
 assert.match(html,/name="generator" content="g28-safe-document-v1"/);
 assert.match(html,/http-equiv="Content-Security-Policy"/);
 assert.match(html,/href="#main"/);
 assert.match(html,/<main id="main">/);
 assert.match(html,/<nav aria-label="On this page"/);
 assert.match(html,/<table>/);
 assert.match(html,/href="https:\/\/agency.gov\/law"/);
 assert(!html.includes('href="javascript:'));
 assert(!/<script[\s>]/i.test(html));
 assert(html.includes('&lt;script&gt;alert'));
 assert(html.includes('rel="noopener noreferrer" target="_blank"'));
});
test('the generator rejects missing or too-large content and unsafe editions',()=>{
 for(const source of ['',{},'a'.repeat(200001),'has\0byte'])assert.throws(()=>renderSafePolicyHtml({title:'Bill',source}));
 assert.throws(()=>renderSafePolicyHtml({title:'',source:'body'}));
 assert.throws(()=>renderSafePolicyHtml({title:'Bill',source:'body',edition:'e'.repeat(201)}));
});
test('preparation dry-run never writes, then exclusively creates one predictable file',()=>{
 const root=mkdtempSync(join(tmpdir(),'g28-policy-html-'));
 try{
  const input=join(root,'bill.md'),out=join(root,'documents');writeFileSync(input,sample);
  const config={sourcePath:input,title:'Kirk Evers Bill',fileName:'kirk-evers-bill-v1.html',publicDocumentsRoot:out};
  const dry=preparePolicyFile({...config,write:false});
  assert(!existsSync(out));assert.equal(dry.wrote,false);
  const done=preparePolicyFile({...config,write:true});
  assert(done.wrote);const html=readFileSync(join(out,config.fileName));
  assert.equal(createHash('sha256').update(html).digest('hex'),done.sha256);
  assert.throws(()=>preparePolicyFile({...config,write:true}),/EEXIST/);
 }finally{rmSync(root,{force:true,recursive:true});}
});
test('bad source extension, unsafe filename, duplicate arguments and invalid UTF-8 rejected',()=>{
 const dir=mkdtempSync(join(tmpdir(),'g28-policy-html-neg-'));
 try{
  const source=join(dir,'in.md');writeFileSync(source,Buffer.from([0xff,0xfd]));
  assert.throws(()=>preparePolicyFile({sourcePath:source,title:'Draft',fileName:'kirk-evers-bill-v1.html',publicDocumentsRoot:dir}),/UTF-8/);
  writeFileSync(source,'# safe\n');
  assert.throws(()=>preparePolicyFile({sourcePath:source,title:'Draft',fileName:'../escape.html',publicDocumentsRoot:dir}));
  assert.throws(()=>preparePolicyFile({sourcePath:source,title:'Draft',fileName:'garden.html',publicDocumentsRoot:dir}));
  assert.throws(()=>args(['--source','a.md','--source','b.md','--title','t','--filename','kirk-evers-bill-v1.html']));
 }finally{rmSync(dir,{force:true,recursive:true});}
});
