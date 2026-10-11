# Direct deployment to the authorized Render project

**Target project:** https://dashboard.render.com/project/prj-db57fnm7bikc739783q0

The connected Render integration can create services only at workspace scope. Its create method has no `environmentId` option, which would leave service placement ambiguous. Render's **official REST API** supports both `GET /v1/projects/{projectId}`, `GET /v1/environments/{environmentId}` and an `environmentId` field on `POST /v1/services`, so the verified route is the project-specific manual GitHub Actions workflow.

## Operator setup — secrets never supplied in chat

In the private GitHub repository `neophilism/Galinsky-2028`, open **Settings → Secrets and variables → Actions → New repository secret** and configure:

- `G28_RENDER_API_KEY`: an authorized Render API key with service-creation access to the **exact Galinsky 2028 project** (Render Account Settings → API Keys). The key is required by Render's REST API and is not available to the connected Render plugin.
- `G28_PREVIEW_ACCESS_PASSWORD`: a new random 32+ character secret to use for the private HTTP Basic authentication barrier. Save it privately so you can enter it in your browser. The username is `preview`.

Never paste either secret into chat, pull requests or the tracked repo.

## One-time project verification and creation

Open **Actions → Create private preview in exact Galinsky Render project → Run workflow** and choose **inspect**. The output reports the actual project, its owner workspace, and its validated environment IDs. It makes no changes. If the project has multiple environments, select the desired `env-...` ID explicitly when running **create**; the script refuses to infer an environment.

When the location is correct and both secrets are present, run that workflow again with **create**. It refuses to create a service outside project `prj-db57fnm7bikc739783q0`, refuses to overwrite existing services, and atomically supplies the password at creation time. The resulting configuration:

| Item | Value |
|---|---|
| Render project | `prj-db57fnm7bikc739783q0` |
| Service name | `galinsky-2028-private-preview` |
| Type | Node Web Service; **never** Static Site |
| Plan | Free |
| Repository / branch | `neophilism/Galinsky-2028`, `main` |
| Build | `npm ci && npm run build:web` |
| Start | `npm run preview:serve` |
| Automatic deployment after commits | Off |
| Password | Applied at create time from the GitHub Actions secret |
| Account/signup/payments | Not activated |

Render might start an initial deployment as soon as the service is created, even with automatic deployment disabled. The server still **refuses to start without its password** and requires that password before serving every route or asset. Do not create a separate static-site service.

Check the new service's Render page (the workflow prints the nonsecret service ID and dashboard link) and verify the service shows up inside the intended project and environment. Use a private browser window to check that unauthorized requests return HTTP 401 on every route, and authenticated viewing works. Avoid connecting production email, financial processors or the Neon production branch for the initial public preview.

## If inspection fails

- **404**: The Render API key cannot access that exact project, or the project ID is wrong. Connect the correct project-owning account; do not fall back to a different workspace.
- **403**: The key lacks project/service authorization.
- **Multiple environments**: Use the environment ID reported by inspect. Never guess.
- **Service name taken**: Inspect existing service and its project placement. No duplicate is created.
- **GitHub repository inaccessible to Render**: Configure GitHub repo access in the correct Render project/workspace.
- **Unexpected API shape**: The script refuses service creation rather than defaulting to workspace-root placement.

No Render or Neon deployment is performed by merely committing this workflow. Creating the password-protected service requires a deliberate GitHub Actions `create` run.
