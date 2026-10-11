-- Personal, non-sensitive checklist state. Self-reported; not fieldwork verification.
-- No notes, voter data, contacts, addresses or timestamps of third-party activities.
CREATE TABLE IF NOT EXISTS g28.task_progress(
 account_id uuid NOT NULL REFERENCES g28.accounts(id) ON DELETE CASCADE,
 task_id text NOT NULL CHECK(length(task_id) BETWEEN 1 AND 100),
 completed_at timestamptz NOT NULL DEFAULT now(),
 PRIMARY KEY(account_id,task_id)
);
