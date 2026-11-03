/* oxlint-disable effect/noThrowStatement, effect/noNewError, effect/noTryCatch -- TanStack's promise-returning server-function boundary serializes validation failures as thrown errors. The Effect permission gate executes before D1 access. */
import { env } from 'cloudflare:workers'
import { Schema } from 'effect'
import { currentRequest } from '../request-context'
import { type PublicApplyInput, type PublicApplyResult } from './public-application'

const TurnstilePayload = Schema.Struct({
  success: Schema.Boolean,
  action: Schema.optional(Schema.String),
  hostname: Schema.optional(Schema.String)
})
const ACTION = 'recruitment_apply'
const RATE_LIMIT = 10
const HOUR_SECONDS = 3600

function trim(input: string, max: number, field: string): string {
  const value = input.trim()
  if (value.length > max) {
    throw new Error(`Invalid ${field}`)
  }
  return value
}

function validPrivacyUrl(raw: string): boolean {
  const url = URL.parse(raw)
  return (
    url?.protocol === 'https:' &&
    !url.username &&
    !url.password &&
    !url.hash &&
    url.hostname.length > 3 &&
    !/^(localhost|127\.0\.0\.1)$/i.test(url.hostname)
  )
}

async function verifyTurnstile(
  token: string,
  secret: string,
  request: Request
): Promise<void> {
  if (!token || token.length > 2048) {
    throw new Error('Please complete the security check')
  }
  const ip = request.headers.get('CF-Connecting-IP') || ''
  const body = new URLSearchParams({ secret, response: token })
  if (ip) {
    body.set('remoteip', ip)
  }
  let answer: typeof TurnstilePayload.Type
  try {
    const response = await fetch(
      'https://challenges.cloudflare.com/turnstile/v0/siteverify',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body,
        signal: AbortSignal.timeout(10_000)
      }
    )
    if (!response.ok) {
      throw new Error('Turnstile unavailable')
    }
    answer = Schema.decodeUnknownSync(TurnstilePayload)(await response.json())
  } catch {
    throw new Error('Security check unavailable. Please try again')
  }
  if (
    !answer.success ||
    answer.action !== ACTION ||
    answer.hostname !== new URL(request.url).hostname
  ) {
    throw new Error('Security check failed. Please try again')
  }
}

async function applyThrottle(
  db: D1Database,
  request: Request,
  workspaceId: string
): Promise<void> {
  const ip = request.headers.get('CF-Connecting-IP')
  // Real public traffic must come through Cloudflare; fail closed without a trusted IP.
  if (!ip || !env.BETTER_AUTH_SECRET) {
    throw new Error('Applications temporarily unavailable')
  }
  const now = Math.floor(Date.now() / 1000)
  const keyBytes = await crypto.subtle.digest(
    'SHA-256',
    new TextEncoder().encode(
      `${env.BETTER_AUTH_SECRET}\nrecruitment\n${ip}\n${workspaceId}`
    )
  )
  const key = [...new Uint8Array(keyBytes)]
    .map((x) => x.toString(16).padStart(2, '0'))
    .join('')
  const row = await db
    .prepare(`INSERT INTO recruitment_apply_rate_limits (key,hits,expires_at)
    VALUES (?,1,?)
    ON CONFLICT(key) DO UPDATE SET
      hits = CASE WHEN expires_at <= ? THEN 1 ELSE hits + 1 END,
      expires_at = CASE WHEN expires_at <= ? THEN excluded.expires_at ELSE expires_at END
    RETURNING hits`)
    .bind(key, now + HOUR_SECONDS, now, now)
    .first<{ hits: number }>()
  if (!row || row.hits > RATE_LIMIT) {
    throw new Error('Too many attempts. Try again later')
  }
}

/**
 * P0 server-authoritative application intake. Disabled unless the deployment
 * flag, both Turnstile keys and per-company privacy opt-in are all configured.
 * No CVs, secrets or candidate personal data are emitted to logs/analytics.
 */
