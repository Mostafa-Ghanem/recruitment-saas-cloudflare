import { env } from 'cloudflare:workers'
import type { PublicCareersData, PublicRecruitmentJob } from './public-careers'

/**
 * Anonymous read: only public workspace name and published job fields,
 * never an HR user, candidate, application, or other tenant-private data.
 * Draft and closed roles are never disclosed.
 */
export async function loadPublicCareersHandler(input: {
  workspaceSlug: string
}): Promise<PublicCareersData> {
  const slug = input.workspaceSlug.trim()
  const disabled = { enabled: false, siteKey: '', privacyPolicyUrl: '' }
  if (!slug || slug.length > 120 || !env.DB) {
    return { company: '', slug, jobs: [], applicationConfig: disabled }
  }
  const workspace = await env.DB.prepare("SELECT id,name FROM workspaces WHERE slug=? AND suspensionStatus='active' LIMIT 1")
    .bind(slug).first<{ id: string; name: string }>()
  if (!workspace) {
    return { company: '', slug, jobs: [], applicationConfig: disabled }
  }
  const result = await env.DB.prepare(`SELECT id,title,department,location,employment_type,description,created_at
    FROM recruitment_jobs
    WHERE workspace_id=? AND status='published'
    ORDER BY created_at DESC,id DESC LIMIT 60`)
    .bind(workspace.id).all<PublicRecruitmentJob>()
  const settings = await env.DB.prepare(`SELECT accept_applications,privacy_policy_url
    FROM recruitment_application_settings WHERE workspace_id=? LIMIT 1`)
    .bind(workspace.id).first<{ accept_applications: number; privacy_policy_url: string }>()
  let validPrivacy = false
  try {
    const url = new URL(settings?.privacy_policy_url || '')
    validPrivacy = url.protocol === 'https:' && !url.username && !url.password &&
      !url.hash && url.hostname.length > 3
  } catch { validPrivacy = false }
  const enabled = env.RECRUITMENT_PUBLIC_APPLY_ENABLED === 'true' &&
    Boolean(env.TURNSTILE_SECRET_KEY && env.TURNSTILE_SITE_KEY) &&
    settings?.accept_applications === 1 && validPrivacy
  return {
    company: workspace.name, slug, jobs: result.results,
    applicationConfig: enabled
      ? { enabled: true, siteKey: env.TURNSTILE_SITE_KEY || '', privacyPolicyUrl: settings?.privacy_policy_url || '' }
      : disabled
  }
}
