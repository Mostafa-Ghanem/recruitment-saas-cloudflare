/* oxlint-disable effect/noThrowStatement, effect/noNewError, effect/noTryCatch -- TanStack's promise-returning server-function boundary serializes validation failures as thrown errors. The Effect permission gate executes before D1 access. */
import { env } from 'cloudflare:workers'
import { Effect } from 'effect'
import { WorkspaceContext } from '@b2b-saas-starter/capabilities/workspace-context'
import { runWorkspaceCapabilities } from '../capabilities'
import { requireRequestSession } from './auth'
import { requireWorkspacePermission } from './authorize'
import {
  type RecruitmentApplication,
  type RecruitmentJob,
  type RecruitmentOverview,
  type RecruitmentStageEvent
} from './recruitment'

/**
 * Uses the existing Better Auth session, membership and suspension checks
 * BEFORE touching D1. Every statement is scoped to the resolved workspace.id;
 * the client-provided slug is never trusted as a database tenant key.
 * This first slice deliberately permits only owner/admin (organization:update).
 */
const STAGES = new Set([
  'new', 'screening', 'shortlisted', 'interview',
  'offer', 'hired', 'rejected', 'withdrawn'
])
const STATUSES = new Set(['draft', 'published', 'closed'])
const EMPLOYMENT_TYPES = new Set(['full_time', 'part_time', 'contract', 'internship'])

function clean(value: string, max: number): string {
  const normalized = value.trim()
  if (normalized.length > max) {
    throw new Error('Validation: input is too long')
  }
  return normalized
}

async function authorizedWorkspace(slug: string): Promise<{
  workspaceId: string
  role: 'owner' | 'admin' | 'member'
  db: D1Database
  actorUserId: string
}> {
  const session = await requireRequestSession()
  const result = await runWorkspaceCapabilities(
    slug,
    Effect.gen(function* () {
      yield* requireWorkspacePermission({ organization: ['update'] })
      const ctx = yield* WorkspaceContext
      const rawRole = ctx.actor?.role
      const role: 'owner' | 'admin' | 'member' = rawRole === 'owner' || rawRole === 'admin' ? rawRole : 'member'
      return { workspaceId: ctx.workspace.id, role }
    }),
    { userId: session.user.id }
  )
  if (!env.DB) {
    throw new Error('Recruitment requires a configured Cloudflare D1 database')
  }
  return { ...result, actorUserId: session.user.id, db: env.DB }
}

