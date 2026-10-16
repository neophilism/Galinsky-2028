# Volunteer team and event coordination

Implemented 16 October 2026. This is implementation evidence for parts of G28-32,
G28-33 and G28-38, not full package acceptance or a public release.

## Current workflows

The owner creates a team and invites a verified email account. Invitations appear
inside that recipient's signed-in workspace, expire after seven days, and cannot
be forwarded to a different account. No invitation email is sent by this feature.
The recipient explicitly accepts and supplies a display name. Only owner-assigned
captains can coordinate their team; captains cannot promote themselves or other
members. Owners and captains see member display names and IDs, not email addresses.
Leaving/removal immediately ends team access and cancels that member's RSVPs.
New members cannot read weekly plans created before their membership revision.

Captains submit event proposals with timezone, capacity, venue, accessibility and
safety details. The owner reviews the exact revision and explicitly publishes or
cancels it. Drafts are not visible to ordinary members. Venue instructions are
visible only to managers and confirmed attendees. There is no public calendar or
attendee directory. Reservations are idempotent and capacity-limited, with FIFO
waitlists promoted when places become available. Cancelled events reject RSVPs.
RSVPs do not authorize spending, field activities, permits or recording.

## Persistence and privacy

Migration `014_volunteer_coordination.sql` must be applied before deploying this
code. Teams are JSON records with a row lock as the transaction boundary. Every
successful mutation writes `g28.audit_events` in the same database transaction.
Account rows are locked before team rows so account closure cannot race a new
membership/RSVP into an orphan record. Account exports include only the caller's
memberships/RSVPs. Closure removes memberships, invitations and reservations.
Operational audit entries are retained; full retention/hold policy is G28-49.

This is server-processed operational metadata, not end-to-end encrypted content.
Do not store incidents, sensitive reports, supporter lists or political profiles.
Operational text is length-limited, rendered as text, and accepts no executable
markup. The API checks sessions, same origin, CSRF and current team authority.

## Development and release

Local test/development only: set `COORDINATION_ENABLED=true` with the existing
verified account and owner configuration. In a production runtime, configuration
rejects that flag until the staff MFA/step-up integration is delivered. Do not
weaken that check to claim production acceptance. The ordinary account export and
closure code also need migration 014, even with the coordination UI disabled.

Run `npm test`, `npm run test:api` with an isolated local PostgreSQL database,
`npm run check`, `npm run typecheck`, `npm run build`, and
`npm run test:coordination-browser`. The browser test uses synthetic mail captured
in memory and is wired into both existing CI configurations.

## Remaining package scope

Staff MFA/step-up and full operational administration; signed event reminders and
cancellation notifications; aggregate outcome reports; reviewed contact handling;
protected incident workflows; live staff/volunteer acceptance. No full-package
completion is claimed merely from adding the persistence/API/UI/tests above.
