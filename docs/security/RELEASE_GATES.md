# Security release gates

1. Map every component, field, flow, recipient, storage path and export to the exact applicable reviewed E2EESA basis. The observed README is development toward 0.9.0-rc.2, not production certification.
2. Distinguish public content, authenticated training distribution, account/delivery metadata, protected volunteer content and intentionally processed financial records. No repository-wide blanket E2EE claim.
3. Verify recipient identity/device enrollment and key changes; private recipient keys never become generic server secrets. Account recovery cannot silently restore cryptographic trust.
4. Inspect actual databases, object stores, logs, analytics, error paths, email, jobs and exports for protected plaintext. Reject weaker fallback. Use synthetic canaries.
5. Model browser code delivery, endpoint compromise, recovery, revocation and retained old copies honestly. No unauthorized future/historic recipient expansion.
6. Separate public editorial file sanitization from private encrypted attachment handling; private uploads must not be secretly decrypted by the general host/scanner.
7. Verify object-level/server-side authorization, step-up, CSRF/origin policy, CSP, XSS, SSRF, uploads, abuse limits, secret handling and dependency supply chain.
8. Verify hosted card boundary, signed raw-body webhooks, deduplication, event ordering, direct-hosted and recurring enforcement and controlled financial exports.
9. Bind implementation and independent-review evidence to exact source/build/configuration/environment. Passing fixtures or self-review are not independent certification.
10. Release protected or financial flows only after their gates pass. Continue unrelated engineering while external evidence is pending, and show truthful blocked status.
