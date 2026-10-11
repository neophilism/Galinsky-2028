# Verified Galinsky 2028 Render placement

Read-only API inspection on 2026-10-11 (GitHub Actions run 38128065299) returned:

- Project ID: `prj-db57fnm7bikc739783q0`
- Project name: `Galinsky 2028`
- Environment ID: `evm-db57fnm7bikc739783qg`
- Environment name: `Production`
- Parent workspace ID: `tea-db23jkks728c73av263g`
- Parent workspace name: `Phillip's workspace`

**Important:** The user previously prohibited using "Phillip's workspace" but explicitly requested placement into this project. Since the verified project is nested inside that excluded workspace, **do not merge the draft creation PR or submit any Render POST** until the user explicitly confirms that exact-project deployment within this parent workspace is permitted. Never create an unassigned workspace-root service.

Once permission is obtained, review the draft PR `ops/ready-password-preview-in-exact-render-project` and confirm `ops/render-project-request.json` names the exact IDs above. Merging that PR triggers the repo's authorized single-purpose Render creation workflow. No paid plan, domain, signup, billing, Neon production, or email worker should be enabled by that action. The `PREVIEW_ACCESS_PASSWORD` GitHub Actions secret is passed into Render at service creation, not printed.

After service creation, verify HTTPS and the server-side Basic-auth barrier for the homepage, issue routes, assets, and direct paths **before** sharing any preview URL. Record service ID, status, and acceptance results.
