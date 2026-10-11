# Read-only HTTP preview and release checks

After deploying into the **designated Galinsky 2028 Render project**, run:

```sh
node scripts/smoke-release.mjs --public 'https://your-preview.onrender.com' --mode preview
```

This reads eight public routes and `robots.txt`. Every page must return HTML, one H1, an accessible main landmark, no template placeholders and noindex metadata in preview; the three issue pages must show their large video panels before the explanation. In preview, payment fields must remain disabled and contribution-unavailable language must remain visible.

When a separately configured volunteer portal/API is live:

```sh
node scripts/smoke-release.mjs --public 'https://www.verified-domain.example' --portal 'https://volunteer.verified-domain.example' --mode production
```

Production mode additionally requires the public robots/sitemap to be published and not noindexed; it checks portal `/healthz`, `/readyz`, and that anonymous requests to `/api/materials` receive 401. Do not substitute example hosts for real verified origins. No POSTs, donations, login requests, contact uploads, training approvals, or destructive changes are made.

These checks are **evidence of HTTP behavior only**, not certification of funds processing, real email delivery, E2EESA protocols, full WCAG compliance, backups, incident response, FEC compliance or the user's acceptance. Record the exact deployed URL/commit and inspect the output and CI evidence before marking a release gate complete. Static preview artifacts are automatically stored for seven days in CI so designers can review the public build independently of an inaccessible Render workspace; they are not a hosted deployment.
