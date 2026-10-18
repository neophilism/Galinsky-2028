import test from 'node:test';
import assert from 'node:assert/strict';
import {STAFF_ROLES,staffCan,staffScopes} from '../packages/core/staff-permissions.mjs';
test('staff roles never silently inherit treasury, protected decryption or owner authority',()=>{
 for(const role of STAFF_ROLES){
  assert.equal(staffCan(role,'finance:manage'),role==='treasurer');
  assert.equal(staffCan(role,'protected:decrypt'),false);
  assert.equal(staffCan(role,'identity:grant'),false);
 }
 assert.equal(staffCan('editor','content:publish'),false);
 assert.equal(staffCan('publisher','finance:read'),false);
 assert.equal(staffCan('captain','team:manage'),true);
 assert.equal(staffCan('module-verifier','activity:verify'),true);
 assert.equal(staffCan('module-verifier','activity:publish'),false);
 assert.deepEqual(staffScopes('invented-admin'),[]);
 assert.equal(staffCan('owner','identity:grant'),true);
});
