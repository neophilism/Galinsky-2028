#!/usr/bin/env node
import {readFileSync} from 'node:fs';
import {signStaffApproval,materialDigest} from '../packages/core/staff-review.mjs';
// An offline operator tool. Never upload private PEMs, print them, or place
// them in GitHub Actions / Render environment variables.
const [, , materialPath,privateKeyPath,role,keyId]=process.argv;
if(!materialPath||!privateKeyPath||!role||!keyId){console.error('Usage: node scripts/sign-material-review.mjs MATERIAL.json PRIVATE_KEY.pem author|reviewer staff-key-id');process.exit(2);}
try{
  const record=JSON.parse(readFileSync(materialPath,'utf8'));
  const approval=signStaffApproval(record,{role,keyId,privateKeyPem:readFileSync(privateKeyPath,'utf8')});
  console.log(JSON.stringify({role,approval,digest:materialDigest(record)},null,2));
}catch(e){console.error('Approval not generated: '+e.message);process.exitCode=1;}
