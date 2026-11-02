import { createServerFn } from '@tanstack/react-start'
import { Schema } from 'effect'

/**
 * Recruitment ATS first slice. Client-safe functions: business logic and
 * Cloudflare bindings only in recruitment.effects.ts (dynamic imports).
 */
export type RecruitmentJob = {
  id: string
  title: string
  department: string
  location: string
  employment_type: string
  description: string
  status: 'draft' | 'published' | 'closed'
  created_at: string
  updated_at: string
}

export type RecruitmentApplication = {
  id: string
  candidate_id: string
  full_name: string
  email: string
  phone: string
  job_id: string
  job_title: string
  stage: string
  created_at: string
}

export type RecruitmentOverview = {
  jobs: RecruitmentJob[]
  applications: RecruitmentApplication[]
  settings: { acceptApplications: boolean; privacyPolicyUrl: string; runtimeConfigured: boolean }
  viewer: { role: string }
  counts: { jobs: number; published: number; applications: number; interviewing: number; newApplications: number; staleApplications: number }
}

const WorkspaceInput = Schema.Struct({ workspaceSlug: Schema.NonEmptyString })
const CreateJobInput = Schema.Struct({
  workspaceSlug: Schema.NonEmptyString,
  title: Schema.String,
  department: Schema.String,
  location: Schema.String,
  employmentType: Schema.String,
  description: Schema.String
})
const EditJobInput = Schema.Struct({
  workspaceSlug: Schema.NonEmptyString,
  jobId: Schema.NonEmptyString,
  title: Schema.String,
  department: Schema.String,
  location: Schema.String,
  employmentType: Schema.String,
  description: Schema.String
})
const JobStatusInput = Schema.Struct({
  workspaceSlug: Schema.NonEmptyString,
  jobId: Schema.NonEmptyString,
  status: Schema.String
})
const CreateCandidateInput = Schema.Struct({
  workspaceSlug: Schema.NonEmptyString,
  jobId: Schema.NonEmptyString,
  fullName: Schema.String,
  phone: Schema.String,
  email: Schema.String
})
const MoveApplicationInput = Schema.Struct({
  workspaceSlug: Schema.NonEmptyString,
  applicationId: Schema.NonEmptyString,
  stage: Schema.String
})

export const loadRecruitmentServerFn = createServerFn({ method: 'GET' })
  .validator(Schema.decodeUnknownSync(WorkspaceInput))
  .handler(async ({ data }): Promise<RecruitmentOverview> => {
    const { loadRecruitmentHandler } = await import('./recruitment.effects')
    return loadRecruitmentHandler(data)
  })

export const createRecruitmentJobServerFn = createServerFn({ method: 'POST' })
  .validator(Schema.decodeUnknownSync(CreateJobInput))
  .handler(async ({ data }): Promise<{ id: string }> => {
    const { createRecruitmentJobHandler } = await import('./recruitment.effects')
    return createRecruitmentJobHandler(data)
  })

export const editRecruitmentJobServerFn = createServerFn({ method: 'POST' })
  .validator(Schema.decodeUnknownSync(EditJobInput))
  .handler(async ({ data }): Promise<void> => {
    const { editRecruitmentJobHandler } = await import('./recruitment.effects')
    return editRecruitmentJobHandler(data)
  })

export const updateRecruitmentJobStatusServerFn = createServerFn({ method: 'POST' })
  .validator(Schema.decodeUnknownSync(JobStatusInput))
  .handler(async ({ data }): Promise<void> => {
    const { updateRecruitmentJobStatusHandler } = await import('./recruitment.effects')
    return updateRecruitmentJobStatusHandler(data)
  })

export const addRecruitmentCandidateServerFn = createServerFn({ method: 'POST' })
  .validator(Schema.decodeUnknownSync(CreateCandidateInput))
  .handler(async ({ data }): Promise<{ alreadyExists: boolean }> => {
    const { addRecruitmentCandidateHandler } = await import('./recruitment.effects')
    return addRecruitmentCandidateHandler(data)
  })

export const moveRecruitmentApplicationServerFn = createServerFn({ method: 'POST' })
  .validator(Schema.decodeUnknownSync(MoveApplicationInput))
  .handler(async ({ data }): Promise<void> => {
    const { moveRecruitmentApplicationHandler } = await import('./recruitment.effects')
    return moveRecruitmentApplicationHandler(data)
  })

const SaveApplicationSettingsInput = Schema.Struct({
  workspaceSlug: Schema.NonEmptyString,
  privacyPolicyUrl: Schema.String,
  acceptApplications: Schema.Boolean
})

export const saveRecruitmentApplicationSettingsServerFn = createServerFn({ method: 'POST' })
  .validator(Schema.decodeUnknownSync(SaveApplicationSettingsInput))
  .handler(async ({ data }): Promise<void> => {
    const { saveRecruitmentApplicationSettingsHandler } = await import('./recruitment.effects')
    return saveRecruitmentApplicationSettingsHandler(data)
  })

export type RecruitmentStageEvent = {
  id: string
  from_stage: string | null
  to_stage: string
  changed_by_team: number
  created_at: string
}

const ApplicationHistoryInput = Schema.Struct({
  workspaceSlug: Schema.NonEmptyString,
  applicationId: Schema.NonEmptyString
})

export const loadRecruitmentApplicationHistoryServerFn = createServerFn({ method: 'GET' })
  .validator(Schema.decodeUnknownSync(ApplicationHistoryInput))
  .handler(async ({ data }): Promise<RecruitmentStageEvent[]> => {
    const { loadRecruitmentApplicationHistoryHandler } = await import('./recruitment.effects')
    return loadRecruitmentApplicationHistoryHandler(data)
  })
