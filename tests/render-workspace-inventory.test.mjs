import test from 'node:test';
import assert from 'node:assert/strict';
import {organize} from '../scripts/render-workspace-inventory.mjs';
const owner='tea-db23jkks728c73av263g';
const projects=[
 {id:'prj-first',name:'Project One',owner:{id:owner},environmentIds:['evm-first']},
 {id:'prj-empty',name:'Empty Project',owner:{id:owner},environmentIds:['evm-empty']}
];
const environments=[
 {id:'evm-first',name:'Production',projectId:'prj-first',serviceIds:['srv-a','srv-b']},
 {id:'evm-empty',name:'Production',projectId:'prj-empty',serviceIds:[]}
];
const services=[
 {id:'srv-a',name:'A',ownerId:owner,type:'web_service',repo:'https://github.com/example/a',serviceDetails:{plan:'free',url:'https://a.onrender.com'},suspended:'not_suspended'},
 {id:'srv-b',name:'B',ownerId:owner,type:'static_site',serviceDetails:{url:'https://b.onrender.com'},suspended:'not_suspended'},
 {id:'srv-unassigned',name:'Unassigned',ownerId:owner,type:'web_service'}
];
test('groups all services under exact Render projects and retains project with no services',()=>{
 const x=organize({projects,environments,services});
 assert.equal(x.serviceCount,3);
 assert.equal(x.projectCount,2);
 assert.deepEqual(x.projects.find(p=>p.id==='prj-first').environments[0].services.map(s=>s.name),['A','B']);
 assert.equal(x.projects.find(p=>p.id==='prj-empty').environments[0].services.length,0);
 assert.equal(x.unassigned[0].name,'Unassigned');
});
test('rejects incomplete, cross-workspace and contradictory service mappings',()=>{
 assert.throws(()=>organize({projects,environments,services:[{...services[0],ownerId:'other'}]}));
 assert.throws(()=>organize({projects,environments,services:[{...services[0],environmentId:'evm-other'}]}));
 assert.throws(()=>organize({projects:[{...projects[0],owner:{id:'other'}}],environments:[],services:[]}));
 assert.throws(()=>organize({projects,environments:[{...environments[0],projectId:'prj-other'}],services:[]}));
});
