import { env } from 'cloudflare:workers'
import { Effect } from 'effect'
import { WorkspaceContext } from '@b2b-saas-starter/capabilities/workspace-context'
import { runWorkspaceCapabilities } from '../capabilities'
import { requireRequestSession } from './auth'
import { requireWorkspacePermission } from './authorize'
import type {
  RecruitmentApplication,
  RecruitmentJob,
  RecruitmentOverview
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
  role: string
  db: D1Database
}> {
  const session = await requireRequestSession()
  const result = await runWorkspaceCapabilities(
    slug,
    Effect.gen(function* () {
      yield* requireWorkspacePermission({ organization: ['update'] })
      const ctx = yield* WorkspaceContext
      return { workspaceId: ctx.workspace.id, role: ctx.actor?.role ?? 'member' }
    }),
    { userId: session.user.id }
  )
  if (!env.DB) {
    throw new Error('Recruitment requires a configured Cloudflare D1 database')
  }
  return { ...result, db: env.DB }
}

export async function loadRecruitmentHandler(input: {
  workspaceSlug: string
}): Promise<RecruitmentOverview> {
  const { workspaceId, role, db } = await authorizedWorkspace(input.workspaceSlug)
  const [jobResult, applicationResult, countResult] = await db.batch([
    db.prepare(`SELECT id,title,department,location,employment_type,description,status,created_at,updated_at
      FROM recruitment_jobs WHERE workspace_id=? ORDER BY created_at DESC,id DESC LIMIT 150`).bind(workspaceId),
    db.prepare(`SELECT a.id,a.candidate_id,c.full_name,c.email,c.phone,
      a.job_id,j.title AS job_title,a.stage,a.created_at
      FROM recruitment_applications a
      JOIN recruitment_candidates c ON c.id=a.candidate_id AND c.workspace_id=a.workspace_id
      JOIN recruitment_jobs j ON j.id=a.job_id AND j.workspace_id=a.workspace_id
      WHERE a.workspace_id=? ORDER BY a.created_at DESC,a.id DESC LIMIT 250`).bind(workspaceId),
    db.prepare(`SELECT
      (SELECT COUNT(*) FROM recruitment_jobs WHERE workspace_id=?) AS jobs_count,
      (SELECT COUNT(*) FROM recruitment_jobs WHERE workspace_id=? AND status='published') AS published_count,
      (SELECT COUNT(*) FROM recruitment_applications WHERE workspace_id=?) AS applications_count,
      (SELECT COUNT(*) FROM recruitment_applications WHERE workspace_id=? AND stage='interview') AS interviewing_count
    `).bind(workspaceId, workspaceId, workspaceId, workspaceId)
  ])
  const jobs = jobResult.results as RecruitmentJob[]
  const applications = applicationResult.results as RecruitmentApplication[]
  return {
    jobs, applications, viewer: { role },
    counts: {
      jobs: Number((countResult.results[0] as Record<string, unknown>)?.jobs_count ?? 0),
      published: Number((countResult.results[0] as Record<string, unknown>)?.published_count ?? 0),
      applications: Number((countResult.results[0] as Record<string, unknown>)?.applications_count ?? 0),
      interviewing: Number((countResult.results[0] as Record<string, unknown>)?.interviewing_count ?? 0)
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
  const description = clean(input.description, 10000)
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
      input.employmentType,clean(input.description,10000),new Date().toISOString(),
      workspaceId,input.jobId).run()
  if (update.meta.changes === 0) throw new Error('Job not found in this workspace')
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
}): Promise<void> {
  const { workspaceId, db } = await authorizedWorkspace(input.workspaceSlug)
  const fullName = clean(input.fullName, 150)
  const email = clean(input.email, 250).toLowerCase()
  const phone = clean(input.phone, 40)
  if (fullName.length < 2 || (!email && !phone) || (email !== '' && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))) {
    throw new Error('Validation: name and valid contact details are required')
  }
  const job = await db.prepare('SELECT id FROM recruitment_jobs WHERE id=? AND workspace_id=?')
    .bind(input.jobId, workspaceId).first()
  if (!job) {
    throw new Error('Validation: the selected job is unavailable')
  }
  const candidateId = crypto.randomUUID()
  const now = new Date().toISOString()
  await db.batch([
    db.prepare(`INSERT INTO recruitment_candidates (id,workspace_id,full_name,email,phone,created_at)
      VALUES (?,?,?,?,?,?)`).bind(candidateId,workspaceId,fullName,email,phone,now),
    db.prepare(`INSERT INTO recruitment_applications
      (id,workspace_id,job_id,candidate_id,stage,created_at,updated_at)
      VALUES (?,?,?,?,'new',?,?)`)
      .bind(crypto.randomUUID(),workspaceId,input.jobId,candidateId,now,now)
  ])
}

export async function moveRecruitmentApplicationHandler(input: {
  workspaceSlug: string
  applicationId: string
  stage: string
}): Promise<void> {
  const { workspaceId, db } = await authorizedWorkspace(input.workspaceSlug)
  if (!STAGES.has(input.stage)) {
    throw new Error('Validation: unsupported recruitment stage')
  }
  const update = await db.prepare(`UPDATE recruitment_applications
    SET stage=?,updated_at=? WHERE workspace_id=? AND id=?`)
    .bind(input.stage,new Date().toISOString(),workspaceId,input.applicationId).run()
  if (update.meta.changes === 0) throw new Error('Application not found in this workspace')
}
