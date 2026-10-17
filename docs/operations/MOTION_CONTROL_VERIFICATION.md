# G28-10: owner-approved motion policy and resource budget

The earlier approved animated-dot-flag PR #35 deliberately **removed the visible pause control** while retaining system reduced-motion support. This later owner decision supersedes the initial roadmap request for a pause button. The animation itself remains decorative; no additional controls appear in the hero, and its headline and calls to action remain static.

A subsequent engineering PR (#103) inadvertently reintroduced that visible control. This corrective PR removes the visible control and its storage preference while retaining a static no-JavaScript flag, disabled reduced-motion animations, offscreen and hidden-tab suspension. The canvas now throttles painting to at most 30fps on desktop and 15fps on small screens, with elapsed animation time accounting for the paint interval. No added third-party scripts, tracking, or background services.

Evidence: existing full three-browser public interaction checks plus the `tests/hero-motion-policy.test.mjs` regression check for the owner's no-button request, device-motion support, tab/offscreen suspension, and frame budget. Measured CPU cost and formal reference-image signoff remain separate work.
