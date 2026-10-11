import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
test('live acceptance uses read-only access and encrypted password secret',()=>{
 const t=readFileSync('scripts/verify-live-volunteer-entry.mjs','utf8');
 assert(t.includes("const PUBLIC='https://galinsky-2028-private-preview.onrender.com'"));
 assert(t.includes("const PORTAL='https://galinsky-2028-volunteer-portal.onrender.com'"));
 assert(t.includes('G28_PREVIEW_ACCESS_PASSWORD'));
 assert(t.includes('signupEnabled,false'));
 assert(t.includes("await get(PORTAL,'/readyz')"));
 assert(!t.includes("method:'POST'"));
 assert(!t.includes('console.log(password)'));
});
