import test from 'node:test';
import assert from 'node:assert/strict';
import {randomBytes} from 'node:crypto';
import {runtimeRoleStatements,PORTAL_RUNTIME_TABLES} from '../scripts/runtime-role-permissions.mjs';
test('runtime provisioning rejects arbitrary identity, mismatched profiles and unsafe password text',()=>{
 const good={role:'g28_stripe_runtime_test',profile:'stripe',password:randomBytes(36).toString('base64url')};
 for(const change of [{role:'neondb_owner'},{profile:'portal'},{password:"unsafe' sql"},{role:'g28_stripe_runtime_bad;DROP'}])assert.throws(()=>runtimeRoleStatements({...good,...change}));
 const sql=runtimeRoleStatements(good).join('\n');assert(sql.includes('NOCREATEROLE'));assert(!sql.includes('ALL TABLES'));assert(!sql.includes('DEFAULT PRIVILEGES'));assert(!PORTAL_RUNTIME_TABLES.includes('schema_migrations'));
});
