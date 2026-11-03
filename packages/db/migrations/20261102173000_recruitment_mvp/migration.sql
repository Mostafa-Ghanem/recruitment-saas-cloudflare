-- Recruitment ATS phase 1. Workspace-scoped storage. No public application intake yet.
CREATE TABLE recruitment_jobs (
  id TEXT PRIMARY KEY NOT NULL,
  workspace_id TEXT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  department TEXT NOT NULL DEFAULT '',
  location TEXT NOT NULL DEFAULT '',
  employment_type TEXT NOT NULL DEFAULT 'full_time' CHECK (employment_type IN ('full_time','part_time','contract','internship')),
  description TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','published','closed')),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  UNIQUE(workspace_id,id)
);
--> statement-breakpoint
CREATE INDEX recruitment_jobs_workspace_created_idx ON recruitment_jobs(workspace_id,created_at);
--> statement-breakpoint
CREATE INDEX recruitment_jobs_workspace_status_idx ON recruitment_jobs(workspace_id,status);
--> statement-breakpoint
CREATE TABLE recruitment_candidates (
  id TEXT PRIMARY KEY NOT NULL,
  workspace_id TEXT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  email TEXT NOT NULL DEFAULT '',
  phone TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL,
  UNIQUE(workspace_id,id)
);
--> statement-breakpoint
CREATE INDEX recruitment_candidates_workspace_created_idx ON recruitment_candidates(workspace_id,created_at);
--> statement-breakpoint
CREATE TABLE recruitment_applications (
  id TEXT PRIMARY KEY NOT NULL,
  workspace_id TEXT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  job_id TEXT NOT NULL,
  candidate_id TEXT NOT NULL,
  stage TEXT NOT NULL DEFAULT 'new' CHECK (stage IN ('new','screening','shortlisted','interview','offer','hired','rejected','withdrawn')),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  UNIQUE(workspace_id,id),
  FOREIGN KEY(workspace_id,job_id) REFERENCES recruitment_jobs(workspace_id,id) ON DELETE CASCADE,
  FOREIGN KEY(workspace_id,candidate_id) REFERENCES recruitment_candidates(workspace_id,id) ON DELETE CASCADE
);
--> statement-breakpoint
CREATE INDEX recruitment_applications_workspace_stage_idx ON recruitment_applications(workspace_id,stage);
--> statement-breakpoint
CREATE INDEX recruitment_applications_workspace_created_idx ON recruitment_applications(workspace_id,created_at);
--> statement-breakpoint
CREATE INDEX recruitment_applications_workspace_job_idx ON recruitment_applications(workspace_id,job_id);
--> statement-breakpoint
CREATE INDEX recruitment_applications_workspace_candidate_idx ON recruitment_applications(workspace_id,candidate_id);
