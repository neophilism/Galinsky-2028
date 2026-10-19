import test from 'node:test';
import assert from 'node:assert/strict';
import {randomBytes} from 'node:crypto';
import {runtimeRoleStatements,PORTAL_RUNTIME_TABLES} from '../scripts/runtime-role-permissions.mjs';
test('runtime provisioning rejects arbitrary identity, mismatched profiles and unsafe password text',()=>{
 const good={role:'g28_stripe_runtime_test',profile:'stripe',password:randomBytes(36).toString('base64url')};
 for(const change of [{role:'neondb_owner'},{profile:'portal'},{password:"unsafe' sql"},{role:'g28_stripe_runtime_bad;DROP'}])assert.throws(()=>runtimeRoleStatements({...good,...change}));
 const sql=runtimeRoleStatements(good).join('\n');assert(sql.includes('NOCREATEROLE'));assert(!sql.includes('ALL TABLES'));assert(!sql.includes('DEFAULT PRIVILEGES'));assert(!PORTAL_RUNTIME_TABLES.includes('schema_migrations'));
});

test('disabled-signup preview profile has only health metadata and public campaign projection reads',()=>{const sql=runtimeRoleStatements({role:'g28_portal_runtime_preview',profile:'portal_preview',password:randomBytes(36).toString('base64url')}).join('\n');assert(sql.includes('schema_migrations'));assert(sql.includes('campaign_public_releases'));for(const token of ['accounts','sessions','treasury_secrets','financial_provider_events','content_revisions','INSERT','UPDATE','DELETE'])assert(!sql.includes(token));});
