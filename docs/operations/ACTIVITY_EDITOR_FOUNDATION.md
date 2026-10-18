# Versioned activity module authoring and review — G28-29 partial

The existing published-module read-only preview intentionally does not let a
volunteer activate regulated field activities. This change supplies a **pure
source-bound state machine** that can underpin future administration. It is
not a staff authentication integration, staff dashboard or live publication
endpoint, and no migrations or production flags are changed by this PR.

The editor accepts only enumerated structural fields: scope, bounded lists of
training and approved tools, HTTPS official-source references, source digests,
and exact UTC effective times. Current evidence is rechecked at publication.
Source edits increment the actual module revision and clear all prior reviews.
Two distinct verified staff reviewers must each sign a digest for the exact
revision; the editor cannot self-review and the publisher cannot be one of the
two reviewers. Every transition carries a monotonic `stateVersion` precondition
to detect concurrent changes. Revocation adds a newer, unpublishable revision
so the latest-row reader never falls back to an old approval. Public projections
continue to disclose no verifier identity/source URLs and always say
`activityAuthorized:false`.

**Still required before any actual regulated field release:** persistent
serialized activity revision store with transaction-level compare-and-swap,
verified user identity and staff MFA, independently assigned verification and
publication scopes, legal/current state sources, live owner approval, revocation
administration, personal training/tool/jurisdiction checks, and end-to-end
verified restricted-action gates. No feature flag, draft or test constitutes
such authorization. Package G28-29 stays in progress.