export async function loadRecruitmentHandler(input: {
  workspaceSlug: string
}): Promise<RecruitmentOverview> {
  const { workspaceId, role, db } = await authorizedWorkspace(input.workspaceSlug)
  const staleBefore = new Date(Date.now() - 48 * 60 * 60 * 1_000).toISOString()
  type CountRow = {
    jobs_count: number
    published_count: number
    applications_count: number
    interviewing_count: number
    new_count: number
    stale_count: number
  }
  const [jobResult, applicationResult, countRow, settingsRow] = await Promise.all([
    db.prepare(`SELECT j.id,j.title,j.department,j.location,j.employment_type,j.description,
      j.status,j.created_at,j.updated_at,
      (SELECT COUNT(*) FROM recruitment_applications a
        WHERE a.workspace_id=j.workspace_id AND a.job_id=j.id) AS application_count
      FROM recruitment_jobs j WHERE j.workspace_id=?
      ORDER BY j.created_at DESC,j.id DESC LIMIT 150`).bind(workspaceId)
      .all<RecruitmentJob>(),
    db.prepare(`SELECT a.id,a.candidate_id,c.full_name,c.email,c.phone,
      a.job_id,j.title AS job_title,a.stage,a.created_at
      FROM recruitment_applications a
      JOIN recruitment_candidates c ON c.id=a.candidate_id AND c.workspace_id=a.workspace_id
      JOIN recruitment_jobs j ON j.id=a.job_id AND j.workspace_id=a.workspace_id
      WHERE a.workspace_id=? ORDER BY a.created_at DESC,a.id DESC LIMIT 250`)
      .bind(workspaceId).all<RecruitmentApplication>(),
    db.prepare(`SELECT
      (SELECT COUNT(*) FROM recruitment_jobs WHERE workspace_id=?) AS jobs_count,
      (SELECT COUNT(*) FROM recruitment_jobs WHERE workspace_id=? AND status='published') AS published_count,
      (SELECT COUNT(*) FROM recruitment_applications WHERE workspace_id=?) AS applications_count,
      (SELECT COUNT(*) FROM recruitment_applications WHERE workspace_id=? AND stage='interview') AS interviewing_count,
      (SELECT COUNT(*) FROM recruitment_applications WHERE workspace_id=? AND stage='new') AS new_count,
      (SELECT COUNT(*) FROM recruitment_applications WHERE workspace_id=? AND stage='new' AND created_at < ?) AS stale_count
    `).bind(workspaceId, workspaceId, workspaceId, workspaceId, workspaceId, workspaceId, staleBefore)
      .first<CountRow>(),
    db.prepare(`SELECT accept_applications,privacy_policy_url
      FROM recruitment_application_settings WHERE workspace_id=?`)
      .bind(workspaceId).first<{ accept_applications: number; privacy_policy_url: string }>()
  ])
  const jobs = jobResult.results
  const applications = applicationResult.results
  return {
    jobs, applications, viewer: { role },
    settings: {
      acceptApplications: settingsRow?.accept_applications === 1,
      privacyPolicyUrl: settingsRow?.privacy_policy_url ?? '',
      runtimeConfigured: env.RECRUITMENT_PUBLIC_APPLY_ENABLED === 'true' &&
        Boolean(env.TURNSTILE_SITE_KEY && env.TURNSTILE_SECRET_KEY)
    },
    counts: {
      jobs: Number(countRow?.jobs_count ?? 0),
      published: Number(countRow?.published_count ?? 0),
      applications: Number(countRow?.applications_count ?? 0),
      interviewing: Number(countRow?.interviewing_count ?? 0),
      newApplications: Number(countRow?.new_count ?? 0),
      staleApplications: Number(countRow?.stale_count ?? 0)
    }
  }
}

export async function createRecruitmentJobHandler(input: {
  workspaceSlug: string
  title: string
  department: string
  location: string
  description: string
  employmentType: string
}): Promise<{ id: string }> {
  const { workspaceId, db } = await authorizedWorkspace(input.workspaceSlug)
  const title = clean(input.title, 150)
  const department = clean(input.department, 100)
  const location = clean(input.location, 100)
  const description = clean(input.description, 10_000)
  if (title.length < 3 || !EMPLOYMENT_TYPES.has(input.employmentType)) {
    throw new Error('Validation: job title or employment type is invalid')
  }
  const id = crypto.randomUUID()
  const now = new Date().toISOString()
  await db.prepare(`INSERT INTO recruitment_jobs
    (id,workspace_id,title,department,location,employment_type,description,status,created_at,updated_at)
    VALUES (?,?,?,?,?,?,?,'draft',?,?)`)
    .bind(id, workspaceId, title, department, location, input.employmentType, description, now, now).run()
  return { id }
}

export async function editRecruitmentJobHandler(input: {
  workspaceSlug: string
  jobId: string
  title: string
  department: string
  location: string
  description: string
  employmentType: string
}): Promise<void> {
  const { workspaceId, db } = await authorizedWorkspace(input.workspaceSlug)
  const title = clean(input.title, 150)
  if (title.length < 3 || !EMPLOYMENT_TYPES.has(input.employmentType)) {
    throw new Error('Validation: job title or employment type is invalid')
  }
  const update = await db.prepare(`UPDATE recruitment_jobs
    SET title=?,department=?,location=?,employment_type=?,description=?,updated_at=?
    WHERE workspace_id=? AND id=?`)
    .bind(title,clean(input.department,100),clean(input.location,100),
      input.employmentType,clean(input.description,10_000),new Date().toISOString(),
      workspaceId,input.jobId).run()
  if (update.meta.changes === 0) {
    throw new Error('Job not found in this workspace')
  }
}

