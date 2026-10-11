import test from 'node:test';
import assert from 'node:assert/strict';
import {validateRequest,DELETE_IDS} from '../scripts/render-workspace-cleanup.mjs';
test('accepts exactly five approved service IDs for audit and delete',()=>{
 const q={workspaceId:'tea-db23jkks728c73av263g',serviceIds:[...DELETE_IDS]};
 assert.equal(validateRequest({...q,action:'audit'}).action,'audit');
 assert.equal(validateRequest({...q,action:'delete'}).action,'delete');
});
test('rejects other workspaces, operations, service IDs and surplus fields',()=>{
 const good={workspaceId:'tea-db23jkks728c73av263g',serviceIds:[...DELETE_IDS],action:'audit'};
 for(const invalid of [
 {...good,workspaceId:'tea-wrong'}, {...good,action:'deleteAll'},
 {...good,serviceIds:[...DELETE_IDS,'srv-bad']},
 {...good,serviceIds:DELETE_IDS.slice(1)}, {...good,extra:'bad'}
 ])assert.throws(()=>validateRequest(invalid));
});
