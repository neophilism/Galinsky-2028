# Private first-action checklist

This feature records only a fixed task ID and an account-scoped completion timestamp for **nonrestricted first actions**. It does not record names of contacts, policy preferences, votes, locations, activity descriptions or donations. Completion is a volunteer-controlled reminder and is **not** reviewed, certified, forwarded, or represented as authorization for regulated outreach.

- Authentication and CSRF are required for progress mutations.
- Eligibility is rechecked on every write against the server-owned `starterTasks` manifest. Restricted actions never gain a completion control or a write endpoint.
- The account may undo a completed item at any time. The account-close action deletes all progress by foreign-key cascade (and in the development memory store).
- Personal checklist state is visible only to the owner; there are no team dashboards or campaign analytics for this data.
- This feature is not a substitute for separately reviewed training, team coordination, field-activity approval or campaign compliance reporting.
