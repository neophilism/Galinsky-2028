# E2EESA preliminary component and data-flow discovery — 17 October 2026

This maps known source components and data boundaries into `security/e2eesa-inventory.json` under the repository's existing **schemaVersion 1 discovery record**. Every component points to concrete checked-in source files; every observed flow names source, destination, data classification and processing authority.

The pinned E2EESA upstream `schemas/component-inventory.schema.json` is version **0.2** and requires exact source/artifact SHA-256 digests plus host obligations and protocol profile references. **This discovery file is not that conformance artifact.** No complete source/build/runtime coverage, reviewed profiles, cryptographic conformance or qualified independent review is asserted.

Priorities for the next engineering and validation passes: (1) enumerate all actual deployed services, storage privileges, backups, logs, integrations and configuration; (2) complete threat/data-flow audit and reviewed applicability rationale for each component; (3) retain fail-closed protection for key directories, confidential reports and attachments until E2EESA reviewed cryptographic profiles and recipient authorities are implemented; (4) rerun all six source-bound security gates and applicable provider/browser tests. Independent expert review stays a distinct stage and should not stall unrelated engineering, but protected flows must remain disabled until their actual safety requirements are met.

`tests/e2eesa-inventory.test.mjs` prevents the discovery map from dropping critical security boundaries, inventing E2EE for intentionally server-processed data or marking the status certified on the strength of this file.
