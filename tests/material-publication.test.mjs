import test from 'node:test';import assert from 'node:assert/strict';
import {validateMaterialRelease} from '../packages/core/material-publication.mjs';
const record=()=>({id:'test-guide',title:'Synthetic guide',body:'Test fixture only.',author:'fixture-author',revision:1,audience:'volunteer',status:'published',review:{approvedBy:'fixture-reviewer',revision:1,at:'2026-10-10T00:00:00Z'}});
test('material publication accepts an independently approved revision',()=>assert.equal(validateMaterialRelease([record()]).length,1));
test('material publication rejects an empty release',()=>assert.throws(()=>validateMaterialRelease([])));
test('material publication rejects duplicate IDs',()=>assert.throws(()=>validateMaterialRelease([record(),record()])));
test('material publication rejects self approval',()=>{const m=record();m.review.approvedBy=m.author;assert.throws(()=>validateMaterialRelease([m]));});
test('material publication rejects a stale approval',()=>{const m=record();m.revision=2;assert.throws(()=>validateMaterialRelease([m]));});
test('material publication rejects unreviewed historical material',()=>{const m=record();m.status='unreviewed';m.review=null;assert.throws(()=>validateMaterialRelease([m]));});
