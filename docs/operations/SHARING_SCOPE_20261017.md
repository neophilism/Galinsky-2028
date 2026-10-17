# G28-35 — official public issue links, staged share control

Only the approved production canonical origin can appear in the public-page share controls. They are absent from private preview builds, including builds that happen to carry an internal canonical setting. Each of the three launch issue URLs is the same versioned route already in the production sitemap and canonical tag; no tracking parameters, private portal account IDs, shortener services or publication of unapproved destinations.

A direct user click chooses a browser-native Share dialog, or copies the canonical HTTPS issue-page URL. Sharing is never automatic. A cancelled dialog stays cancelled. Clipboard failures show a manual browser address-bar alternative. The share component reports actions in an accessible live region and is responsive.

Evidence: `tests/public-sharing.test.mjs` checks server-side source URL eligibility and rejects protected/malformed origins; `tests/browser/public-sharing.mjs` tests all three browser engines with synthetic origin and mocked local clipboard/share methods (no real social posting or external requests).

This is a **partial implementation** of G28-35. Remaining requirements include authorized current-image assets, rights/license approvals and revocation/versioning workflow, plus local QR generation and decoded-URL validation. Do not mark G28-35 fully complete yet.
