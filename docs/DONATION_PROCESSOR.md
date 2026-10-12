# Donation processing: provider neutrality and operational redundancy

**Owner decision (2026-10-12): Stripe is prohibited in every form.** Do not assume a vendor is acceptable merely because it markets itself to political campaigns. A processor that applies discretionary campaign-only restrictions, special permission, higher campaign-only pricing, or political-affiliation/speech review that does not apply to otherwise comparable lawful organizations is ineligible for selection.

**No processor has yet passed the owner's equal-treatment assessment or merchant underwriting.** Do not imply that Anedot, Authorize.net, NMI, or any other gateway is approved. Anedot was an earlier candidate; its dedicated political fundraising offering does not establish compliance with the equal-treatment requirement. A gateway is not necessarily the underlying processor or acquiring bank.

## Four independently approved hosted checkout routes

- The static campaign website supports four separate hosted payment links; a minimum of three verified and approved providers is required before fundraising can be enabled.
- All approved routes appear on the donation page, ordered with the primary first. Donors may select a different preapproved processor without waiting for a site rebuild. Changing which route is displayed first requires a rebuild/deployment. Existing payment attempts are never automatically replayed to a backup.
- Each route needs its own underwriting/merchant agreement, settlement and payout path, independent processor identity, approved public checkout hostname and working hosted page. Unique hostnames are necessary but do **not** prove corporate, acquiring-bank, network or outage independence.
- Never share card tokens across processors, present a single gateway with multiple subaccounts as four independent processors, disguise the campaign's business type, or change its required merchant category to evade a provider restriction.
- Host payment fields only on the third-party secure checkout. This site cannot collect cards or contributor personal data. All donation compliance copy, source attestation, employer/occupation collection, limits, election designation, one-time default, receipts, refunds and recurring opt-in need independent verification on **every** processor's hosted page.
- The public site is rendered with `DONATIONS_ENABLED=false` by default. Preview never advertises live payment links, even with test configuration. Four provider adapters/slots in source code are **not** four opened or tested payment merchant accounts.

## Merchant equal-treatment evaluation (separate for every provider and acquirer)

1. Obtain the complete agreement, prohibited-use policy, merchant underwriting terms, fees, reserves and termination terms; identify the actual gateway, acquirer, payment facilitator and any subprocessor. Check for indirect Stripe dependencies.
2. Confirm in writing that legal political committees are accepted on the same *discretionary* criteria as comparable lawful organizations, without campaign-specific exclusions, approvals, elevated rates or additional restrictions. General identity, anti-fraud, AML and card-network requirements still apply to merchants. **Visa's standard MCC 8651 for political organizations versus 8398 for charities is a network classification, not proof of additional processor discrimination.**
3. Ask about suspension without notice, reserves/funds holds, contractual appeal rights, emergency escalation and data export; do not accept any claim of guaranteed nontermination. Screen shared ownership and acquiring banks across proposed providers.
4. Independently verify processor-owned form compliance and donor information exports with the treasurer; obtain legal committee name, registration, settlement bank approval and policies from authorized campaign personnel. Do not invent them.
5. Use each provider's legitimate sandbox and documented test cards to exercise successful payment, failure, refund, chargeback and webhook/export workflow; independently prove no double-charge on retry and correct per-provider reconciliation. Record test transaction references without card or donor PII. Mark a route approved only after evidenced acceptance.

## Site configuration (all defaults disabled)

```dotenv
DONATIONS_ENABLED=false
DONATIONS_TREASURER_APPROVED=false
DONATIONS_PRIMARY_PROCESSOR_ID=
DONATIONS_PROCESSOR_1_APPROVED=false
DONATIONS_PROCESSOR_1_ID=
DONATIONS_PROCESSOR_1_NAME=
DONATIONS_PROCESSOR_1_HOST=
DONATIONS_PROCESSOR_1_URL=
# Repeat the five PROCESSOR_N fields for slots 2, 3 and 4.
```

`DONATIONS_PROCESSOR_N_HOST` is the exact DNS hostname from the separately approved hosted checkout URL. `DONATIONS_PROCESSOR_N_URL` must use HTTPS on precisely that host (query parameters are permitted if documented as a public hosted link; never commit private API keys or tokens). `APPROVED=true` means externally verified merchant acceptance and treasurer approval, not merely passing local unit tests. Every independently approved payment route is accessible before any outage, making donor-side fallbacks immediately available.

## Operational contingency

Maintain an internal processor/underwriter contact and reconciliation register per route, including deposit bank, account owner, terms, emergency contact, test evidence, status, last verified payment and refund, and reserves. Monitor settlement and webhook/export processing separately. If one provider stops accepting donations, disable that route in configuration and rebuild/republish the site while other previously approved links remain usable; verify no duplicates from retrying an interrupted donation. Manual donor choice is the current contingency; **no runtime remote-switch administration or real-payment processing is represented as implemented by this PR**.

Relevant public references: https://usa.visa.com/content/dam/VCOM/download/merchants/visa-merchant-data-standards-manual.pdf ; https://squareup.com/us/en/legal/general/payment ; https://www.fec.gov/updates/commission-updates-regulations-to-address-technological-advances/
