import test from 'node:test';
import {randomBytes} from 'node:crypto';
import assert from 'node:assert/strict';
import {safeEnvironmentSummary,validateReleaseInspection,inspectRelease} from '../scripts/inspect-release.mjs';
test('release inspection exposes known flags and runtime role, never credential contents',()=>{
 const password=randomBytes(32).toString('hex'),uri=new URL('postgresql://ep-test.example.test/neondb');uri.username='runtime';uri.password=password;
 const summary=safeEnvironmentSummary({DATABASE_URL:uri.href,RESEND_API_KEY:'synthetic-secret-mail-key',G28_OWNER_ADMIN_EMAIL:'private@example.test',PREVIEW_ACCESS_PASSWORD:'synthetic-private-preview-password',SIGNUP_ENABLED:'false'});
 const text=JSON.stringify(summary);assert(!text.includes(password));assert(!text.includes('synthetic-private'));assert(!text.includes('synthetic-secret'));assert(!text.includes('private@example.test'));assert.equal(summary.flags.SIGNUP_ENABLED,false);assert.equal(summary.databaseRoles.DATABASE_URL.role,'runtime');assert.equal(summary.configured.RESEND_API_KEY,true);
});
test('inspection cannot target arbitrary resource/origin or run with secrets on an untrusted ref',async()=>{
 const req={schemaVersion:1,action:'inspect',expectedCommit:'a'.repeat(40),nonce:'test'};
 assert.equal(validateReleaseInspection(req).action,'inspect');assert.throws(()=>validateReleaseInspection({...req,url:'https://untrusted.example'}));assert.throws(()=>validateReleaseInspection({...req,action:'deploy'}));
 await assert.rejects(inspectRelease(req,{env:{GITHUB_ACTIONS:'true',GITHUB_REPOSITORY:'neophilism/Galinsky-2028',GITHUB_REF:'refs/heads/unreviewed'},transport:()=>{throw Error('must not access secrets');}}),/authorized main/);
});
