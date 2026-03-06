/**
 * dust bucket tool - Execute a server-defined tool
 *
 * Usage: dust bucket tool <name> [args...]
 *
 * Executes a tool defined by the dustbucket server. Tools are received
 * via WebSocket when `dust bucket` connects and stored locally for
 * CLI access.
 *
 * This command must be run within a repository context (via `dust bucket`)
 * where DUST_REPOSITORY_ID is set.
 */

import { accessSync, statSync } from 'node:fs'
import { chmod, mkdir, readdir, readFile, writeFile } from 'node:fs/promises'
import { homedir } from 'node:os'
import {
  type AuthDependencies,
  authenticate,
  loadStoredToken,
  storeToken,
} from '../../bucket/auth'
import { createLocalServer, openBrowser } from '../../bucket/auth-server'
import {
  executeTool,
  type ToolExecutorDependencies,
} from '../../bucket/tool-executor'
import { findToolByName, loadStoredTools } from '../../bucket/tool-storage'
import { DUST_PROXY_PORT, parseProxyPort } from '../../command-events-transport'
import type { CommandDependencies, CommandResult } from '../types'
import { type AuthFileSystemDependencies, createAuthFileSystem } from './bucket'

export interface BucketToolDependencies {
  auth: AuthDependencies
  executor: ToolExecutorDependencies
}

/* v8 ignore start - thin wrappers around native functions */
function createDefaultBucketToolDependencies(): BucketToolDependencies {
  const authFileSystemDeps: AuthFileSystemDependencies = {
    accessSync,
    statSync,
    readFile,
    writeFile,
    mkdir,
    readdir,
    chmod,
    rename: (oldPath, newPath) =>
      import('node:fs/promises').then(mod => mod.rename(oldPath, newPath)),
  }
  const authFileSystem = createAuthFileSystem(authFileSystemDeps)

  return {
    auth: {
      createServer: createLocalServer,
      openBrowser: openBrowser,
      getHomeDir: () => homedir(),
      fileSystem: authFileSystem,
    },
    executor: {
      readFileBytes: async (path: string) => {
        const buffer = await Bun.file(path).arrayBuffer()
        return new Uint8Array(buffer)
      },
      fileExists: async (path: string) => {
        const file = Bun.file(path)
        return file.exists()
      },
      fetch: fetch,
    },
  }
}
/* v8 ignore stop */

async function resolveToken(
  authDeps: AuthDependencies,
  context: CommandDependencies['context'],
  env: NodeJS.ProcessEnv
): Promise<string | null> {
  // 1. Environment variable
  const envToken = env.DUST_BUCKET_TOKEN
  if (envToken) {
    return envToken
  }

  // 2. Stored credential
  const stored = await loadStoredToken(
    authDeps.fileSystem,
    authDeps.getHomeDir()
  )
  if (stored) {
    return stored
  }

  // 3. Browser auth flow
  context.stdout('Opening browser to authenticate with dustbucket...')
  try {
    const token = await authenticate(authDeps)
    await storeToken(authDeps.fileSystem, authDeps.getHomeDir(), token)
    context.stdout('Authenticated successfully')
    return token
  } catch (error) {
    context.stderr(`Authentication failed: ${(error as Error).message}`)
    return null
  }
}

function formatToolUsage(toolName: string, tools: { name: string }[]): string {
  if (tools.length === 0) {
    return 'No tools available. Run `dust bucket` to receive tool definitions from the server.'
  }
  const toolNames = tools.map(t => t.name).join(', ')
  return `Unknown tool: ${toolName}\nAvailable tools: ${toolNames}`
}

interface ProxyToolResponse {
  success?: boolean
  output?: string
  error?: string
  status?: string
}

async function executeToolViaProxy(
  toolName: string,
  toolArgs: string[],
  repositoryId: string,
  proxyPort: number,
  fetchFn: typeof fetch
): Promise<{ success: boolean; output?: string; error?: string }> {
  const url = `http://127.0.0.1:${proxyPort}/tools/${encodeURIComponent(toolName)}`
  try {
    const response = await fetchFn(url, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        connection: 'close',
      },
      body: JSON.stringify({
        arguments: toolArgs,
        repositoryId,
      }),
    })

    const responseText = await response.text()
    let parsedResponse: ProxyToolResponse | undefined
    try {
      parsedResponse = JSON.parse(responseText) as ProxyToolResponse
    } catch {
      parsedResponse = undefined
    }

    if (parsedResponse) {
      if (parsedResponse.success) {
        return { success: true, output: parsedResponse.output }
      }
      if (
        typeof parsedResponse.error === 'string' &&
        parsedResponse.error.length > 0
      ) {
        return { success: false, error: parsedResponse.error }
      }
      return { success: false }
    }

    const error = responseText
      ? responseText
      : `Tool proxy request failed (${response.status})`
    return { success: false, error }
  } catch (error) {
    return {
      success: false,
      error: `Tool proxy request failed: ${(error as Error).message}`,
    }
  }
}

export async function bucketTool(
  dependencies: CommandDependencies,
  toolDeps: BucketToolDependencies = createDefaultBucketToolDependencies(),
  env: NodeJS.ProcessEnv = process.env
): Promise<CommandResult> {
  const { context, fileSystem } = dependencies
  const toolName = dependencies.arguments[0]
  const toolArgs = dependencies.arguments.slice(1)

  if (!toolName) {
    context.stderr('Usage: dust bucket tool <name> [args...]')
    return { exitCode: 1 }
  }

  // Require repository context
  const repositoryId = env.DUST_REPOSITORY_ID
  if (!repositoryId) {
    context.stderr('Error: DUST_REPOSITORY_ID environment variable is not set.')
    context.stderr(
      'This command must be run within a repository context (via `dust bucket`).'
    )
    return { exitCode: 1 }
  }

  const proxyPort = parseProxyPort(env[DUST_PROXY_PORT])
  if (proxyPort !== undefined) {
    const result = await executeToolViaProxy(
      toolName,
      toolArgs,
      repositoryId,
      proxyPort,
      toolDeps.executor.fetch
    )
    if (result.success) {
      if (result.output) {
        context.stdout(result.output)
      }
      return { exitCode: 0 }
    }
    context.stderr(result.error || 'Tool execution failed')
    return { exitCode: 1 }
  }

  // Load stored tool definitions
  const tools = await loadStoredTools(fileSystem, toolDeps.auth.getHomeDir())

  // Find the requested tool
  const tool = findToolByName(tools, toolName)
  if (!tool) {
    context.stderr(formatToolUsage(toolName, tools))
    return { exitCode: 1 }
  }

  // Resolve auth token
  const token = await resolveToken(toolDeps.auth, context, env)
  if (!token) {
    return { exitCode: 1 }
  }

  // Execute the tool
  const result = await executeTool(
    tool,
    toolArgs,
    token,
    repositoryId,
    toolDeps.executor
  )

  if (result.success) {
    if (result.output) {
      context.stdout(result.output)
    }
    return { exitCode: 0 }
  }

  // executeTool always sets error when success is false
  context.stderr(result.error as string)
  return { exitCode: 1 }
}
