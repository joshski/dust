/**
 * dust audit - List available audit templates
 *
 * Audits are canned tasks that help maintain project health.
 * Sources:
 * 1. User-configured audits in .dust/config/audits/*.md (takes precedence)
 * 2. Stock audits from a hardcoded list in the codebase
 */

import { basename } from 'node:path'
import {
  extractOpeningSentence,
  extractTitle,
} from '../../markdown/markdown-utilities'
import { getColors } from '../colors'
import type { CommandDependencies, CommandResult } from '../types'

/**
 * Stock audits bundled with dust.
 * Each entry contains a name and description.
 */
export const STOCK_AUDITS: Array<{ name: string; description: string }> = [
  {
    name: 'security-review',
    description: 'Check for common security issues in the codebase.',
  },
  {
    name: 'test-coverage',
    description: 'Identify areas with missing test coverage.',
  },
]

interface AuditInfo {
  name: string
  description: string
  source: string
}

export async function audit(
  dependencies: CommandDependencies
): Promise<CommandResult> {
  const { context, fileSystem } = dependencies
  const colors = getColors()

  const dustPath = `${context.cwd}/.dust`
  const userAuditsPath = `${dustPath}/config/audits`

  const audits = new Map<string, AuditInfo>()

  // First, add stock audits
  for (const stockAudit of STOCK_AUDITS) {
    audits.set(stockAudit.name, {
      name: stockAudit.name,
      description: stockAudit.description,
      source: 'stock',
    })
  }

  // Then, add user-configured audits (these take precedence)
  if (fileSystem.exists(userAuditsPath)) {
    const files = await fileSystem.readdir(userAuditsPath)
    const mdFiles = files.filter(f => f.endsWith('.md')).sort()

    for (const file of mdFiles) {
      const name = basename(file, '.md')
      const filePath = `${userAuditsPath}/${file}`
      const content = await fileSystem.readFile(filePath)
      const title = extractTitle(content)
      const openingSentence = extractOpeningSentence(content)
      const relativePath = `.dust/config/audits/${file}`

      audits.set(name, {
        name: title || name,
        description: openingSentence || '',
        source: relativePath,
      })
    }
  }

  // Output the list
  context.stdout('🔍 Audits')
  context.stdout('')
  context.stdout('Audits are canned tasks that help maintain project health.')
  context.stdout('')

  for (const auditInfo of audits.values()) {
    context.stdout(`${colors.bold}# ${auditInfo.name}${colors.reset}`)
    if (auditInfo.description) {
      context.stdout(`${colors.dim}${auditInfo.description}${colors.reset}`)
    }
    context.stdout(`${colors.cyan}→ ${auditInfo.source}${colors.reset}`)
    context.stdout('')
  }

  return { exitCode: 0 }
}
