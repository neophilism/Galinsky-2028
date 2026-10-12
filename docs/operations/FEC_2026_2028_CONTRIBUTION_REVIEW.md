# Federal campaign contribution verification — Oct 12, 2026

**Owner instructions:** preserve all already supplied contributor wording and personal-credit-card-only policy; principal committee's sole current treasurer and administrator is the owner. This is a legal/engineering compliance checklist, **not** a representation that accepting donations is lawful or enabled today. Current rule sources are the FEC official website.

## Verified current federal rules

1. **Itemization / best efforts:** Candidate-authorized committees must use best efforts to collect and report name, mailing address, occupation and employer once an individual gives **over $200 in an election cycle**. The solicitation must contain a clear, conspicuous request, and follow-up is required if material information is missing. The owner's existing sentence is appropriate but both provider checkouts must request and export the necessary data. Source: https://www.fec.gov/help-candidates-and-committees/making-disbursements/fundraising-campaign/ and https://www.fec.gov/help-candidates-and-committees/best-efforts-document-receipts/
2. **Indexed limits:** The 2025–26 limit for an individual to a candidate committee is **$3,500 per election**, primary and general counted separately. The FEC states this 2025–26 cycle runs November 6, 2024–November 3, 2026. For a 2028 race, **do not hardcode $3,500 as the future cycle's limit**. Update after the 2027–28 indexed limit is officially published. Source: https://www.fec.gov/help-candidates-and-committees/candidate-taking-receipts/contribution-limits/
3. **Eligibility:** Exclude foreign nationals and prohibited source funds, including direct corporate, union, national-bank and federal-contractor contributions. No contribution in someone else's name. The owner additionally declines PAC contributions, FARA registrants, under-18 contributions and all payments other than personal credit cards. These are committee policies and need not imply the FEC generally prohibits every such contribution (for example, qualifying minors and PACs may contribute under federal rules). Source: https://www.fec.gov/introduction-campaign-finance/understanding-ways-support-federal-candidates/
4. **Notices:** A candidate campaign website and solicitation must display a **clear and conspicuous paid-for-by disclaimer**, the exact legal registered committee name, the information-collection notice and an applicable nondeductibility statement. The site must not assume `galinsky2028.us` is owned or available. Source: https://www.fec.gov/help-candidates-and-committees/making-disbursements/fundraising-campaign/ and https://www.fec.gov/help-candidates-and-committees/advertising-and-disclaimers/
5. **Treasury procedures:** record donors and lawful source funds; distinguish election designations; aggregate each contributor across **all four independent processors**; ensure maximum contributions are not retained; document excess/prohibited contributions, designated allocations, refunds, chargebacks, disputes and reconciliation; report actual settled funds and appropriate receipt dates. An HTTP redirect and synthetic sandbox completion are not contributions or reports. Source: https://www.fec.gov/help-candidates-and-committees/candidate-taking-receipts/contribution-limits/

## Exact donor language to preserve

See `docs/DONATION_COPY.md` and the original donor form `content/public/pages/donate.html`. Preserve its U.S. citizen/LPR, own funds, 18-plus, not a federal contractor, personal credit card only, exclusion of PAC/corporations/unions/national banks/FARA registrants/foreign nationals, non-deductibility, and the statement that the committee administers the campaign. Do not silently substitute a processor's eligibility copy.

## Additional launch-blocking engineering acceptance

- Verify legal committee name and FEC registration from an authoritative FEC filing before presenting it as independently verified.
- Confirm 2027–28 indexed personal contribution limits from official FEC publication and configurable per-election caps before live checkout.
- Verify committee-specific primary/general election designations and person-level aggregation across all four merchant accounts (including after account switches), not per-provider disconnected limits.
- Require signed, authenticated payment callback status and reconciliation exports from each provider. The preexisting four-way router does not implement this yet.
- Data collection, anti-straw-donor certification, best-efforts follow-ups, donor receipts and refunds must work in each processor's approved hosted checkout or a separately audited compliant intake. Never store card PAN/CVV in the campaign application.
- Do not activate contribution collection based on the new **sandbox-only** treasury-settings vault.
- Do not execute real charges, refunds, verification deposits or paid resources under the current zero-dollar owner budget.

The owner is the sole current treasurer and administrator. Additional delegated authority only after individual verified invitation and explicit owner approval.
