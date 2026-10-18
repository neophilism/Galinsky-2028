import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {CAMPAIGN_MODE_SCRIPT} from '../packages/core/campaign-mode.mjs';
test('system appearance changes are observed while the document is still loading',()=>{
 const handlers={},redirects=[],root={dataset:{campaignModeEnabled:'true',campaignPreference:'system',campaignMode:'night'},style:{}},query={matches:true,addEventListener:(name,fn)=>{handlers[name]=fn;}};
 const location={href:'https://example.test/?appearance=system&scheme=night',pathname:'/',search:'?appearance=system&scheme=night',protocol:'https:',replace:url=>redirects.push(url)};
 const document={documentElement:root,readyState:'loading',cookie:'',addEventListener:()=>{},querySelector:()=>null};
 vm.runInNewContext(CAMPAIGN_MODE_SCRIPT,{document,window:{matchMedia:()=>query},location,URL});
 assert.equal(typeof handlers.change,'function');assert.equal(redirects.length,0);
 query.matches=false;handlers.change();assert.equal(redirects.length,1);assert(redirects[0].includes('scheme=day'));
});
