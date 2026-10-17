# Versioned first-hour orientation

This is an approved *technical self-check* for basic volunteer readiness and safe use of the campaign site. It is **not** approved jurisdictional training, a legal certification, staff review or activation of petitioning, canvassing or other regulated work. It publishes no historic private volunteer archive content.

A verified volunteer opens `/orientation` from the existing portal navigation and answers three basic multiple-choice questions about current review, respecting others' information and activity approvals. `GET /api/orientation` exposes the current revision and questions without answer keys. `POST /api/orientation/complete` requires the session CSRF header, exact revision, three known answers and valid choices. Only a passing self-check writes the single completion marker `orientation-first-hour-v1` to the user's existing durable `g28.task_progress` record. It stores neither the answers nor any third-party information. A new revision must change its marker so stale completion cannot count for updated material.

The activity gate remains unchanged, all regulated modules remain inactive without actual approvals, and a quiz cannot set any `activity_modules` records. The private account export automatically includes this marker because it already exports the user's personal checklist history. Account closure cascades to it. No new database migration, user email, payment provider or external service is required.

**Remaining G28-28:** A formally reviewed orientation deck/source with accessible slide text, publication approvals, instructor guidance and real training-module lifecycle. Those cannot be invented from this short self-check. All release gating and external inputs remain unchanged.
