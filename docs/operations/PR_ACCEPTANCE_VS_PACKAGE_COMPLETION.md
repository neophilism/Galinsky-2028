# PR acceptance versus planned feature completion

Owner rule, 17 October 2026: **a pull request is accepted when GitHub records its merge** (`merged_at` is non-null). Passing CI is a pre-merge check; after merge there is no separate acceptance process for that PR.

The repository contains two different counting systems:
- **Accepted PRs:** current real GitHub merged pull requests, independent of how many plans they advance. Current observation: 91 accepted merges of 96 real PRs; 5 closed without merge, zero open. The list is dated 2026-10-17T13:05:51.523Z; always prefer a fresh GitHub observation.
- **Entire work packages completed:** 8 of 71 scope-defined work packages under the original package audit's completion requirements. This is *not* PR acceptance. Multiple PRs can advance a single package, and one PR can advance multiple packages. Do not divide raw PR merges by work-package total.
- **Deployment / operational readiness:** separately confirmed by Render and live acceptance evidence. Passing CI/merging does not activate real donations, signup, confidential data flows or public launch.

The `prs` array on a roadmap work unit identifies PR evidence counted toward **full package** scope completion; `contributingPrs` identifies PRs merged and accepted but supporting a larger unit that still needs additional implementation. Both are **accepted PRs** when GitHub reports merged. Neither field is a place to deny acceptance of the underlying PR. A package needs its own accurate scope status. Historical audits remain historical rather than re-labeling current merges.

`registry/prs.json` holds dated observed GitHub facts; `docs/PR_REGISTER.json` holds package-level scope and status. `docs/evidence/DELIVERY.json` keeps distinct PR acceptance and deployment counters. Engine Room and Boardroom must use the same distinction. The current snapshot is not proof that later GitHub changes have or have not happened.
