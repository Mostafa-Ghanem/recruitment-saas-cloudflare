import { createServerFn } from '@tanstack/react-start'
import { Schema } from 'effect'

/**
 * Public applicants never get authenticated workspace authority. Each submission
 * resolves the company and the published vacancy on the server.
 */
const SubmitApplicationInput = Schema.Struct({
  workspaceSlug: Schema.NonEmptyString,
  jobId: Schema.NonEmptyString,
  fullName: Schema.String,
  phone: Schema.String,
  email: Schema.String,
  turnstileToken: Schema.String,
  submissionKey: Schema.String,
  utmSource: Schema.String,
  utmMedium: Schema.String,
  utmCampaign: Schema.String,
  utmContent: Schema.String
})

export type PublicApplyInput = typeof SubmitApplicationInput.Type

export type PublicApplyResult = {
  outcome: 'submitted' | 'already_submitted'
  reference: string
}

export const submitPublicApplicationServerFn = createServerFn({ method: 'POST' })
  .validator(Schema.decodeUnknownSync(SubmitApplicationInput))
  .handler(async ({ data }): Promise<PublicApplyResult> => {
    const { submitPublicApplicationHandler } = await import('./public-application.effects')
    return submitPublicApplicationHandler(data)
  })
