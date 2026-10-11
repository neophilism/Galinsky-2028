#!/usr/bin/env node
// An explicitly reviewed repository change to the *single* request file
// triggers one Render action on a push to the protected main branch.
import {readFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {run,TARGET_PROJECT_ID} from './render-project-preview.mjs';

export function resolveRequest(raw){
 const request=typeof raw==='string'?JSON.parse(raw):raw;
 if(!request||typeof request!=='object'||Array.isArray(request))throw Error('A Render project request object is required.');
 const names=Object.keys(request).sort().join(',');
 if(names!=='action,environmentId,projectId,schemaVersion')throw Error('Unexpected fields in the reviewed Render project request.');
 if(request.schemaVersion!==1||request.projectId!==TARGET_PROJECT_ID)throw Error('Render request does not name the authorized project.');
 if(!['inspect','create'].includes(request.action))throw Error('Unsupported Render project request.');
 if(request.environmentId!==null&&
   (typeof request.environmentId!=='string'||!/^evm-[a-z0-9-]+$/.test(request.environmentId)))
   throw Error('Invalid Render environment ID.');
 return request;
}

export async function executeRequest(raw,{env=process.env,client}={}){
 const req=resolveRequest(raw);
 if(env.GITHUB_ACTIONS==='true'&&(env.GITHUB_REF!=='refs/heads/main'||env.GITHUB_REPOSITORY!=='neophilism/Galinsky-2028'))
  throw Error('Actions must run from the authorized main branch and repository.');
 // No "create" inferred from the environment, workflow input or a broad branch push.
 return run({env:{...env,G28_RENDER_ACTION:req.action,
  G28_RENDER_ENVIRONMENT_ID:req.environmentId||''},client});
}

if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 try{
  const raw=await readFile('ops/render-project-request.json','utf8');
  await executeRequest(raw);
 }catch(error){
  // Deliberately no secret values or Render API response body in logs.
  console.error('Authorized Render project request failed: '+error.message);
  process.exitCode=1;
 }
}
