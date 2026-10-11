import test from 'node:test';
import assert from 'node:assert/strict';
import {validateRequest,createSpec,PORTAL_URL,PUBLIC_URL,PORTAL_NAME} from '../scripts/render-portal-request.mjs';
const r={schemaVersion:1,action:'inspect',projectId:'prj-db57fnm7bikc739783q0',environmentId:'evm-db57fnm7bikc739783qg',ownerId:'tea-db23jkks728c73av263g',serviceName:PORTAL_NAME};
test('exact Render authorization requires the assigned project, owner and environment',()=>{
 assert.equal(validateRequest(r).action,'inspect');
 assert.equal(validateRequest({...r,action:'create'}).action,'create');
 for(const x of [
  {...r,projectId:'prj-not-target'}, {...r,environmentId:'evm-not-target'},
  {...r,ownerId:'tea-not-target'}, {...r,serviceName:'other'},
  {...r,action:'delete'}, {...r,extra:'surprise'}
 ])assert.throws(()=>validateRequest(x));
});
test('real volunteer portal build and security gates are pinned',()=>{
 assert.throws(()=>createSpec('short'));
 const s=createSpec('x'.repeat(32));
 assert.equal(s.name,PORTAL_NAME);
 assert.equal(s.autoDeployTrigger,'off');
 assert.equal(s.environmentId,r.environmentId);
 assert.equal(s.serviceDetails.envSpecificDetails.buildCommand,'npm ci && npm run build:portal');
 assert.equal(s.serviceDetails.envSpecificDetails.startCommand,'npm start');
 const vars=Object.fromEntries(s.envVars.map(x=>[x.key,x.value]));
 assert.equal(vars.NODE_ENV,'production');
 assert.equal(vars.PUBLIC_ORIGIN,PUBLIC_URL);
 assert.equal(vars.PORTAL_ORIGIN,PORTAL_URL);
 assert.equal(vars.PREVIEW_ACCESS_PASSWORD,'x'.repeat(32));
 assert.equal(vars.SIGNUP_ENABLED,'false');
 assert.equal(vars.DONATIONS_ENABLED,'false');
 assert.equal(vars.MAIL_PROVIDER,'disabled');
 assert.equal('DATABASE_URL' in vars,false,'Database must be configured securely out of band, never committed');
});
