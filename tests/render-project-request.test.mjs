import test from 'node:test';
import assert from 'node:assert/strict';
import {resolveRequest,executeRequest} from '../scripts/render-project-request.mjs';

const req={schemaVersion:1,projectId:'prj-db57fnm7bikc739783q0',action:'inspect',environmentId:null};
test('only the exact Galinsky project and explicit action are accepted',()=>{
 assert.deepEqual(resolveRequest(JSON.stringify(req)),req);
 for(const bad of [{...req,projectId:'prj-wrong'}, {...req,action:'delete'},
  {...req,action:''},{...req,schemaVersion:2},{...req,other:'field'},{...req,environmentId:'random'}])
  assert.throws(()=>resolveRequest(bad),JSON.stringify(bad));
});
test('GitHub Actions rejects a wrong repository or branch before touching Render',async()=>{
 for(const changed of [{GITHUB_REF:'refs/heads/other'},{GITHUB_REPOSITORY:'someone/other'}]){
  const env={GITHUB_ACTIONS:'true',GITHUB_REF:'refs/heads/main',GITHUB_REPOSITORY:'neophilism/Galinsky-2028',
   G28_RENDER_API_KEY:'synthetic-api-key-long-enough',...changed};
  await assert.rejects(()=>executeRequest(req,{env,client:()=>{throw Error('Unexpected Render API call');}}),/authorized main/);
 }
});
test('inspection uses only GET for verified project and its environment',async()=>{
 const operations=[],log=console.log;console.log=()=>{};
 const fake=async(method,path)=>{
  operations.push(method+' '+path);
  if(path==='/projects/prj-db57fnm7bikc739783q0')return {id:req.projectId,owner:{id:'tea-a123456789'},environmentIds:['evm-a123456789'],name:'Campaign'};
  if(path==='/environments/evm-a123456789')return {id:'evm-a123456789',projectId:req.projectId,name:'Preview'};
  throw Error('Unexpected Render request');
 };
 try{
  await executeRequest(req,{env:{G28_RENDER_API_KEY:'synthetic-api-key-long-enough'},client:fake});
  assert.deepEqual(operations,['GET /projects/'+req.projectId,'GET /environments/evm-a123456789']);
 }finally{console.log=log;}
});
