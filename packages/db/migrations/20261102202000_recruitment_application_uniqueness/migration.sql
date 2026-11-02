-- Prevent concurrent duplicate applications for the same candidate and job.
-- Before applying to a populated tenant, check for existing duplicates.
CREATE UNIQUE INDEX recruitment_applications_workspace_job_candidate_uidx
  ON recruitment_applications(workspace_id, job_id, candidate_id);
