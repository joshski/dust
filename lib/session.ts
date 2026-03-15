import type { SessionConfig } from './env-config'

export const DUST_UNATTENDED = 'DUST_UNATTENDED'
export const DUST_SKIP_AGENT = 'DUST_SKIP_AGENT'
export const DUST_REPOSITORY_ID = 'DUST_REPOSITORY_ID'
export const DUST_PROXY_PORT = 'DUST_PROXY_PORT'

export function isUnattended(session: SessionConfig): boolean {
  return !!session.unattended
}

export function buildUnattendedEnv(options: {
  repositoryId?: string
  proxyPort?: number
  session: SessionConfig
}): Record<string, string> {
  const env: Record<string, string> = {
    [DUST_UNATTENDED]: '1',
    [DUST_SKIP_AGENT]: '1',
  }
  if (options.proxyPort) {
    env[DUST_PROXY_PORT] = String(options.proxyPort)
  } else if (options.session.proxyPort) {
    env[DUST_PROXY_PORT] = options.session.proxyPort
  }
  if (options.repositoryId) {
    env[DUST_REPOSITORY_ID] = options.repositoryId
  }
  return env
}
