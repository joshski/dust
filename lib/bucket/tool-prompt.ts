/**
 * Formats tool definitions for injection into agent prompts.
 */

import type { ToolDefinition, ToolParameter } from './server-messages'

/**
 * Format a single parameter for the tools section.
 */
function formatParameter(param: ToolParameter): string {
  const requiredLabel = param.required ? 'required' : 'optional'
  return `- \`${param.name}\` (${param.type}, ${requiredLabel}): ${param.description}`
}

/**
 * Format a single tool definition for the tools section.
 */
function formatTool(tool: ToolDefinition): string {
  const lines: string[] = []

  lines.push(`### ${tool.name}`)
  lines.push(tool.description)
  lines.push('')

  if (tool.parameters.length > 0) {
    lines.push('Parameters:')
    for (const param of tool.parameters) {
      lines.push(formatParameter(param))
    }
    lines.push('')
  }

  // Build usage example with parameter placeholders
  const paramPlaceholders = tool.parameters.map(p => `<${p.name}>`).join(' ')
  const usageArgs = paramPlaceholders ? ` ${paramPlaceholders}` : ''
  lines.push(`Usage: \`dust bucket tool ${tool.name}${usageArgs}\``)

  return lines.join('\n')
}

/**
 * Format tool definitions into a markdown section for agent prompts.
 * Returns an empty string if no tools are defined.
 */
export function formatToolsSection(tools: ToolDefinition[]): string {
  if (tools.length === 0) {
    return ''
  }

  const lines: string[] = []
  lines.push('## Available Tools')
  lines.push('')

  for (const tool of tools) {
    lines.push(formatTool(tool))
    lines.push('')
  }

  return lines.join('\n')
}
