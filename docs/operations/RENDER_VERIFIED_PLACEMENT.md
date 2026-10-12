# Verified Galinsky 2028 Render placement and owner authorization

## Exact parent, environment, and services

Initial API inspection on 2026-10-11 (GitHub Actions run 38128065299) verified:

- Project: `prj-db57fnm7bikc739783q0` — Galinsky 2028
- Environment: `evm-db57fnm7bikc739783qg` — labeled Production in Render, **not** an authorization to publish
- Parent workspace: `tea-db23jkks728c73av263g` — Phillip's workspace
- Existing private public-preview service: `srv-db5teuajnfac73bm8pug` — https://galinsky-2028-private-preview.onrender.com
- Existing private volunteer portal/API service: `srv-db5v0lfavr4c73a62870` — https://galinsky-2028-volunteer-portal.onrender.com

**2026-10-12 owner decision: the owner expressly authorized deploying updates to the EXISTING Galinsky 2028 project and its existing services, even though the project belongs to Phillip's workspace.** This supersedes the historical pre-authorization prohibition in this file **for these two service IDs only**.

Scope is narrow: do not create another service, do not use workspace-root placement, do not move unrelated services, do not purchase/upgrade plans, do not activate public release or campaign fundraising or volunteer signup, do not change credentials, and do not silently access production financial data. Merchant contracts, live charges, bank routing, treasurer approvals, identity onboarding and independent expert reviews remain separate gates.

Approval recorded in the repo issue:
https://github.com/neophilism/Galinsky-2028/issues/60#issuecomment-6125946122

## Deployment verification and update procedure

Render inspection on 2026-10-12 confirmed **both** protected services in the exact environment with disabled auto-deploy. Both had healthy/live successful deploys of GitHub commit `441d08d095b3d5ddec008893ede58841f7dac5ae` at the time of inspection.

1. Obtain current GitHub default-branch commit and required CI result. Review Render service ID, `environmentId`, repo, branch, service type and `autoDeployTrigger` through read-only Render APIs.
2. Deploy the tested commit only to the exact two services. Do not create services or re-run the one-time `create` workflow. If already deployed at that SHA, no repeat deployment is necessary.
3. Verify both deploys show `live` and correspond to the expected commit. Check startup/error logs and read-only authenticated `/healthz` revision endpoints. Do not put preview passwords in repo files, logs or chat.
4. Probe each service anonymously and with wrong credentials: all private paths, including `/healthz`, must return 401. With authorized credentials, verify page content, private issue video seeking when its actual MP4 has been uploaded, and the API's read-only health endpoints. Record acceptance as verified only after actual HTTP responses.
5. Do not enable donations. The payment router has four reserved independently underwritten slots, but no actual approved merchant accounts or signed financial event integrations are confirmed.

**Historical warning:** `ops/render-project-request.json` still records a one-time service-creation request from earlier setup. It is not a current instruction or new authorization. Changing it would trigger its dedicated Actions workflow; do not change or invoke it to create another service.

Prior installation evidence:
- Exact-project creation run 38164605594
- Private password checks run 38164974556
- Web Render service https://dashboard.render.com/web/srv-db5teuajnfac73bm8pug
- Portal Render service https://dashboard.render.com/web/srv-db5v0lfavr4c73a62870
