# G28-35 — official public issue links, staged share control

Only the approved production canonical origin can appear in the public-page share controls. They are absent from private preview builds, including builds that happen to carry an internal canonical setting. Each of the three launch issue URLs is the same versioned route already in the production sitemap and canonical tag; no tracking parameters, private portal account IDs, shortener services or publication of unapproved destinations.

A direct user click chooses a browser-native Share dialog, or copies the canonical HTTPS issue-page URL. Sharing is never automatic. A cancelled dialog stays cancelled. Clipboard failures show a manual browser address-bar alternative. The share component reports actions in an accessible live region and is responsive.

Evidence: `tests/public-sharing.test.mjs` checks server-side source URL eligibility and rejects protected/malformed origins; `tests/browser/public-sharing.mjs` tests all three browser engines with synthetic origin and mocked local clipboard/share methods (no real social posting or external requests).

The current sharing implementation includes typed image/rights records, owner publication, immutable draft isolation, expiration, withdrawal, disclaimer-preserving card downloads and printable issue cards. See [the current workflow](APPROVED_SHARING_ASSETS.md). Actual rights attestations and final public origins remain publication inputs; no software review fabricates them.

## Local QR feature extension — 17 October 2026

A third control lazily loads one pinned first-party MIT QR generator from `/assets/vendor/qrcode.js` (upstream davidshimjs/qrcodejs commit `04f46c6a0708418cb7b96fc563eacae0fbf77674`) only after the visitor requests it. A 16px white quiet-zone surrounds the high-contrast, print-preserving SVG. It encodes the exact validated canonical HTTPS issue URL shared by the copy and native-share actions; no private-preview URL, tracking parameter or remote QR service may be used. No QR library is downloaded on initial page load.

The three-engine browser suite checks on-demand loading, canonical input, accessible toggle and reuse. It now independently decodes screenshots of the actual generated symbol with pinned jsQR 1.4.0 and PNGJS 7.0.0 in screen and print media. It verifies the exact canonical destination, print-hidden controls and the white 16px quiet zone. The current asset workflow separately enforces rights approval, publication versions, expiration and withdrawal. These dependencies are development-only and are not downloaded by visitors.
