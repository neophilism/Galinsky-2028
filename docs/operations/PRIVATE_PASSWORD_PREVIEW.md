# Mandatory private-preview password protection — BEFORE any Render deploy

**Release rule:** The campaign is not publicly launched. Do not deploy a Render static site or publish `dist/web` through a CDN, GitHub Pages, or another direct URL. A static site cannot run this server-side gate; `robots.txt` and a JavaScript password prompt are NOT access control.

## Required Render placement (no deployment by this change)

The user explicitly excluded "Phillip's workspace". The designated Render project link is:
https://dashboard.render.com/project/prj-db57fnm7bikc739783q0

The current Render integration cannot assign a newly created service to that project and shows only the excluded workspace. Do not create a service in the excluded workspace. Either connect the actual intended Render workspace/project to the tool or create the services manually using the dashboard *inside the target project's chosen environment*, then provide non-secret service IDs and URLs.

Do not rely on a Blueprint import selecting the correct destination automatically. The new `render.yaml` defines a **Node web service** with auto-deploy disabled, not a static site. Create the first service inside the intended project with:

| Setting | Public preview web service |
|---|---|
| Repository | `https://github.com/neophilism/Galinsky-2028` (private GitHub access required) |
| Branch | `main` |
| Type / runtime | **Web Service** / Node (NOT Static Site) |
| Node version | `22.23.3` |
| Build command | `npm ci && npm run build:web` |
| Start command | `npm run preview:serve` |
| Auto-deploy | Off, until initial configuration and tests pass |
| `G28_PUBLIC_MODE` | `preview` |
| `PREVIEW_ACCESS_USER` | `preview` (or another simple private username) |
| `PREVIEW_ACCESS_PASSWORD` | A freshly generated, strong random 32+ character **Render secret**; never put in a repository, URL, screenshot or chat |

The server refuses to start without a valid `PREVIEW_ACCESS_PASSWORD` (minimum 24 characters). A browser entering the preview URL will see an HTTP Basic authentication dialog; supply the configured username and password. All HTML, image, CSS, JS, and direct deep links are authenticated BEFORE the file is read. Failed authentication returns 401 with no page contents. Preview responses also carry no-store/noindex headers; those headers are secondary, not a substitute for authentication. HTTPS from Render is mandatory before entering the password.

## Separate volunteer portal/API, only if needed for preview testing

Create a **second Node Web Service in the same expressly designated project**, not a Static Site. Build `npm ci && npm run build:portal`, start `npm start`, disable auto-deploy initially, and configure `NODE_ENV=production`, `PUBLIC_ORIGIN=https://<real public service host>`, `PORTAL_ORIGIN=https://<real portal service host>`, `PREVIEW_ACCESS_USER`, `PREVIEW_ACCESS_PASSWORD`, and `DATABASE_URL` from the **staging** Neon branch. Leave `SIGNUP_ENABLED=false`, `DONATIONS_ENABLED=false`, `STAFF_IDENTITY_ENABLED=false`, and `PROTECTED_CONTENT_ENABLED=false`. Existing portal/API hooks demand the same server-side password before health, accounts, materials, app assets, or unreleased endpoints can be reached.

For the initial private preview, the public web service needs no database or SMTP account. Do not provision an email worker, enable signup, or accept payments until their specific review gates pass.

## Neon resources already provisioned

- Assigned Galinsky Neon project: `soft-bread-25523698`
- Unmodified default/production branch: `br-bitter-king-b4g5sx99`
- Separate staging branch: `br-purple-tooth-b4ra2kbm` (`staging-operational-readiness-20261011`)
- Four migrations were exercised and recorded on staging; zero account, reviewed guide, or payment rows existed at that point.

**No new Neon project is needed** and no new Neon production migration is authorized by this preview setup. The only later database value needed for the volunteer API is an authorized connection string for the staging branch placed *directly in that Render service's DATABASE_URL secret*. Do not send it in chat, commit it, or attach it to a pull request. Confirm SSL verification and exact branch selection. A deployed /readyz check should verify the schema, not turn on public registration.

## Required deployment acceptance, after correct placement

1. Verify the unauthenticated and wrong-password GET requests to `/`, `/assets/candidate.webp`, all individual issue paths, `/donate/`, and the portal `/api/config`, `/healthz`, `/api/materials` return **401** and reveal no campaign page or account data.
2. Verify a correctly authenticated private user receives the intended public pages. An authenticated portal request without a volunteer session must still receive 401 at `/api/materials`. Admin/payments/protected endpoints must still fail closed even after the preview password.
3. Test direct `/issues/garden/` or `/assets/candidate.webp` by opening a new private/incognito browser session: the password dialog must appear *before* any content.
4. From an authorized operator shell, use `PREVIEW_ACCESS_USER=preview PREVIEW_ACCESS_PASSWORD=<private value> node scripts/smoke-release.mjs --public https://<real URL> --mode preview`. Environment variables are read in process only; never put the password in CLI options, workflow inputs or logs.
5. If GitHub Actions is used for HTTP acceptance, add the password as the private repository **Actions secret** `G28_PREVIEW_ACCESS_PASSWORD`; the workflow never accepts the password as a manual text input. If not configured, acceptance fails closed. Use `G28_PREVIEW_ACCESS_USER` as an Actions variable only when changing the username.

This is a shared preview password, **not** individual volunteer sign-in, MFA, E2E encryption, treasurer payment approval, or an independent security audit. Restrict who receives the shared password; rotate it in Render before public launch or if disclosed.
