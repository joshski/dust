/**
 * dust bucket tool - Execute a server-defined tool via the local bucket proxy
 *
 * Usage: dust bucket tool <name> [args...]
 *        dust bucket tool <family> <sub-tool> [args...]
 */

import type { ToolDefinition } from '../../bucket/server-messages'
import { formatToolFamilyHelp } from '../../bucket/tool-prompt'
import { DUST_PROXY_PORT, parseProxyPort } from '../../command-events-transport'
import type { CommandDependencies, CommandResult } from '../types'

export interface BucketToolDependencies {
  fetch: typeof fetch
}

function createDefaultBucketToolDependencies(): BucketToolDependencies {
  return {
    fetch,
  }
}

function formatToolUsage(toolName: string, tools: ToolDefinition[]): string {
  if (tools.length === 0) {
    return 'No tools available in the active bucket session.'
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

interface ProxyToolsResponse {
  tools?: ToolDefinition[]
}

function parseToolsResponse(text: string): ToolDefinition[] | undefined {
  let parsed: ProxyToolsResponse
  try {
    parsed = JSON.parse(text) as ProxyToolsResponse
  } catch {
    return undefined
  }

  if (!Array.isArray(parsed.tools)) {
    return undefined
  }

  return parsed.tools.filter(
    (tool): tool is ToolDefinition =>
      typeof tool === 'object' &&
      tool !== null &&
      typeof (tool as { name?: unknown }).name === 'string'
  )
}

async function loadToolsViaProxy(
  proxyPort: number,
  fetchFn: typeof fetch
): Promise<
  { success: true; tools: ToolDefinition[] } | { success: false; error: string }
> {
  const url = `http://127.0.0.1:${proxyPort}/tools`

  try {
    const response = await fetchFn(url, {
      method: 'GET',
      headers: {
        connection: 'close',
      },
    })

    const responseText = await response.text()
    const tools = parseToolsResponse(responseText)

    if (tools) {
      return { success: true, tools }
    }

    if (!response.ok) {
      const error =
        responseText || `Tool proxy request failed (${response.status})`
      return { success: false, error }
    }

    return { success: false, error: 'Invalid tools payload from local proxy' }
  } catch (error) {
    return {
      success: false,
      error: `Tool proxy request failed: ${(error as Error).message}`,
    }
  }
}

async function revealFamilyViaProxy(
  familyName: string,
  proxyPort: number,
  fetchFn: typeof fetch
): Promise<void> {
  const url = `http://127.0.0.1:${proxyPort}/reveal/${encodeURIComponent(familyName)}`
  try {
    await fetchFn(url, {
      method: 'POST',
      headers: { connection: 'close' },
    })
  } catch {
    // Ignore errors - revelation is best-effort
  }
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
  const { context } = dependencies
  const toolName = dependencies.arguments[0]
  const toolArgs = dependencies.arguments.slice(1)

  if (!toolName) {
    context.stderr('Usage: dust bucket tool <name> [args...]')
    return { exitCode: 1 }
  }

  const repositoryId = env.DUST_REPOSITORY_ID
  if (!repositoryId) {
    context.stderr('Error: DUST_REPOSITORY_ID environment variable is not set.')
    context.stderr(
      'This command must be run within a repository context (via `dust bucket`).'
    )
    return { exitCode: 1 }
  }

  const proxyPort = parseProxyPort(env[DUST_PROXY_PORT])
  if (proxyPort === undefined) {
    context.stderr('Error: DUST_PROXY_PORT environment variable is not set.')
    context.stderr(
      'This command must be run within an active `dust bucket` session.'
    )
    return { exitCode: 1 }
  }

  const toolsResult = await loadToolsViaProxy(proxyPort, toolDeps.fetch)
  if (!toolsResult.success) {
    context.stderr(toolsResult.error)
    return { exitCode: 1 }
  }

  const tool = toolsResult.tools.find(candidate => candidate.name === toolName)
  if (!tool) {
    context.stderr(formatToolUsage(toolName, toolsResult.tools))
    return { exitCode: 1 }
  }

  // Check if this is a tool family (has children)
  const isFamily = tool.children && tool.children.length > 0

  if (isFamily) {
    // Check if a sub-tool was specified
    const subToolName = toolArgs[0]
    const subToolArgs = toolArgs.slice(1)

    if (!subToolName) {
      // No sub-tool specified: show help text for the family
      // Mark the family as revealed for future prompt iterations
      await revealFamilyViaProxy(toolName, proxyPort, toolDeps.fetch)
      context.stdout(formatToolFamilyHelp(tool))
      return { exitCode: 0 }
    }

    // Look up the sub-tool within the family
    const subTool = tool.children!.find(child => child.name === subToolName)
    if (!subTool) {
      context.stderr(
        `Unknown sub-tool: ${subToolName}\nRun \`dust bucket tool ${toolName}\` to see available operations.`
      )
      return { exitCode: 1 }
    }

    // Execute the sub-tool via proxy (using family/sub-tool path)
    const result = await executeToolViaProxy(
      `${toolName}/${subToolName}`,
      subToolArgs,
      repositoryId,
      proxyPort,
      toolDeps.fetch
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

  // Regular tool execution (no children)
  const result = await executeToolViaProxy(
    toolName,
    toolArgs,
    repositoryId,
    proxyPort,
    toolDeps.fetch
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
