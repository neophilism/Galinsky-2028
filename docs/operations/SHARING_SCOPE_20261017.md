# G28-35 — official public issue links, staged share control

Only the approved production canonical origin can appear in the public-page share controls. They are absent from private preview builds, including builds that happen to carry an internal canonical setting. Each of the three launch issue URLs is the same versioned route already in the production sitemap and canonical tag; no tracking parameters, private portal account IDs, shortener services or publication of unapproved destinations.

A direct user click chooses a browser-native Share dialog, or copies the canonical HTTPS issue-page URL. Sharing is never automatic. A cancelled dialog stays cancelled. Clipboard failures show a manual browser address-bar alternative. The share component reports actions in an accessible live region and is responsive.

Evidence: `tests/public-sharing.test.mjs` checks server-side source URL eligibility and rejects protected/malformed origins; `tests/browser/public-sharing.mjs` tests all three browser engines with synthetic origin and mocked local clipboard/share methods (no real social posting or external requests).

This is a **partial implementation** of G28-35. Remaining requirements include authorized current-image assets, rights/license approvals and revocation/versioning workflow, plus scanner decoding verification and rights/versioning workflow for campaign image assets. Do not mark G28-35 fully complete yet.

## Local QR feature extension — 17 October 2026

A third control lazily loads one pinned first-party MIT QR generator from `/assets/vendor/qrcode.js` (upstream davidshimjs/qrcodejs commit `04f46c6a0708418cb7b96fc563eacae0fbf77674`) only after the visitor requests it. A 16px white quiet-zone surrounds the high-contrast, print-preserving SVG. It encodes the exact validated canonical HTTPS issue URL shared by the copy and native-share actions; no private-preview URL, tracking parameter or remote QR service may be used. No QR library is downloaded on initial page load.

The three-engine browser suite checks on-demand loading, canonical input, generated SVG module presence, accessible toggle and reuse. A separate real-scanner decode and print inspection plus reviewed asset rights/withdrawal workflow are still needed for full G28-35 scope completion.
