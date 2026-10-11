# Galinsky 2028

Implementation of the approved Phillip Galinsky for America campaign website and volunteer application. The public design preserves the approved portrait, colors, composition and illustrations. Each launch issue has its large top-of-page video component.

**PRIVATE PREVIEW ONLY:** All Render-hosted public and portal content must be served behind the server-side password gate in `docs/operations/PRIVATE_PASSWORD_PREVIEW.md`. `render.yaml` now defines a Node Web Service, not a static site, and auto-deployment is disabled. Configure a long random Render secret named `PREVIEW_ACCESS_PASSWORD` before any deployment; no secret means refusal to start. Do not use the excluded workspace, deploy `dist/web` as a public static site, or enable payments/signups by default.

**Create in the exact Render project:** See [project-verified private Render provisioning](docs/operations/RENDER_EXACT_PROJECT.md). It requires the `G28_RENDER_API_KEY` and `G28_PREVIEW_ACCESS_PASSWORD` GitHub Actions secrets and a deliberate manual workflow dispatch. Never create an unassigned workspace-root service.

**Start here:** [implementation status](docs/IMPLEMENTATION_STATUS.md), [complete development plan](docs/DEVELOPMENT_PLAN.md), [60-package register](docs/PR_REGISTER.json), [agent rules](AGENTS.md), [deployment runbook](docs/operations/DEPLOYMENT.md).

## Run and verify

Use the Node version in `.nvmrc` and the committed lockfile.

```sh
npm ci
npm run check
npm run typecheck
npm test
npm run test:api
npm run build
npm run dev
```

`npm run dev` serves the built public website on port 4321. `npm start` serves the built volunteer application and API on port 4322. Without a database it uses an explicit development-only in-memory store. Production refuses that fallback. Copy `.env.example` into your local environment; Node does not silently load an arbitrary environment file. For local development use `node --env-file=.env apps/api/src/server.mjs` after setting the required values.

Database tests need an isolated loopback Postgres instance and `TEST_DATABASE_URL`; they must never target the assigned Neon production project. CI supplies that isolated database. `npm run test:browser` requires installed Playwright Chromium, Firefox and WebKit and exercises real local HTTP sign-in, cookie, library and logout flows using synthetic mail and material fixtures.

`npm run build:offline` is a dependency-free public-page rendering fallback for inspection. It is not a replacement for the Astro/Vite production build or application testing.

## Layout

- `apps/web`: Astro public marketing site, original design assets and small interactive scripts.
- `apps/portal`: React/TypeScript volunteer workspace, account UI, role guide, library and local worksheets.
- `apps/api`: Fastify application, explicit runtime configuration, Postgres storage and durable account-email worker.
- `packages/core`: tested validation, consent, publication, activity authorization and finance boundary rules.
- `content/public`: approved public templates and issue/video configuration.
- `content/materials`: source manifest and current approved publication input; no full historical archive in the public build.
- `db/migrations`: versioned transactional database schema.
- `docs`: full plan, decisions, security boundaries, evidence and handoff.

## Important current boundaries

The preview does not accept payments or collect sensitive volunteer reports. Signup requires verified email delivery configuration. The current materials list is intentionally empty until the historical package is reconciled and actually reviewed. Staff identity, sensitive-content E2EE, fundraising integration and several planned operations workflows still require implementation and review; setting a boolean cannot enable them.

The original 36-document source package remains an authorized source input, not a browser download. Its manifest is tracked, not its full bodies. This project does not claim E2EESA certification. Public material, account-delivery metadata, sensitive content and financial disclosure have separate boundaries.

The Render blueprint is a public preview configuration, not evidence of a deployment. Use the user-designated Render project; do not silently use an excluded default workspace.