export async function updateRecruitmentJobStatusHandler(input: {
  workspaceSlug: string
  jobId: string
  status: string
}): Promise<void> {
  const { workspaceId, db } = await authorizedWorkspace(input.workspaceSlug)
  if (!STATUSES.has(input.status)) {
    throw new Error('Validation: unsupported job status')
  }
  if (input.status === 'published') {
    const details = await db.prepare('SELECT description,location FROM recruitment_jobs WHERE workspace_id=? AND id=?')
      .bind(workspaceId,input.jobId).first<{ description: string; location: string }>()
    if (!details) {
      throw new Error('Job not found in this workspace')
    }
    if (details.description.trim().length < 80 || !details.location.trim()) {
      throw new Error('PUBLISH_DETAILS_REQUIRED')
    }
  }
  const update = await db.prepare(`UPDATE recruitment_jobs SET status=?,updated_at=?
    WHERE workspace_id=? AND id=?`)
    .bind(input.status, new Date().toISOString(), workspaceId, input.jobId).run()
  if (update.meta.changes === 0) throw new Error('Job not found in this workspace')
}

export async function addRecruitmentCandidateHandler(input: {
  workspaceSlug: string
  jobId: string
  fullName: string
  email: string
  phone: string
}): Promise<{ alreadyExists: boolean }> {
  const { workspaceId, db } = await authorizedWorkspace(input.workspaceSlug)
  const fullName = clean(input.fullName, 150)
  const email = clean(input.email, 250).toLowerCase()
  const phone = clean(input.phone, 40).replaceAll(/[\s().-]/g, '')
  if (fullName.length < 2 || (!email && !phone) || (phone !== '' && !/^\+?\d{7,15}$/.test(phone)) || (email !== '' && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))) {
    throw new Error('Validation: name and valid contact details are required')
  }
  const job = await db.prepare('SELECT id FROM recruitment_jobs WHERE id=? AND workspace_id=?')
    .bind(input.jobId, workspaceId).first()
  if (!job) {
    throw new Error('Validation: the selected job is unavailable')
  }
  // Reuse a candidate within the same workspace when their email matches,
  // or when both normalized phone and name match. A shared family phone
  // alone must never merge two different people.
  const existingCandidate = await db.prepare(`SELECT id FROM recruitment_candidates
    WHERE workspace_id=? AND
    ((? <> '' AND email=?) OR (? <> '' AND phone=? AND full_name=?))
    LIMIT 1`)
    .bind(workspaceId, email, email, phone, phone, fullName)
    .first<{ id: string }>()
  if (existingCandidate) {
    const previous = await db.prepare(`SELECT id FROM recruitment_applications
      WHERE workspace_id=? AND job_id=? AND candidate_id=? LIMIT 1`)
      .bind(workspaceId, input.jobId, existingCandidate.id).first()
    if (previous) {
      return { alreadyExists: true }
    }
    const applicationId = crypto.randomUUID()
    const now = new Date().toISOString()
    const actorSession = await requireRequestSession()
    const actorUserId = actorSession.user.id
    await db.batch([
      db.prepare(`INSERT INTO recruitment_applications
        (id,workspace_id,job_id,candidate_id,stage,created_at,updated_at)
        VALUES (?,?,?,?,'new',?,?)`)
        .bind(applicationId,workspaceId,input.jobId,existingCandidate.id,now,now),
      db.prepare(`INSERT INTO recruitment_stage_history
        (id,workspace_id,application_id,from_stage,to_stage,actor_user_id,created_at)
        VALUES (?,?,?,NULL,'new',?,?)`)
        .bind(crypto.randomUUID(),workspaceId,applicationId,actorUserId,now)
    ])
    return { alreadyExists: false }
  }
  const candidateId = crypto.randomUUID()
  const now = new Date().toISOString()
  const applicationId = crypto.randomUUID()
  const actorSession = await requireRequestSession()
  const actorUserId = actorSession.user.id
  await db.batch([
    db.prepare(`INSERT INTO recruitment_candidates (id,workspace_id,full_name,email,phone,created_at)
      VALUES (?,?,?,?,?,?)`).bind(candidateId,workspaceId,fullName,email,phone,now),
    db.prepare(`INSERT INTO recruitment_applications
      (id,workspace_id,job_id,candidate_id,stage,created_at,updated_at)
      VALUES (?,?,?,?,'new',?,?)`)
      .bind(applicationId,workspaceId,input.jobId,candidateId,now,now),
    db.prepare(`INSERT INTO recruitment_stage_history
      (id,workspace_id,application_id,from_stage,to_stage,actor_user_id,created_at)
      VALUES (?,?,?,NULL,'new',?,?)`)
      .bind(crypto.randomUUID(),workspaceId,applicationId,actorUserId,now)
  ])
  return { alreadyExists: false }
}

