-- Recruitment public-intake opt-in. This migration is NOT applied to live tenant databases automatically.
CREATE TABLE recruitment_application_settings (
  workspace_id TEXT PRIMARY KEY NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  accept_applications INTEGER NOT NULL DEFAULT 0 CHECK (accept_applications IN (0, 1)),
  privacy_policy_url TEXT NOT NULL DEFAULT '',
  updated_at TEXT NOT NULL
);

ALTER TABLE recruitment_applications ADD COLUMN submission_key TEXT;
ALTER TABLE recruitment_applications ADD COLUMN utm_source TEXT NOT NULL DEFAULT '';
ALTER TABLE recruitment_applications ADD COLUMN utm_medium TEXT NOT NULL DEFAULT '';
ALTER TABLE recruitment_applications ADD COLUMN utm_campaign TEXT NOT NULL DEFAULT '';
ALTER TABLE recruitment_applications ADD COLUMN utm_content TEXT NOT NULL DEFAULT '';

-- Each submitted token is unique in a workspace, even across different jobs.
CREATE UNIQUE INDEX recruitment_applications_workspace_submission_uidx
  ON recruitment_applications(workspace_id, submission_key)
  WHERE submission_key IS NOT NULL;

-- Same person must not create duplicate candidate rows under concurrent submissions.
-- For the initial ATS schema there are no production applicants. If migrating
-- populated data, check/resolve duplicate emails or normalized (phone,name) first.
CREATE UNIQUE INDEX recruitment_candidates_workspace_email_uidx
  ON recruitment_candidates(workspace_id, email)
  WHERE email <> '';

CREATE UNIQUE INDEX recruitment_candidates_workspace_phone_name_uidx
  ON recruitment_candidates(workspace_id, phone, full_name)
  WHERE phone <> '';

CREATE TABLE recruitment_stage_history (
  id TEXT PRIMARY KEY NOT NULL,
  workspace_id TEXT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  application_id TEXT NOT NULL,
  from_stage TEXT,
  to_stage TEXT NOT NULL,
  actor_user_id TEXT,
  created_at TEXT NOT NULL,
  FOREIGN KEY(workspace_id, application_id)
    REFERENCES recruitment_applications(workspace_id, id) ON DELETE CASCADE
);
CREATE INDEX recruitment_stage_history_workspace_application_idx
  ON recruitment_stage_history(workspace_id, application_id, created_at);
