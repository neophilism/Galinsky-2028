# Read-only operational health check

Run `DATABASE_URL=<authorized_connection> node scripts/ops-health.mjs` from a secure operations environment. Do not check credentials into source, print a connection URI, or run it through a public site. The command reads only schema version strings and aggregated account, reviewed-material, and delivery-job counts.

Exit 0 indicates schema versions 001–004 are present, no dead jobs, and no queued delivery older than 15 minutes; exit 1 means investigation is required. This does NOT test actual sender/domain deliverability, verify donor amounts, inspect protected E2EE submissions, show voter/contact data, certify legal compliance or prove backups are restorable.

Run against the assigned Neon staging branch before any production rollout. If the application is intentionally using only three migrations, the missing migration 004 warning is expected until its reviewed PR is applied. All delivery-job fields are aggregated; never query delivery_envelope, subjects or hashed authentication tokens for operational dashboards.
