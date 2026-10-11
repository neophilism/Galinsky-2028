# Private, version-specific reading acknowledgments

For every currently **published, independently reviewed** volunteer material, the signed-in volunteer may select **I have read this version** or undo that record. This provides a private progress reminder and resolves a specific problem with long volunteer packages: volunteers can tell which current guide they have read.

## Exact behavior

- An acknowledgment is bound to account, material ID, **revision number**, and SHA-256 of the actual approved material body. Changing the text or approved revision automatically makes the previous acknowledgment stale.
- The server verifies the account/session, exact current published revision, content review state and CSRF on each write. Users cannot certify missing, draft or unreviewed files.
- Acknowledgment is not a comprehension score, orientation certificate, training qualification, supervisor approval or permission to perform regulated election work.
- The database stores only a fixed material ID, revision, body digest and timestamp, scoped to the account. No worksheet answers, contact lists, geographic targets or third-party political information are saved.
- The owner can undo a record. Account closure permanently deletes the records via foreign-key cascade. This feature provides no staff dashboard or volunteer profiling feed.

## Remaining prerequisites

The current materials catalog is intentionally empty until the campaign reviews and publishes appropriate files. The capability is tested with synthetic source records but does not itself supply or approve volunteer guides. Activity authorization remains separately gated by independent reviewers, current official evidence, training requirements and approved tools.

Deploy migration `003_material_reading.sql` before deploying API builds that use this feature. Validate transaction behavior in isolated staging and rehearse account deletion before enabling production sign-in. Passing unit or integration tests is not a deployed acceptance check.
