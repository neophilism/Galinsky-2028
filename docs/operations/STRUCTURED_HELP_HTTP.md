# Help and correction request HTTP rollout — pending verified release

The implementation exposes `/api/help/requests` (GET/POST), an account-only
withdrawal endpoint, and pseudonymous owner-only triage under `/api/help/staff`.
All writes require a valid account session, exact configured portal origin and
CSRF token. The account identifier is never provided by the client and is
never returned in the case records. Operator changes use existing verified
owner identity, not the anonymous preview password or the auditor role.

**Fail closed:** `G28_HELP_REQUESTS_ENABLED` defaults to off. This implementation
rejects enabling the intake workflow in production before the separate staff
identity/MFA and support operations readiness have been verified. To test,
run a local isolated Postgres and enable it in the synthetic test environment.
Do not configure it on the real Render services while these gates remain open.

The UI and REST fields accept only category and area; no free text, uploads,
message bodies, recipient data, contact information or incident descriptions.
They cannot take reports of immediate threats. The page must explicitly say
it is not emergency help, that response times are unknown and that sensitive
incident intake is unavailable. The status is visible to the account holder
when they return, but **no email is sent** and a submitted request is not
evidence that somebody has read it.

Before live activation: apply migration 015 to staging, test account closure
and export, verify an individually authenticated staff operator and MFA,
establish documented response/retention/legal-hold procedures, then rerun
real browser and PostgreSQL tests. Sensitive incident handling is G28-21/22
and has no adapter here. G28-34 stays in progress.