export async function moveRecruitmentApplicationHandler(input: {
  workspaceSlug: string
  applicationId: string
  stage: string
}): Promise<void> {
  const { workspaceId, actorUserId, db } = await authorizedWorkspace(input.workspaceSlug)
  if (!STAGES.has(input.stage)) {
    throw new Error('Validation: unsupported recruitment stage')
  }
  const application = await db.prepare(`SELECT stage FROM recruitment_applications
    WHERE workspace_id=? AND id=? LIMIT 1`)
    .bind(workspaceId, input.applicationId).first<{ stage: string }>()
  if (!application) {
    throw new Error('Application not found in this workspace')
  }
  if (application.stage === input.stage) {
    return
  }

  const now = new Date().toISOString()
  // The conditional update is optimistic: simultaneous edits cannot silently
  // both claim the same old stage. D1 batches are transactional, including the
  // audit INSERT that follows the UPDATE. A zero-row update must fail the
  // transaction rather than creating an inaccurate history row.
  const [update] = await db.batch([
    db.prepare(`UPDATE recruitment_applications
      SET stage=?,updated_at=? WHERE workspace_id=? AND id=? AND stage=?`)
      .bind(input.stage,now,workspaceId,input.applicationId,application.stage),
    db.prepare(`INSERT INTO recruitment_stage_history
      (id,workspace_id,application_id,from_stage,to_stage,actor_user_id,created_at)
      SELECT ?,workspace_id,id,stage,?,?,? FROM recruitment_applications
      WHERE workspace_id=? AND id=? AND stage=? AND changes()=1`)
      .bind(crypto.randomUUID(),application.stage,input.stage,actorUserId,now,
        workspaceId,input.applicationId,input.stage)
  ])
  if (!update || update.meta.changes === 0) {
    throw new Error('Application was updated by another user. Refresh and try again')
  }
}

/** Only company owners/admins can enable intake, and only with HTTPS privacy URL. */
export async function saveRecruitmentApplicationSettingsHandler(input: {
  workspaceSlug: string
  privacyPolicyUrl: string
  acceptApplications: boolean
}): Promise<void> {
  const { workspaceId, db } = await authorizedWorkspace(input.workspaceSlug)
  const urlString = clean(input.privacyPolicyUrl, 1000)
  if (input.acceptApplications || urlString) {
    let url: URL
    try { url = new URL(urlString) } catch { throw new Error('Enter a valid HTTPS privacy policy URL') }
    if (url.protocol !== 'https:' || url.username || url.password || url.hash ||
        url.hostname === 'localhost' || url.hostname === '127.0.0.1') {
      throw new Error('Privacy policy must use an ordinary public HTTPS URL')
    }
  }
  await db.prepare(`INSERT INTO recruitment_application_settings
    (workspace_id,accept_applications,privacy_policy_url,updated_at)
    VALUES (?,?,?,?)
    ON CONFLICT(workspace_id) DO UPDATE SET
      accept_applications=excluded.accept_applications,
      privacy_policy_url=excluded.privacy_policy_url,
      updated_at=excluded.updated_at`)
    .bind(workspaceId, input.acceptApplications ? 1 : 0, urlString, new Date().toISOString()).run()
}

/** Lazy, tenant-scoped timeline retrieval; no other company's history is exposed. */
export async function loadRecruitmentApplicationHistoryHandler(input: {
  workspaceSlug: string
  applicationId: string
}): Promise<Array<RecruitmentStageEvent>> {
  const { workspaceId, db } = await authorizedWorkspace(input.workspaceSlug)
  const app = await db.prepare('SELECT id FROM recruitment_applications WHERE workspace_id=? AND id=? LIMIT 1')
    .bind(workspaceId, input.applicationId).first()
  if (!app) {
    throw new Error('Application not found in this workspace')
  }
  const result = await db.prepare(`SELECT id,from_stage,to_stage,
      CASE WHEN actor_user_id IS NULL THEN 0 ELSE 1 END AS changed_by_team,created_at
    FROM recruitment_stage_history
    WHERE workspace_id=? AND application_id=?
    ORDER BY created_at DESC,id DESC LIMIT 100`)
    .bind(workspaceId,input.applicationId).all<RecruitmentStageEvent>()
  return result.results
}
