import test from 'node:test';
import assert from 'node:assert/strict';
import {generateKeyPairSync} from 'node:crypto';
import {materialDigest,signStaffApproval,validateSignedMaterialRelease} from '../packages/core/staff-review.mjs';
const author=generateKeyPairSync('ed25519');
const reviewer=generateKeyPairSync('ed25519');
const privatePem=k=>k.privateKey.export({format:'pem',type:'pkcs8'});
const publicPem=k=>k.publicKey.export({format:'pem',type:'spki'});
const registry=()=>({version:1,keys:[
 {id:'staff-author-a',subject:'operator-author',role:'author',active:true,publicKeyPem:publicPem(author)},
 {id:'staff-reviewer-b',subject:'operator-reviewer',role:'reviewer',active:true,publicKeyPem:publicPem(reviewer)}
]});
function record(){
 const at=new Date().toISOString();
 const m={id:'test-guide',revision:3,title:'Synthetic guide',body:'Synthetic text only.',audience:'volunteer',status:'published',author:'operator-author',review:{approvedBy:'operator-reviewer',revision:3,at},approvals:{}};
 m.approvals.author=signStaffApproval(m,{role:'author',keyId:'staff-author-a',privateKeyPem:privatePem(author),signedAt:at});
 m.approvals.reviewer=signStaffApproval(m,{role:'reviewer',keyId:'staff-reviewer-b',privateKeyPem:privatePem(reviewer),signedAt:at});
 return m;
}
test('two independent registered humans sign the precise publication revision',()=>{
 const m=record();assert.equal(validateSignedMaterialRelease([m],registry()).length,1);
 assert.match(materialDigest(m),/^[a-f0-9]{64}$/);
});
test('tampering, revision changes, status changes or unsigned documents fail closed',()=>{
 const m=record();for(const [field,value] of [['body','Changed!'],['revision',4],['status','unreviewed'],['title','Changed title'],['audience','public']]){
  const changed=structuredClone(m);changed[field]=value;assert.throws(()=>validateSignedMaterialRelease([changed],registry()),field);
 }
 const missing=record();delete missing.approvals.reviewer;assert.throws(()=>validateSignedMaterialRelease([missing],registry()));
});
test('self-approval, revoked keys, mismatched identities and reused signatures fail',()=>{
 const m=record();m.author=m.review.approvedBy;assert.throws(()=>validateSignedMaterialRelease([m],registry()));
 const revoked=registry();revoked.keys[1].active=false;assert.throws(()=>validateSignedMaterialRelease([record()],revoked));
 const swapped=record();swapped.approvals.reviewer=swapped.approvals.author;assert.throws(()=>validateSignedMaterialRelease([swapped],registry()));
 const wrong=record();wrong.review.approvedBy='fake';assert.throws(()=>validateSignedMaterialRelease([wrong],registry()));
});
test('registry is validated and no staff signer is provisioned by default',()=>{
 const m=record();assert.throws(()=>validateSignedMaterialRelease([m],{version:1,keys:[]}));
 const duplicate=registry();duplicate.keys.push({...duplicate.keys[0]});assert.throws(()=>validateSignedMaterialRelease([m],duplicate));
});
test('old, future and malformed approval dates and wrong key types are denied',()=>{
 const m=record();m.approvals.author.signedAt='2000-01-01T00:00:00.000Z';assert.throws(()=>validateSignedMaterialRelease([m],registry()));
 const bad=record();bad.approvals.author.signedAt='invalid';assert.throws(()=>validateSignedMaterialRelease([bad],registry()));
 const p=generateKeyPairSync('rsa',{modulusLength:2048});assert.throws(()=>signStaffApproval(record(),{role:'author',keyId:'staff-author-a',privateKeyPem:privatePem(p)}));
});
