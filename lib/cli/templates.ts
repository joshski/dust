/**
 * Template loading and variable interpolation
 *
 * Supports:
 * - {{variable}} - simple variable substitution
 * - {{#if variable}}...{{/if}} - include block if variable is truthy (not 'false' or empty)
 * - {{#unless variable}}...{{/unless}} - include block if variable is falsy ('false' or empty)
 */

import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const templatesDir = join(__dirname, '../templates')

function isTruthy(value: string | undefined): boolean {
  return value !== undefined && value !== '' && value !== 'false'
}

function processConditionals(
  content: string,
  variables: Record<string, string>
): string {
  // Process {{#if variable}}...{{/if}} blocks
  let result = content.replace(
    /\{\{#if (\w+)\}\}([\s\S]*?)\{\{\/if\}\}/g,
    (_, varName, block) => {
      return isTruthy(variables[varName]) ? block : ''
    }
  )

  // Process {{#unless variable}}...{{/unless}} blocks
  result = result.replace(
    /\{\{#unless (\w+)\}\}([\s\S]*?)\{\{\/unless\}\}/g,
    (_, varName, block) => {
      return !isTruthy(variables[varName]) ? block : ''
    }
  )

  return result
}

export function loadTemplate(
  name: string,
  variables: Record<string, string> = {}
): string {
  const templatePath = join(templatesDir, `${name}.txt`)
  let content = readFileSync(templatePath, 'utf-8')

  // Process conditionals first
  content = processConditionals(content, variables)

  // Then substitute variables
  for (const [key, value] of Object.entries(variables)) {
    content = content.replaceAll(`{{${key}}}`, value)
  }

  return content
}
