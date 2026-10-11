# Run actual deployed HTTP checks

In GitHub Actions select **Galinsky 2028 deployed HTTP acceptance**, choose **Run workflow**, then fill in the exact live HTTPS public origin and (if deployed) separate portal origin.

The workflow runs the repository's existing `scripts/smoke-release.mjs` against eight public routes, publication metadata, robots.txt, the three top video areas and disabled fundraising inputs; it checks portal readiness and anonymous library denial when a portal URL is provided. Production mode additionally requires a portal and checks indexing/sitemap behavior. It writes no public account, donor, campaign-activity or payment data.

A green run proves only those HTTP responses on that URL at that time, not deployment into the required project, complete security certification, legal campaign compliance, working email delivery, payment processor integration or disaster recovery. Preserve the actual URLs, rendered review, tested SHA, runtime configuration digest and test reports for release acceptance.

Until the Render service can be placed inside the specifically assigned Galinsky project, leave deployment and DNS status **blocked**; do not silently create services in other projects. The intended Render project ID is `prj-db57fnm7bikc739783q0`; Neon project is `soft-bread-25523698`. The only available Render create API currently accepts a workspace, not the intended project ID.