export async function submitPublicApplicationHandler(
  input: PublicApplyInput
): Promise<PublicApplyResult> {
  if (
    env.RECRUITMENT_PUBLIC_APPLY_ENABLED !== 'true' ||
    !env.TURNSTILE_SITE_KEY ||
    !env.TURNSTILE_SECRET_KEY ||
    !env.DB
  ) {
    throw new Error('Applications are not yet enabled for this site')
  }
  const request = currentRequest()
  if (!request) {
    throw new Error('Request unavailable')
  }
  const expectedOrigin = new URL(request.url).origin
  if (request.headers.get('Origin') !== expectedOrigin) {
    throw new Error('Origin rejected')
  }

  const workspaceSlug = trim(input.workspaceSlug, 120, 'workspace')
  const jobId = trim(input.jobId, 100, 'job')
  const key = trim(input.submissionKey, 60, 'submission key')
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(key)) {
    throw new Error('Invalid submission key')
  }
  const fullName = trim(input.fullName, 150, 'name')
  const phone = trim(input.phone, 40, 'phone').replaceAll(/[\s().-]/g, '')
  const email = trim(input.email, 250, 'email').toLowerCase()
  if (
    fullName.length < 2 ||
    (!phone && !email) ||
    (phone !== '' && !/^\+?\d{7,15}$/.test(phone)) ||
    (email !== '' && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
  ) {
    throw new Error('Please enter your name and a valid phone number or email')
  }
  const db = env.DB
  const job = await db
    .prepare(`SELECT j.id,j.workspace_id,s.privacy_policy_url
    FROM recruitment_jobs j JOIN workspaces w ON w.id=j.workspace_id
    JOIN recruitment_application_settings s ON s.workspace_id=w.id
    WHERE w.slug=? AND w.suspensionStatus='active' AND j.id=? AND j.status='published'
      AND s.accept_applications=1 AND s.privacy_policy_url <> ''
    LIMIT 1`)
    .bind(workspaceSlug, jobId)
    .first<{ id: string; workspace_id: string; privacy_policy_url: string }>()
  if (!job || !validPrivacyUrl(job.privacy_policy_url)) {
    throw new Error('Applications for this job are unavailable')
  }

  // Network retries are safe: one high-entropy key is only ever accepted for
  // one job in one workspace, and no candidate attributes are returned.
  const prior = await db
    .prepare(`SELECT id FROM recruitment_applications
    WHERE workspace_id=? AND job_id=? AND submission_key=? LIMIT 1`)
    .bind(job.workspace_id, jobId, key)
    .first<{ id: string }>()
  if (prior) {
    return {
      outcome: 'already_submitted',
      reference: prior.id.slice(0, 8).toUpperCase()
    }
  }

  await applyThrottle(db, request, job.workspace_id)
  await verifyTurnstile(input.turnstileToken, env.TURNSTILE_SECRET_KEY, request)

  const existing = await db
    .prepare(`SELECT id,full_name FROM recruitment_candidates
    WHERE workspace_id=? AND
      ((? <> '' AND email=?) OR (? <> '' AND phone=? AND full_name=?))
    LIMIT 1`)
    .bind(job.workspace_id, email, email, phone, phone, fullName)
    .first<{ id: string; full_name: string }>()
  // Email accounts can be shared by families: do not silently expose or merge
  // another person's record if the name does not match.
  if (existing && existing.full_name !== fullName) {
    throw new Error('Please use your own contact details to apply')
  }
  if (existing) {
    const duplicate = await db
      .prepare(`SELECT id FROM recruitment_applications
      WHERE workspace_id=? AND job_id=? AND candidate_id=? LIMIT 1`)
      .bind(job.workspace_id, jobId, existing.id)
      .first<{ id: string }>()
    if (duplicate) {
      return {
        outcome: 'already_submitted',
        reference: duplicate.id.slice(0, 8).toUpperCase()
      }
    }
  }

  const now = new Date().toISOString()
  const candidateId = existing?.id ?? crypto.randomUUID()
  const applicationId = crypto.randomUUID()
  const sources = [
    input.utmSource,
    input.utmMedium,
    input.utmCampaign,
    input.utmContent
  ].map((value) => trim(value, 120, 'campaign source'))
  const statements: Array<ReturnType<typeof db.prepare>> = [
    ...(existing
      ? []
      : [
          db
            .prepare(`INSERT INTO recruitment_candidates
        (id,workspace_id,full_name,email,phone,created_at) VALUES (?,?,?,?,?,?)`)
            .bind(candidateId, job.workspace_id, fullName, email, phone, now)
        ]),
    db
      .prepare(`INSERT INTO recruitment_applications
      (id,workspace_id,job_id,candidate_id,stage,submission_key,
       utm_source,utm_medium,utm_campaign,utm_content,created_at,updated_at)
      VALUES (?,?,?,?,'new',?,?,?,?,?,?,?)`)
      .bind(
        applicationId,
        job.workspace_id,
        jobId,
        candidateId,
        key,
        ...sources,
        now,
        now
      ),
    db
      .prepare(`INSERT INTO recruitment_stage_history
      (id,workspace_id,application_id,from_stage,to_stage,actor_user_id,created_at)
      VALUES (?,?,?,NULL,'new',NULL,?)`)
      .bind(crypto.randomUUID(), job.workspace_id, applicationId, now)
  ]
  // Cloudflare D1 batch is transactional; if candidate/app/history creation
  // races with a unique index, it fails together instead of creating orphans.
  try {
    await db.batch(statements)
  } catch {
    const retry = await db
      .prepare(`SELECT id FROM recruitment_applications
      WHERE workspace_id=? AND job_id=? AND submission_key=? LIMIT 1`)
      .bind(job.workspace_id, jobId, key)
      .first<{ id: string }>()
    if (retry) {
      return {
        outcome: 'already_submitted',
        reference: retry.id.slice(0, 8).toUpperCase()
      }
    }
    throw new Error('Could not save your request. Refresh the security check and retry')
  }
  return { outcome: 'submitted', reference: applicationId.slice(0, 8).toUpperCase() }
}
