/**
 * Executes server-defined tools.
 *
 * This module provides the execution mechanism for tools defined by the server.
 * It handles HTTP requests to tool endpoints and file parameter handling via
 * multipart uploads.
 */

import { basename, extname } from 'node:path'
import type { BucketConfig } from '../env-config'
import { getDustbucketHost } from './auth'
import type { ToolDefinition } from './server-messages'

const MIME_TYPES: Record<string, string> = {
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
  '.svg': 'image/svg+xml',
  '.pdf': 'application/pdf',
  '.txt': 'text/plain',
  '.json': 'application/json',
  '.csv': 'text/csv',
  '.md': 'text/markdown',
  '.html': 'text/html',
  '.xml': 'application/xml',
}

/**
 * Get MIME type from file extension.
 */
export function getContentType(filePath: string): string {
  const ext = extname(filePath).toLowerCase()
  return MIME_TYPES[ext] || 'application/octet-stream'
}

/**
 * Dependencies for tool execution - allows injection for testability.
 */
export interface ToolExecutorDependencies {
  /** Read file bytes from disk */
  readFileBytes: (path: string) => Promise<Uint8Array>
  /** Check if file exists */
  fileExists: (path: string) => Promise<boolean>
  /** Execute HTTP request */
  fetch: typeof fetch
  /** Bucket configuration for URL building */
  bucketConfig: BucketConfig
}

/**
 * Result of tool execution.
 */
interface ToolExecutorResult {
  success: boolean
  output?: string
  error?: string
}

/**
 * Build the full URL for a tool endpoint.
 */
export function buildToolUrl(
  endpoint: string,
  repositoryId: string,
  bucketConfig: BucketConfig
): string {
  const host = getDustbucketHost(bucketConfig)
  const url = new URL(endpoint, host)
  url.searchParams.set('repositoryId', repositoryId)
  return url.toString()
}

/**
 * Map CLI arguments to tool parameters.
 *
 * Arguments are positional, matching the order of parameters in the tool definition.
 * For example: `dust bucket tool asset-upload my-file.png`
 * maps "my-file.png" to the first parameter (file).
 */
export function mapArgumentsToParameters(
  tool: ToolDefinition,
  cliArguments: string[]
): Map<string, string> {
  const result = new Map<string, string>()
  for (let i = 0; i < tool.parameters.length && i < cliArguments.length; i++) {
    result.set(tool.parameters[i].name, cliArguments[i])
  }
  return result
}

/**
 * Validate that all required parameters have values.
 */
export function validateRequiredParameters(
  tool: ToolDefinition,
  values: Map<string, string>
): { valid: true } | { valid: false; missing: string[] } {
  const missing: string[] = []
  for (const param of tool.parameters) {
    if (param.required && !values.has(param.name)) {
      missing.push(param.name)
    }
  }
  if (missing.length > 0) {
    return { valid: false, missing }
  }
  return { valid: true }
}

/**
 * Build request body for tool execution.
 *
 * For tools with file parameters, uses multipart/form-data.
 * For other POST tools, uses JSON body.
 * For GET tools, returns null (parameters go in URL).
 */
async function buildRequestBody(
  tool: ToolDefinition,
  values: Map<string, string>,
  dependencies: ToolExecutorDependencies
): Promise<{ body: BodyInit | null; contentType?: string }> {
  const hasFileParam = tool.parameters.some(p => p.type === 'file')

  if (tool.method === 'GET') {
    return { body: null }
  }

  if (hasFileParam) {
    const formData = new FormData()

    for (const param of tool.parameters) {
      const value = values.get(param.name)
      if (value === undefined) continue

      if (param.type === 'file') {
        const fileBytes = await dependencies.readFileBytes(value)
        const contentType = getContentType(value)
        const fileName = basename(value)
        formData.append(
          param.name,
          new Blob([fileBytes.buffer as ArrayBuffer], { type: contentType }),
          fileName
        )
      } else {
        formData.append(param.name, value)
      }
    }

    return { body: formData }
  }

  // JSON body for non-file POST requests
  const jsonBody: Record<string, string | number | boolean> = {}
  for (const param of tool.parameters) {
    const value = values.get(param.name)
    if (value === undefined) continue

    if (param.type === 'number') {
      jsonBody[param.name] = Number.parseFloat(value)
    } else if (param.type === 'boolean') {
      jsonBody[param.name] = value === 'true'
    } else {
      jsonBody[param.name] = value
    }
  }

  return {
    body: JSON.stringify(jsonBody),
    contentType: 'application/json',
  }
}

/**
 * Execute a server-defined tool.
 *
 * @param tool - The tool definition from the server
 * @param cliArguments - CLI arguments (positional, mapped to parameters)
 * @param token - Authentication token
 * @param repositoryId - Repository ID for context
 * @param dependencies - Injected dependencies for HTTP and file operations
 */
export async function executeTool(
  tool: ToolDefinition,
  cliArguments: string[],
  token: string,
  repositoryId: string,
  dependencies: ToolExecutorDependencies
): Promise<ToolExecutorResult> {
  // Map arguments to parameters
  const values = mapArgumentsToParameters(tool, cliArguments)

  // Validate required parameters
  const validation = validateRequiredParameters(tool, values)
  if (!validation.valid) {
    return {
      success: false,
      error: `Missing required parameter${validation.missing.length > 1 ? 's' : ''}: ${validation.missing.join(', ')}`,
    }
  }

  // Validate file parameters exist
  for (const param of tool.parameters) {
    if (param.type === 'file') {
      const value = values.get(param.name)
      if (value) {
        const exists = await dependencies.fileExists(value)
        if (!exists) {
          return {
            success: false,
            error: `File not found: ${value}`,
          }
        }
      }
    }
  }

  // Build URL
  const url = buildToolUrl(
    tool.endpoint,
    repositoryId,
    dependencies.bucketConfig
  )

  // Build request body
  const { body, contentType } = await buildRequestBody(
    tool,
    values,
    dependencies
  )

  // Build headers
  const headers: Record<string, string> = {
    Authorization: `Bearer ${token}`,
  }
  if (contentType) {
    headers['Content-Type'] = contentType
  }

  // Execute request
  try {
    const response = await dependencies.fetch(url, {
      method: tool.method,
      headers,
      body,
    })

    if (!response.ok) {
      const text = await response.text()
      return {
        success: false,
        error: `Tool request failed (${response.status}): ${text || response.statusText}`,
      }
    }

    // Try to parse as JSON first
    const responseText = await response.text()
    try {
      const json = JSON.parse(responseText)
      // If response has a url field, output that (common for asset upload)
      if (typeof json.url === 'string') {
        return { success: true, output: json.url }
      }
      // Otherwise output the full JSON
      return { success: true, output: JSON.stringify(json, null, 2) }
    } catch {
      // Not JSON, output as-is
      return { success: true, output: responseText }
    }
  } catch (error) {
    return {
      success: false,
      error: `Tool request failed: ${(error as Error).message}`,
    }
  }
}
