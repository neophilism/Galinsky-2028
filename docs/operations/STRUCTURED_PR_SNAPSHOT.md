# GitHub PR snapshot and honest Engine Room progress

Canonical snapshot: registry/prs.json (schema version 1). The acceptance register is docs/PR_REGISTER.json, backed by
`docs/evidence/ACCEPTANCE_AUDIT_20261013.md`. `registry/roadmap.json`
is a deprecated redirect, not a second roadmap. Historical status text
is not evidence that a planned work package has been accepted.

The earlier snapshot omitted newer PR activity. The 13 October 2026 audit refreshed all 87 closed PRs (82 merged, 5 unmerged) and separately reconciled 61 work packages.
Use the real private GitHub API to refresh **observations**. Never infer
package completion, author/reviewer acceptance, deployment, live smoke,
security approval, or partial work from a PR's existence.

## Operator refresh

From a trusted checkout with read-only repository access:

1. Set GITHUB_READ_TOKEN or GITHUB_TOKEN securely (not in a command line,
   log, source file, or screenshot). It needs access to this private repo.
2. Run npm run prs:refresh to validate a dry-run only.
3. Run npm run prs:refresh -- --write to refresh the observed real pull
   requests in registry/prs.json. Review the diff; never edit GitHub facts.
4. Commit the resulting change on an ordinary review branch, open a PR,
   run CI, merge only after verification, and refresh Engine Room.

The script paginates all accessible PRs, rejects invalid/missing mapped PR
records, preserves the **complete original 60 work units and their explicit
mappings without changes**, and writes the JSON atomically. It never writes
a repository token or requires a payment credential.

## Mapping is approval, not guesswork

The current sixty-one work packages are much larger than individual fixes and
many have only partial implementations. Engine Room currently displays
*fully merged mapped work units* as green, open mapped units as yellow,
unmapped units as empty. Attaching a merged partial-feature PR to the
entire "production fundraising" work unit would falsely mark fundraising
complete. Do not do so.

Before associating a full work-unit ID with a PR, verify that the PR(s)
actually meet the whole work-unit acceptance standard and link exact CI,
live-deployed SHA, documented code/security review and any actually required external operational approval in
the source plan. Separate raw PR activity from independently accepted
work-package completion. Never map a PR just because its number is close
to a roadmap ordinal.

For a user-facing activity indicator, show observed PR counts and latest
merged timestamps as a separate metric from the accepted package bar.
The snapshots provide the former; acceptance tracking supplies the latter.

Do not substitute PR snapshots for on-site function tests. See the actual
content, signup, donation and privacy release gates in the production
acceptance checklist.
