# Owner treasurer console — secure activation without passing banking details in chat

**Owner decision, 12 Oct 2026:** the candidate confirms that the existing named principal campaign committee is their committee and they personally serve as its treasurer. The candidate is the SOLE presently authorized administrator, with future invitation-only individual staff accounts. The target eventual domain `galinsky2028.us` is currently UNOWNED by the campaign. Maintain existing protected Render origins. No new Render service or paid plan changes. No real payment, refund, settlement test or other financial activity is authorized; owner has no funds available for live tests.

## Current implementation

- `/admin` in the EXISTING volunteer portal is a **restricted treasurer settings console** (not the general volunteer account settings): a bank account record, four independent sandbox merchant-credential slots, one-time invitation and revocation for future treasurers, auditors and reserved editors.
- Routes `/api/admin/settings`, `/api/admin/settings/bank`, `/api/admin/settings/providers/merchant-a` through `merchant-d`, and `/api/admin/grants` (including revoke) enforce a verified email session, role authorization, anti-CSRF token and origin check.
- Full bank-routing and account numbers, sandbox API keys and webhook secrets are encrypted with **AES-256-GCM** using the server-held `G28_TREASURY_VAULT_KEY`, stored as sealed ciphertext in PostgreSQL; the browser receives masked descriptions only. This is server-side encryption at rest, NOT end-to-end encryption. Keys are never stored in GitHub, login cookies, browser localStorage, console logs or API responses.
- Staff invitations are keyed to HMAC(email, `LOGIN_PEPPER`) and limited roles. Only configured owner can invite or revoke. Permission is rechecked for each request; revocation takes effect without a new login. Editors are RESERVED and cannot access treasury. No shared administrator password.
- Neither entering sandbox credentials nor adding a bank record activates online contributions or actually verifies a merchant. `DONATIONS_ENABLED` stays false. The four actual merchants remain contingent on separate underwriting and terms review.

## Owner setup and order of operations

The console is **not activated** merely by deploying its code. Its admin URLs are disabled until all conditions below are met. Do not supply account numbers or API keys to ChatGPT.

1. Verify the existing Portal/Neon PostgreSQL connection and run `npm run db:migrate` **against the exact assigned existing database** to apply migration `009_treasurer_vault_admin_rbac.sql`. Never create a new database to satisfy this.
2. In **existing Render volunteer portal service** `srv-db5v0lfavr4c73a62870`'s protected Environment editor, set **`G28_OWNER_ADMIN_EMAIL`** to the email you personally control. This email is the *only* initial owner identity; it is verified via an emailed one-time link, not through the shared preview password or GitHub identity.
3. Provision the already-supported verified email sender: `MAIL_PROVIDER=resend`, `RESEND_API_KEY`, `MAIL_FROM` (verified sender), and a real operational mail queue `MAIL_DELIVERY_MODE=inline`, `MAIL_WORKER_OPERATIONAL_APPROVED=true`; `DELIVERY_KEY` must be 32 random base64 bytes and `LOGIN_PEPPER` at least 32 random characters. If no verified email service is available, **DO NOT turn on admin sign-in** and do not input financial data.
4. Generate an independent **32-byte random base64** encryption key in your local password manager (for example, `openssl rand -base64 32`) and store it as `G28_TREASURY_VAULT_KEY` on that existing Portal service, not in GitHub. Back it up securely; loss prevents recovery of sealed vault records. Restrict environment edit permissions to yourself.
5. Only after migration, operational email verification, and the vault key are confirmed, set `G28_ADMIN_LOGIN_ENABLED=true` on the existing Portal service. Keep `SIGNUP_ENABLED=false`, `DONATIONS_ENABLED=false`, and `STAFF_IDENTITY_ENABLED=false`. Enable only by an authorized review of the actual service's startup logs and audit.
6. Enter the existing password-protected portal and request sign-in for your configured owner email. Verify the link on the same browser. The newly authorized `/admin` nav item appears after successful session verification. No other mailbox gets an owner role.
7. Enter your bank details and up to four **sandbox** provider credentials there. No credit-card details, donor information, real charges or refunds. Before entering a real merchant secret, request a separate production-adapter and operating-policy review; this console rejects live mode.
8. Privileged staff can be invited and later revoked on `/admin` by the owner. They have to prove email ownership to sign in; default initial grant list is empty.

## External service gates

Payment merchant underwriting, settlement bank ownership, four independent actual acquiring relationships, signed callback adapters, cross-provider donor limits, receipt/refund reconciliation and treasury approval must all be independently verified. An automated availability probe is NOT equivalent to verified card authorization or settled funds. No real payment is possible in this console. Secure storage does NOT represent active integration with Elavon, Worldpay or Fiserv: each will require a reviewed API adapter after account-specific terms are known.

The code uses real PostgreSQL for production. The in-memory admin store exists for automated tests only, never a real deployment. All sensitive changes create a redacted audit record. A production security review, authenticated browser and email-flow test and backup/restore rehearsal are still outstanding.

If the user cannot activate email sender now due to the zero-dollar budget, keep the vault unconfigured. Public site and policy documents may continue to progress independently; the console is staged for use when verified email is available.

**Processor shortlist correction, 2026-10-12:** Chase/Paymentech/WePay excluded by owner. No final four companies chosen. All options must be self-service, no required call or contact-sales process, no activation/monthly fees, no Stripe/Chase dependencies or political-specific restrictions. Assess independent acquirer groupings and written merchant terms; see `docs/operations/PROCESSOR_SELF_SERVICE_SCREEN_20261012.md`. The vault uses generic `merchant-a` through `merchant-d` slots until each merchant is actually approved.

## 17 October 2026: invitation-only mail-worker correction

Private owner/admin login does **not** require enabling general volunteer registration. The portal bootstrap already allowed an inline worker when either `G28_ADMIN_LOGIN_ENABLED` or `SIGNUP_ENABLED` was true, but the worker's own startup previously rejected all `SIGNUP_ENABLED=false` configurations. The runner and external-worker entrypoint now accept verified *admin-only* delivery, with no change to public account eligibility.

The verified Resend sender, protected database, secure login keys, separate owner mailbox, operationally approved delivery mode and protected preview access are still mandatory. No environment flag is toggled by this change and no invitation or real email is sent as part of CI. Keep `SIGNUP_ENABLED=false` until public enrollment itself is approved. Acceptance in CI uses synthetic mail transport; a live real-mail test is still required.
