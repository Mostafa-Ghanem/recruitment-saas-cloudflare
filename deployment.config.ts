import { type DeploymentSettings } from './infra/deployment-settings.ts'

/** Public deployment choices. Credential values belong in the operator shell. */
const settings: DeploymentSettings = {
  production: {
    branch: 'master',
    reviewers: [],
    // No invented privacy controller or mailbox. The operator must provide
    // verified legal information before a production recruitment launch.
    variables: {},
    secrets: []
  }
}

export default settings
