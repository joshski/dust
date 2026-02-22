export const DUST_UNATTENDED = 'DUST_UNATTENDED'
export const DUST_SKIP_AGENT = 'DUST_SKIP_AGENT'
export const DUST_REPOSITORY_ID = 'DUST_REPOSITORY_ID'

export function isUnattended(
  env: Record<string, string | undefined> = process.env
): boolean {
  return !!env[DUST_UNATTENDED]
}

export function buildUnattendedEnv(options?: {
  repositoryId?: string
}): Record<string, string> {
  const env: Record<string, string> = {
    [DUST_UNATTENDED]: '1',
    [DUST_SKIP_AGENT]: '1',
  }
  if (options?.repositoryId) {
    env[DUST_REPOSITORY_ID] = options.repositoryId
  }
  return env
}
