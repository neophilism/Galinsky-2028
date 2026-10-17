# G28-53 deterministic static performance budgets

The hosted post-build CI now enforces explicit per-file and combined first-render raw byte budgets, including the critical hero portrait, flag fallback, CSS, JavaScript and static HTML. It protects high priority for the hero portrait and lazy loading of the secondary portrait, and rejects third-party scripts on the homepage. Missing files are hard failures; no Lighthouse performance scores are fabricated. See `scripts/performance-budget.mjs` and its unit tests.

These raw byte thresholds are engineering guardrails, **not** live measured LCP/INP/CLS. Runtime field performance, failure/load simulations, recovery times, and accessibility visual acceptance remain separate G28-53 requirements. Preview activation and Stripe gates are unaffected.
