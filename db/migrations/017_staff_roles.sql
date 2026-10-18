ALTER TABLE g28.admin_grants DROP CONSTRAINT IF EXISTS admin_grants_role_check;
ALTER TABLE g28.admin_grants ADD CONSTRAINT admin_grants_role_check
 CHECK(role IN ('captain','coordinator','editor','publisher','module-verifier','module-approver','safety-reviewer','treasurer','security-administrator','auditor'));
INSERT INTO g28.schema_migrations(version) VALUES('017_staff_roles') ON CONFLICT DO NOTHING;
