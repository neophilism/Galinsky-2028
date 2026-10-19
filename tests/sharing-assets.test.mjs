import test from 'node:test';import assert from 'node:assert/strict';
import {sharingDocument,sharingPublishable,sharingDestination,sharingCardHtml} from '../packages/core/sharing-assets.mjs';
const doc=()=>({schemaVersion:1,issue:'garden',title:'Synthetic card',imagePath:'/assets/candidate.webp',alt:'Synthetic portrait',caption:'Synthetic caption',disclaimer:'Synthetic test only',usageTerms:'Synthetic use only',attribution:'Synthetic attribution',rightsReferenceUrl:'https://license.example.test/terms',rightsApproved:true,expiresAt:new Date(Date.now()+86400000).toISOString()});
test('sharing publication requires explicit rights, valid expiry and bounded public fields',()=>{
 assert.equal(sharingPublishable(doc()).issue,'garden');
 for(const change of [{issue:'other'},{supporterEmail:'private@example.test'},{imagePath:'https://elsewhere.example/track.png'},{rightsReferenceUrl:'https://person:secret@license.example.test'},{rightsReferenceUrl:'https://license.example.test/?token=secret'},{expiresAt:'2026-99-99T00:00:00.000Z'},{disclaimer:''}])assert.throws(()=>sharingDocument({...doc(),...change}));
 for(const change of [{rightsApproved:false},{expiresAt:new Date(Date.now()-1000).toISOString()},{expiresAt:new Date(Date.now()+367*86400000).toISOString()}])assert.throws(()=>sharingPublishable({...doc(),...change}));
});
test('print cards escape public text and use exact canonical issue destinations without private tokens',()=>{
 const d={...doc(),title:'<script>synthetic</script>',caption:'<img onerror="bad">'};
 const html=sharingCardHtml({id:'00000000-0000-4000-8000-000000000001',revision:2,document:d},'https://campaign.example.test');
 assert(html.includes('&lt;script&gt;synthetic&lt;/script&gt;'));assert(!html.includes('<img onerror='));assert(html.includes('data-card-qr="https://campaign.example.test/issues/garden/"'));assert(html.includes(d.disclaimer));assert(html.includes(d.usageTerms));assert(html.includes('Asset revision 2'));
 for(const canonical of ['http://campaign.example.test','https://user:secret@campaign.example.test','https://campaign.example.test/path','https://campaign.example.test/?tracking=1'])assert.throws(()=>sharingDestination('garden',canonical));
});
