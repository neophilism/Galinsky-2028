# Galinsky 2028 — external inputs still required for full acceptance

Updated 12 October 2026. This is an owner/treasurer/security handoff, not a
claim that the complete 60-package system is implemented, deployed, approved,
or publicly launched. Actual implementation must continue independently of
these inputs. None of the categories below may be fulfilled with demo success,
fake account identities, self-issued approvals or arbitrary feature flags.

## 1. Temporary issue video (NOW supplied, binary transfer pending)

The owner supplied "Satan Bothering Jesus.mp4", 15 seconds, for the same
temporary placeholder on Kirk–Evers, The Garden and The Cornerstone. The
private-preview website has code to serve ONE verified local file at
apps/web/public/assets/issue-video-placeholder.mp4, with accessible HTML5
controls, a prominent disclaimer that it does NOT explain those issues,
and authenticated byte-range seeking. The 2.8MB optimized H.264/AAC copy
is available as a generated download in the original ChatGPT session.
It has not reached GitHub/Render because the ChatGPT execution container
cannot reach either external host for binary uploads. An authorized operator
must upload the prepared file at that EXACT private-repo location, verify
its provenance/rights, and run a manual Render redeploy. The code shows
a harmless "coming soon" panel until the file exists; DO NOT claim video
is playing based only on merged source.

Three distinct final videos, captions/transcripts and publication approval
are **post-placeholder publication inputs**, not a reason to delay other work.

## 2. Email/verified accounts

The campaign must authorize its FROM address/domain, provision a verified
transactional sender (currently code expects Resend), add provider API
credentials and completed SPF/DKIM DNS to the protected Render service.
The development agent can create authentication keys and delivery secrets
without asking the user to paste them into chat. The outbox/worker and
real end-to-end delivery must pass before SIGNUP_ENABLED is turned on.
A public volunteer can then sign up, verify and return across devices.
Do not confuse the private-preview HTTP Basic login with a staff/volunteer
account or passkey/MFA.

## 3. Donation processing — NEWER OWNER DECISION (12 October 2026)

**Stripe is prohibited across all of the user's projects and is NOT an
acceptable campaign payment option. DO NOT REQUEST A STRIPE API KEY,
restore a Stripe adapter or add an indirect Stripe dependency.** Earlier
messages that assumed Stripe was the planned provider are superseded.

Owner's latest requirements: a provider-neutral system with FOUR genuinely
independent merchant/acquiring relationships, all screened for equal
commercial treatment of lawful political organizations versus comparable
lawful nonpolitical entities. Discretionary campaign-specific underwriting,
terms, increased prices or viewpoint-related restrictions disqualify the
vendor. Normal legally required identity, anti-fraud and merchant-category
controls still apply; do not mislabel the merchant.

The complete user experience must have ONE donation button. After all four
are independently approved, selection randomly rotates among the eligible
four providers. It must detect systematic checkout/settlement failures,
automatically remove an affected provider from new selections, and restore
it after a proven ordinary technical fix. If evidence supports deliberate
financial lawfare, the owner requires permanent provider removal.
No automatic fallback may replay a payment or charge a donor twice.

The earlier PR #47 implemented only FOUR static hosted-checkout slots and
direct donor choice, not the later one-button weighted/random selection or
automatic status evaluation. **Those updated requirements remain actual
engineering work and must not be marked complete.** A provider's hostname
does not prove it is independent of another provider's acquirer/network.
Keep payment collection OFF until the owner/treasurer has verified ALL FOUR
processors, their agreements, underwriting/acquirer independence, test
transactions, refund/recurring handling and settlement reconciliation.

What the owner must supply/approve before fundraising goes live:
- Legal campaign committee identity and registration, treasurer contact,
  authorized settlement accounts, and an approved donor disclosure;
- Complete terms and evidence of equal treatment, actual merchant approval,
  payout/acquirer relationships and hosted checkout URLs for FOUR distinct
  allowed processors, none directly/indirectly reliant on Stripe;
- Appropriate credentials and authentication/webhook/reporting channels for
  each processor (through secure Render configuration, NEVER in chat);
- Current 2027–2028 election-specific contribution policy, donor eligibility
  and the campaign's personal-credit-card-only constraint, including real
  processor enforcement/remediation, recurring handling and refund controls;
- Explicit approval of costs, final treasurer reconciliation, live test-charge
  authorization and documented, independently justified processor takedown
  evidence before permanent removal.

See docs/DONATION_PROCESSOR.md for the underlying non-Stripe policy.

## 4. Public identity, links and legislative content

- Confirm the production site domain (source archive names galinsky2028.us),
  DNS control and official contact address. Existing onrender origins are
  private-preview URLs and not verified canonical production domains.
- Kirk–Evers: recovered a newer 58-page v1.0 September 10, 2026
  legislative DISCUSSION DRAFT from the owner's private Library. It is
  NOT introduced or approved for publication. Owner/counsel must approve
  an exact final bill + files, summary and accessible legal downloads;
  do not request re-upload of the known draft.
- The Garden and Cornerstone: GitHub repositories both exist, and there is
  a separate Cornerstone PREVIEW Render service. Neither has a verified
  official canonical published website URL. Owner must confirm the
  dedicated final destinations/current policy revisions before links
  go live; never substitute an unapproved preview.
- Existing supplied candidate portrait and original mockup are already
  available. Additional biography/photographs require verifiable facts,
  publication rights and approval only when actually needed.

## 5. Volunteer archive review, staff and sensitive data

- Recovered original September 2026 35 noncompiled Markdown source
  documents into PRIVATE repository source-edition-1; original 36th is
  a duplicate compiled manual retained only in Library. All material
  remains UNREVIEWED and UNPUBLISHED. Authorized editors/reviewers must
  reconcile the universal core, all twelve playbooks, Garden/Cornerstone
  historical kits and a new Kirk–Evers kit before declaring guidance
  CURRENT. No age/jurisdiction-specific field authority is inferred.
- Owner identifies initial staff administrators, editors, independent
  reviewers, safety contacts and treasurer, plus MFA/passkey credentials
  through the approved identity system. Agents must implement the UI,
  permissions and recovery; identifying a person is not itself completion.
- Protected/private incidents and records require a specific independently
  reviewed E2EESA profile, recipient/key custody/recovery policy and a
  genuine expert signoff before encryption-related collection is enabled.
  Ordinary low-risk volunteering can proceed with unavailable restricted
  modules honestly inactive.
- State petitioning, voter registration, phone/SMS and event programs
  require current approved jurisdiction modules, permitted providers,
  legal instructions and activity signoff only when those PROGRAMS
  are activated; missing authorization is not permission to run them.

## 6. Production and operational approvals

The owner must authorize actual operating cost/tier changes (if needed for
email worker, durable backups, monitoring, object storage and uptime), DNS,
technical handoff/operator contacts, security review and accessibility
review, treasury processing and live launch. Developers should perform
all feasible pre-release work and tests without asking the owner to select
ordinary libraries, write database code, add dummy users or approve
fictitious provider success.

## What is NOT yet complete

Two Render services are deployed and password protected; neither being live
nor the repository having merged PRs constitutes completion of the full
60-package plan. Persistent accounts are real but signup delivery is gated.
Staff UI/MFA, current materials publishing, verified field workflows,
protected-content E2EE, treasurer-led real Stripe flow, end-to-end release
rehearsal, backups and independent reviews remain substantial ENGINEERING
work beyond these owner-provided inputs. The authoritative register retains
the status of every package, and every actual release must have exact SHA,
CI test evidence, owner approvals and live smoke-check references.
