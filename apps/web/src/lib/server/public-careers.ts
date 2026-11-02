import { createServerFn } from '@tanstack/react-start'
import { Schema } from 'effect'

export type PublicRecruitmentJob = {
  id: string
  title: string
  department: string
  location: string
  employment_type: string
  description: string
  created_at: string
}

export type PublicCareersData = {
  company: string
  slug: string
  jobs: PublicRecruitmentJob[]
  applicationConfig: { enabled: boolean; siteKey: string; privacyPolicyUrl: string }
}

const CareersInput = Schema.Struct({ workspaceSlug: Schema.NonEmptyString })

export const publicCareersServerFn = createServerFn({ method: 'GET' })
  .validator(Schema.decodeUnknownSync(CareersInput))
  .handler(async ({ data }): Promise<PublicCareersData> => {
    const { loadPublicCareersHandler } = await import('./public-careers.effects')
    return loadPublicCareersHandler(data)
  })
