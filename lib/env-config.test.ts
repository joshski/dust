import { describe, expect, test } from 'vitest'
import { readEnvConfig } from './env-config'

describe('readEnvConfig', () => {
  test('reads logging config', () => {
    const env = {
      DEBUG: 'dust:*',
      DUST_LOG_DIR: '/custom/logs',
      DUST_LOG_FILE: '/custom/logs/test.log',
    }
    const config = readEnvConfig(env)
    expect(config.logging).toEqual({
      debug: 'dust:*',
      logDir: '/custom/logs',
      logFile: '/custom/logs/test.log',
    })
  })

  test('reads bucket config', () => {
    const env = {
      DUST_BUCKET_HOST: 'https://custom.bucket.com',
      DUST_BUCKET_TOKEN: 'secret-token',
      DUST_BUCKET_AGENT_CONNECT_URL: 'wss://custom.bucket.com/agent',
    }
    const config = readEnvConfig(env)
    expect(config.bucket).toEqual({
      host: 'https://custom.bucket.com',
      token: 'secret-token',
      agentConnectUrl: 'wss://custom.bucket.com/agent',
    })
  })

  test('reads session config', () => {
    const env = {
      DUST_PROXY_PORT: '3000',
      DUST_UNATTENDED: '1',
      DUST_SKIP_AGENT: '1',
      DUST_REPOSITORY_ID: 'repo-123',
      DUST_REPOS_DIR: '/custom/repos',
    }
    const config = readEnvConfig(env)
    expect(config.session).toEqual({
      proxyPort: '3000',
      unattended: '1',
      skipAgent: '1',
      repositoryId: 'repo-123',
      reposDir: '/custom/repos',
    })
  })

  test('reads runtime config', () => {
    const env = {
      BUN_INSTALL: '/home/user/.bun',
      DUST_EVENTS_URL: 'https://events.example.com',
    }
    const config = readEnvConfig(env)
    expect(config.runtime).toEqual({
      bunInstall: '/home/user/.bun',
      eventsUrl: 'https://events.example.com',
    })
  })

  test('reads agent detection config', () => {
    const env = {
      CLAUDECODE: '1',
      CLAUDE_CODE_REMOTE: '1',
      CODEX_HOME: '/home/user/.codex',
      CODEX_CI: '1',
    }
    const config = readEnvConfig(env)
    expect(config.agentDetection).toEqual({
      claudeCode: '1',
      claudeCodeRemote: '1',
      codexHome: '/home/user/.codex',
      codexCi: '1',
    })
  })

  test('reads auth config', () => {
    const env = {
      CLAUDE_CODE_OAUTH_TOKEN: 'oauth-token',
      OPENAI_API_KEY: 'sk-key',
    }
    const config = readEnvConfig(env)
    expect(config.auth).toEqual({
      claudeCodeOauthToken: 'oauth-token',
      openaiApiKey: 'sk-key',
    })
  })

  test('reads testing config', () => {
    const env = {
      CLAUDE_CODE_VCR_MODE: 'record',
    }
    const config = readEnvConfig(env)
    expect(config.testing).toEqual({
      vcrMode: 'record',
    })
  })

  test('returns undefined for missing environment variables', () => {
    const config = readEnvConfig({})
    expect(config.logging.debug).toBeUndefined()
    expect(config.bucket.host).toBeUndefined()
    expect(config.session.proxyPort).toBeUndefined()
    expect(config.runtime.bunInstall).toBeUndefined()
    expect(config.agentDetection.claudeCode).toBeUndefined()
    expect(config.auth.claudeCodeOauthToken).toBeUndefined()
    expect(config.testing.vcrMode).toBeUndefined()
  })

  test('reads complete config from mixed environment', () => {
    const env = {
      DEBUG: '*',
      DUST_BUCKET_TOKEN: 'token',
      DUST_UNATTENDED: '1',
    }
    const config = readEnvConfig(env)
    expect(config.logging.debug).toBe('*')
    expect(config.bucket.token).toBe('token')
    expect(config.session.unattended).toBe('1')
    // Unset values should be undefined
    expect(config.bucket.host).toBeUndefined()
    expect(config.session.proxyPort).toBeUndefined()
  })
})
