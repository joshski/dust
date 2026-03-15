/**
 * Centralized environment configuration.
 *
 * Reads all environment variables once at startup and provides typed access.
 * Following the "Functional Core, Imperative Shell" principle: the shell reads
 * process.env once, then the functional core receives typed configuration.
 */

/**
 * Logging-related environment configuration.
 * - DEBUG: Pattern for stdout debug logging (comma-separated wildcards)
 * - DUST_LOG_DIR: Override default log directory location
 * - DUST_LOG_FILE: Inherited log file path for child processes
 */
export interface LoggingConfig {
  debug: string | undefined
  logDir: string | undefined
  logFile: string | undefined
}

/**
 * Dustbucket connection configuration.
 * - DUST_BUCKET_HOST: Override dustbucket host for auth
 * - DUST_BUCKET_TOKEN: Authentication token (takes precedence over stored credential)
 * - DUST_BUCKET_AGENT_CONNECT_URL: Override WebSocket URL
 */
export interface BucketConfig {
  host: string | undefined
  token: string | undefined
  agentConnectUrl: string | undefined
}

/**
 * Session-related configuration for dust commands.
 * - DUST_PROXY_PORT: Proxy server port
 * - DUST_UNATTENDED: Whether running in unattended mode
 * - DUST_SKIP_AGENT: Skip agent startup
 * - DUST_REPOSITORY_ID: Repository identifier for bucket operations
 * - DUST_REPOS_DIR: Override default repositories directory
 */
export interface SessionConfig {
  proxyPort: string | undefined
  unattended: string | undefined
  skipAgent: string | undefined
  repositoryId: string | undefined
  reposDir: string | undefined
}

/**
 * Runtime environment detection.
 * - BUN_INSTALL: Whether Bun package manager is available
 * - DUST_EVENTS_URL: Override events posting URL
 */
export interface RuntimeConfig {
  bunInstall: string | undefined
  eventsUrl: string | undefined
}

/**
 * Agent detection environment variables.
 * - CLAUDECODE: Claude Code is running
 * - CLAUDE_CODE_REMOTE: Claude Code Web is running
 * - CODEX_HOME: Codex home directory
 * - CODEX_CI: Codex CI mode
 */
export interface AgentDetectionConfig {
  claudeCode: string | undefined
  claudeCodeRemote: string | undefined
  codexHome: string | undefined
  codexCi: string | undefined
}

/**
 * Authentication tokens.
 * - CLAUDE_CODE_OAUTH_TOKEN: OAuth token for Claude Code
 * - OPENAI_API_KEY: OpenAI API key for Codex
 */
export interface AuthConfig {
  claudeCodeOauthToken: string | undefined
  openaiApiKey: string | undefined
}

/**
 * Testing-related configuration.
 * - CLAUDE_CODE_VCR_MODE: VCR recording mode ('record' or 'replay')
 */
export interface TestingConfig {
  vcrMode: string | undefined
}

/**
 * Complete environment configuration.
 * Captures all environment variables used by dust, organized by subsystem.
 */
export interface EnvConfig {
  logging: LoggingConfig
  bucket: BucketConfig
  session: SessionConfig
  runtime: RuntimeConfig
  agentDetection: AgentDetectionConfig
  auth: AuthConfig
  testing: TestingConfig
}

/**
 * Read and validate all environment variables once.
 * This function should be called once at startup in the imperative shell.
 *
 * @param env - The environment variables object (typically process.env)
 * @returns Typed environment configuration
 */
export function readEnvConfig(
  env: Record<string, string | undefined>
): EnvConfig {
  return {
    logging: {
      debug: env.DEBUG,
      logDir: env.DUST_LOG_DIR,
      logFile: env.DUST_LOG_FILE,
    },
    bucket: {
      host: env.DUST_BUCKET_HOST,
      token: env.DUST_BUCKET_TOKEN,
      agentConnectUrl: env.DUST_BUCKET_AGENT_CONNECT_URL,
    },
    session: {
      proxyPort: env.DUST_PROXY_PORT,
      unattended: env.DUST_UNATTENDED,
      skipAgent: env.DUST_SKIP_AGENT,
      repositoryId: env.DUST_REPOSITORY_ID,
      reposDir: env.DUST_REPOS_DIR,
    },
    runtime: {
      bunInstall: env.BUN_INSTALL,
      eventsUrl: env.DUST_EVENTS_URL,
    },
    agentDetection: {
      claudeCode: env.CLAUDECODE,
      claudeCodeRemote: env.CLAUDE_CODE_REMOTE,
      codexHome: env.CODEX_HOME,
      codexCi: env.CODEX_CI,
    },
    auth: {
      claudeCodeOauthToken: env.CLAUDE_CODE_OAUTH_TOKEN,
      openaiApiKey: env.OPENAI_API_KEY,
    },
    testing: {
      vcrMode: env.CLAUDE_CODE_VCR_MODE,
    },
  }
}
