# Persistent G28-29 activity-review foundation

This extends the strictly scoped, nonactivated activity publication rules
with a serializable-in-practice PostgreSQL adapter reusing the existing
`g28.activity_modules` table and `g28.audit_events`.

Under one transaction and module-key advisory lock, a staff action reads the
latest revision, checks the explicit revision plus monotonically increasing
`stateVersion`, and records the state transition. Source edits/revocations
INSERT a new revision. Independent verification/approval only change
review/approval metadata on the *same* source revision and are CAS-protected.
Concurrent stale transitions reject without losing either review. The public
read-only view continues selecting only the newest revision and never treats
a newer draft or revocation as old published authority.

No public/admin HTTP writes, unauthenticated actor construction, new schema,
or production release flag. The caller identity and scopes must come from
verified server-side staff MFA when that separate work is released. The
tests exercise the same full sequence in the memory fixture and isolated
loopback PostgreSQL, including a deliberate concurrent review race.
This does not authorize anyone to do regulated fieldwork.
