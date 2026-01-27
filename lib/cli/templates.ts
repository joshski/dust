/**
 * Template loading and variable interpolation
 */

import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const templatesDir = join(__dirname, '../templates')

export function loadTemplate(
  name: string,
  variables: Record<string, string> = {}
): string {
  const templatePath = join(templatesDir, `${name}.txt`)
  let content = readFileSync(templatePath, 'utf-8')

  for (const [key, value] of Object.entries(variables)) {
    content = content.replaceAll(`{{${key}}}`, value)
  }

  return content
}
