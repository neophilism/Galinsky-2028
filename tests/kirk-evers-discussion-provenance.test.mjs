import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,readdirSync} from 'node:fs';
import {join} from 'node:path';
import {renderPage,root,site} from '../scripts/public-renderer.mjs';

test('Kirk-Evers discussion draft is available only to reviewers, not public release',()=>{
 const source=readFileSync(join(root,'content/policies/source/kirk-evers-discussion-2026-09-10.txt'),'utf8');
 assert(source.includes('DISCUSSION DRAFT'));
 assert(source.includes('2026-09-10'));
 assert(source.length>90000);
 assert.equal(site.issues['kirk-evers'].documents.length,0,'Unapproved draft must not become public bill download');
 const html=renderPage('kirk-evers');
 assert(!html.includes('kirk-evers-discussion-2026-09-10.txt'));
 assert(!html.includes('src="/content/policies'));
 const paths=readdirSync(join(root,'apps/web/public/assets'));
 assert(!paths.includes('kirk-evers-discussion-2026-09-10.txt'));
});
