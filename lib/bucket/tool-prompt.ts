/**
 * Formats tool definitions for injection into agent prompts.
 */

import type { ToolDefinition, ToolParameter } from './server-messages'

/**
 * Check if a tool has any required parameters.
 */
export function hasRequiredParameters(tool: ToolDefinition): boolean {
  return tool.parameters.some(p => p.required)
}

/**
 * Format a single parameter for the tools section.
 */
function formatParameter(param: ToolParameter): string {
  const requiredLabel = param.required ? 'required' : 'optional'
  return `- \`${param.name}\` (${param.type}, ${requiredLabel}): ${param.description}`
}

/**
 * Format a tool family help text when invoked without a sub-tool.
 * Returns detailed help listing all available sub-tools with their parameters.
 */
export function formatToolFamilyHelp(family: ToolDefinition): string {
  const lines: string[] = []

  lines.push(`## ${family.name}`)
  lines.push('')
  lines.push(family.description)
  lines.push('')
  lines.push('Available operations:')
  lines.push('')

  const children = family.children ?? []
  for (const child of children) {
    lines.push(`### ${child.name}`)
    lines.push(child.description)
    lines.push('')

    if (child.parameters.length > 0) {
      lines.push('Parameters:')
      for (const param of child.parameters) {
        lines.push(formatParameter(param))
      }
      lines.push('')
    }

    // Build usage example with parameter placeholders
    const paramPlaceholders = child.parameters
      .map(p => (p.required ? `<${p.name}>` : `[--${p.name} <${p.name}>]`))
      .join(' ')
    const usageArgs = paramPlaceholders ? ` ${paramPlaceholders}` : ''
    lines.push(
      `Usage: \`dust bucket tool ${family.name} ${child.name}${usageArgs}\``
    )
    lines.push('')
  }

  return lines.join('\n')
}

/**
 * Format help text for a single (non-family) tool.
 * Returns detailed help including parameters and usage example.
 */
export function formatToolHelp(tool: ToolDefinition): string {
  const lines: string[] = []

  lines.push(`## ${tool.name}`)
  lines.push('')
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
  const paramPlaceholders = tool.parameters
    .map(p => (p.required ? `<${p.name}>` : `[--${p.name} <${p.name}>]`))
    .join(' ')
  const usageArgs = paramPlaceholders ? ` ${paramPlaceholders}` : ''
  lines.push(`Usage: \`dust bucket tool ${tool.name}${usageArgs}\``)

  return lines.join('\n')
}

/**
 * Format a tool family (tool with children) as a summary.
 * Sub-tool details are hidden to save context window space.
 */
function formatToolFamilySummary(tool: ToolDefinition): string {
  const lines: string[] = []

  lines.push(`### ${tool.name}`)
  lines.push(tool.description)
  lines.push('')
  lines.push(
    `Usage: \`dust bucket tool ${tool.name}\` (run to see available operations)`
  )

  return lines.join('\n')
}

/**
 * Format a revealed tool family with full sub-tool details.
 * Used after the agent has invoked the family and seen the help text.
 * Precondition: tool.children must be defined and non-empty.
 */
function formatRevealedToolFamily(tool: ToolDefinition): string {
  const lines: string[] = []

  lines.push(`### ${tool.name}`)
  lines.push(tool.description)
  lines.push('')
  lines.push('**Sub-tools:**')
  lines.push('')

  // Children is guaranteed to exist by the caller (formatTool checks
  // tool.children && tool.children.length > 0 before calling this function)
  for (const child of tool.children!) {
    lines.push(`#### ${child.name}`)
    lines.push(child.description)
    lines.push('')

    if (child.parameters.length > 0) {
      lines.push('Parameters:')
      for (const param of child.parameters) {
        lines.push(formatParameter(param))
      }
      lines.push('')
    }

    // Build usage example with parameter placeholders
    const paramPlaceholders = child.parameters
      .map(p => (p.required ? `<${p.name}>` : `[--${p.name} <${p.name}>]`))
      .join(' ')
    const usageArgs = paramPlaceholders ? ` ${paramPlaceholders}` : ''
    lines.push(
      `Usage: \`dust bucket tool ${tool.name} ${child.name}${usageArgs}\``
    )
    lines.push('')
  }

  return lines.join('\n').trimEnd()
}

/**
 * Format a single tool definition for the tools section.
 * Shows only name, description, and usage hint — the agent discovers
 * parameter schemas by running the tool without arguments.
 */
function formatTool(
  tool: ToolDefinition,
  revealedFamilies?: Set<string>
): string {
  // Tools with children render based on revelation state
  if (tool.children && tool.children.length > 0) {
    if (revealedFamilies?.has(tool.name)) {
      return formatRevealedToolFamily(tool)
    }
    return formatToolFamilySummary(tool)
  }

  const lines: string[] = []

  lines.push(`### ${tool.name}`)
  lines.push(tool.description)
  lines.push('')
  lines.push(`Usage: \`dust bucket tool ${tool.name}\``)

  return lines.join('\n')
}

/**
 * Format tool definitions into a markdown section for agent prompts.
 * Returns an empty string if no tools are defined.
 *
 * @param tools - Array of tool definitions to format
 * @param revealedFamilies - Optional set of family names that have been revealed.
 *   Revealed families render with full sub-tool details instead of summaries.
 */

export function formatToolsSection(
  tools: ToolDefinition[],
  revealedFamilies?: Set<string>
): string {
  if (tools.length === 0) {
    return ''
  }

  const lines: string[] = []
  lines.push('')
  lines.push('## Available Tools')
  lines.push('')
  lines.push(
    'Use these tools where it makes sense in the execution of this task:'
  )
  lines.push('')

  for (const tool of tools) {
    lines.push(formatTool(tool, revealedFamilies))
    lines.push('')
  }

  return lines.join('\n')
}
