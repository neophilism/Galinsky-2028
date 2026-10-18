# Structured volunteer help requests — G28-34 partial foundation

This is **not** a sensitive incident intake or an emergency service. The full
G28-34 package remains in progress; G28-21/22 recipient key enrollment and
protected submissions are still unimplemented. Do not enable or claim them
through this low-sensitivity feature.

## Current scope
- Signed-in volunteers may submit `kind` and `area` from strict enumerations.
  No names, contact details, descriptions, URLs, uploads, incident reports,
  medical information, testimony or arbitrary text are accepted by the schema.
- Every case is account-scoped, limited to three open records per account,
  and can be withdrawn by its submitter. A verified owner may acknowledge or
  resolve a structured case; the public and staff views reveal no account IDs,
  delivery hashes, email addresses, notes, logs or narrative.
- A request is a **status record**, not a delivery receipt. No email alert,
  response-time promise, staff MFA, communication channel or SLA is implied.
  The volunteer must return to their workspace to view the status.
- PostgreSQL stores only enumerations and state under the volunteer account,
  with `ON DELETE CASCADE`. Staff transitions record actor/request IDs in
  the existing audit trail. No audit event is created for a volunteer case
  creation/withdrawal; account closure removes its case rows.
- Additive migration `015_structured_help_requests.sql` must be applied to
  the assigned staging branch before enabling HTTP routes in a deployment.
  Never migrate a production branch without a reviewed release plan.

## Scope still missing
Build and verify the protected recipient-key/E2EE incident workflow, actual
review and secure messaging, staff MFA/least privilege, retention/legal-hold
rules, reporter correction and export integration, complete UI/browser journeys,
production mail delivery, and full live acceptance. Never infer a protected
incident channel from the existence of this table.

Release instructions: migrate isolated test Postgres and staging; require
tests for strict unknown-key rejection, foreign-account access, CSRF/origin
checks, request limits, account closure and concurrent create. Keep
`PROTECTED_CONTENT_ENABLED` rejected until its own reviewed adapter exists.
