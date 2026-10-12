> **2026-10-12 owner update:** Stripe is permitted as the first provider. This file records the historical screening before that reversal; do not interpret its Stripe prohibition or four-provider requirement as current. Chase remains excluded.

# Payment provider self-service screening — 2026-10-12

**Status: NO FINAL FOUR. No production merchant has been approved. No account applications, paid services, live payments or refunds authorized.**

## Owner requirements, superseding previous recommendations

- Do NOT use **JPMorgan Chase**, **Chase Payment Solutions**, **Chase Paymentech**, or **WePay**, whether directly or as the underlying merchant/acquiring relationship. WePay is expressly part of J.P. Morgan Payments (https://www.jpmorgan.com/insights/payments/merchant-services/wepay-integration).
- Do not initiate any **contact-sales**, mandatory telephone onboarding, callback request, quote negotiation or sales meeting. Account opening and terms must be directly available through online self-service.
- Zero setup fee; zero monthly gateway/minimum/subscription/inactivity cost. No charges in advance of merchant revenue: owner currently has zero dollars and does not authorize a financial test with real funds.
- No Stripe direct or indirect; no separate campaign-only approval, fee markup, discretionary political restrictions or political-expression review relative to comparable lawful merchants.
- Four **independently underwritten acquiring relationships**. Four brand names but fewer than four independent acquirers do NOT meet the user's redundancy requirement.
- Host checkout, API/test environment, settlement and signed payment webhooks, custom checkout donor field requirements, and chargeback/export tools must each be verified against the **actual campaign committee**.
- Do not misclassify the committee to avoid risk checks. Do not assume merchant acceptance from a published developer sandbox. Record missing proofs as UNKNOWN, never as approved.

## Screening results (public official sources checked 2026-10-12)

| Provider | Finding | Status |
|---|---|---|
| Chase Payment Solutions / Chase Paymentech / WePay | Owner expressly refuses these services; WePay belongs to JPMorgan. | EXCLUDED |
| Elavon (U.S. Bank) | The US new merchant account page requires **requesting a sales callback**, violating no-contact. https://www.elavon.com/working-with-elavon.html | EXCLUDED FOR SELF-SERVICE |
| Worldpay / Global Payments | A UK terminal online form exists, but this is **not evidence of a no-call US online merchant application**, $0 minimum, or equal treatment. https://apply-online.worldpay.com/ | NOT VERIFIED |
| Fiserv direct merchant services | Its onboarding form states it will reach out to applicants; direct self-service and fee-free application not substantiated. https://isvpartner.fiserv.com/merchant-signup | NOT VERIFIED |
| Helcim | US sign-up is self-service, $0 account/monthly, published API. Its Sept 30 2026 AUP states its services are for selling goods or services and reserves sole discretion to suspend or terminate without notice. **Political campaign donations not affirmatively authorized by its published AUP. Its published financial terms name Elavon as acquirer**, so it is NOT independent of Elavon. https://learn.helcim.com/docs/how-to-sign-up-with-helcim ; https://www.helcim.com/pricing/ ; https://legal.helcim.com/us/acceptable-use-policy/ ; https://legal.helcim.com/us/financial-services-terms/ | CONDITIONAL LEAD ONLY — NOT APPROVED |
| Adyen | No general setup/monthly fees advertised, but it requires contacting sales before opening an account; its official eligibility list classifies **Political Campaigning** as a restricted merchant category and pricing notes a possible minimum invoice. https://help.adyen.com/en_US/knowledge/account/account-settings/how-can-i-get-an-adyen-account ; https://www.adyen.com/legal/list-restricted-prohibited ; https://www.adyen.com/pricing | EXCLUDED |\n| Finix | Official restrictions list **political campaigns** as a specially **restricted** merchant category, violating owner criterion. https://finix.com/terms-and-policies/prohibited-and-restricted-businesses | EXCLUDED |
| SumUp | Free developer sandbox and online payment APIs exist, but UK/Australian incompatible-business lists include political organizations/donations. US campaign acceptance and equal-treatment not proven; no final onboarding approval. https://developer.sumup.com/online-payments ; https://help.sumup.com/en-GB/articles/3G8ZHjdgFZjmKWOmDWS52m | NOT APPROVED |
| PayPal | Published PayPal Pools terms explicitly forbid political campaign fundraising, contrary to owner's no campaign-specific exclusion. Business checkout's separate terms must not be conflated with the Pools terms, but this precludes confident across-product equal-treatment acceptance. https://payflowpro-edge.payflow.edge.paypal.com/us/legalhub/paypal/pool-tnc?locale.x=en_US | EXCLUDED UNDER OWNER POLICY |
| Payanywhere | Self-enrollment advertised; its current processing terms disclose a **$3.99/month inactivity fee after 12 months**, and online Payment Links are identified as an additional **Premium Plus** plan feature ($29.95/month published). Violates zero-carrying-cost condition. Merchant contract allows additional bank debits; do not expose financially distressed owner to unexpected charges. https://www.payanywhere.com/pricing ; https://www.payanywhere.com/why-payanywhere/payment-links ; https://www.payanywhere.com/blog/introducing-payments-hub-premium-plus | EXCLUDED |
| Authorize.net (Visa) | Online self-service signup exists, but the gateway costs **$25/month** and can charge returned-payment or late-payment fees. Its separate acquiring bank would need verification anyway. https://www.authorize.net/sign-up/pricing.html | EXCLUDED FOR CURRENT BUDGET |
| GoDaddy Payments | Online signup available, but publishes Elavon among underlying payment-network partners, sharing a failure domain with Elavon/Helcim. Terms require separate merchant eligibility check. https://www.godaddy.com/en-ca/help/why-was-my-godaddy-payments-account-closed-41007 | NOT VERIFIED FOR INDEPENDENCE |

**Conclusion:** There is presently **no four-provider shortlist** that meets every owner condition on verified evidence. Do not invent providers, tell the owner to apply for any of these, or substitute a sales-led service. Remaining screening should focus on documented **fee-free, immediate self-serve applications** that affirmatively accept a federal campaign as a lawful ordinary merchant without a politics-specific tier. If none can be verified, report the incompatibility transparently; never claim a perfect four.

## Engineering path with zero owner spending

The campaign already has generic `merchant-a..merchant-d` sandbox-only encrypted credential slots, one-button four-way routing, durable quarantine and read-only checkout uptime probes. Keep the slots vendor-neutral. Run deterministic **synthetic** authorization, refusal, timeout, chargeback and failover tests; never attempt actual charges or configure unknown merchant names as approved. Do not enable `DONATIONS_ENABLED` until **all four independently underwritten** operators meet every acceptance test.

Document review must be independent from assumptions about political views or why another merchant was suspended. Standard card scheme onboarding checks are not evidence of partisan motives.
