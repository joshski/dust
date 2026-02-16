/**
 * dust audit - List available audit templates or create audit task
 *
 * Audits are canned tasks that help maintain project health.
 * Sources:
 * 1. User-configured audits in .dust/config/audits/*.md (takes precedence)
 * 2. Stock audits from markdown files under lib/templates/audits/
 *
 * Usage:
 *   dust audit              - List available audits
 *   dust audit <name>       - Create a task from the audit template
 */

import { existsSync, readdirSync, readFileSync } from 'node:fs'
import { basename, dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  extractOpeningSentence,
  extractTitle,
} from '../../markdown/markdown-utilities'
import { getColors } from '../colors'
import type { CommandDependencies, CommandResult } from '../types'

interface StockAudit {
  name: string
  description: string
  template: string
}

const __dirname = dirname(fileURLToPath(import.meta.url))
// In dev: __dirname is lib/cli/commands/, templates at ../../templates/audits
// Bundled: __dirname is dist/, templates at ../templates/audits
/* v8 ignore start - fallback path only reached in bundled env */
const stockAuditsDir =
  [
    join(__dirname, '../../templates/audits'),
    join(__dirname, '../templates/audits'),
  ].find(d => existsSync(d)) ?? join(__dirname, '../../templates/audits')
/* v8 ignore stop */

/**
 * Loads stock audits from markdown files under lib/templates/audits/.
 */
export function loadStockAudits(): StockAudit[] {
  const files = readdirSync(stockAuditsDir)
    .filter(f => f.endsWith('.md'))
    .sort()

  return files.map(file => {
    const template = readFileSync(join(stockAuditsDir, file), 'utf-8')
    const name = basename(file, '.md')
    const description = extractOpeningSentence(template)
    return { name, description: description as string, template }
  })
}

interface AuditInfo {
  name: string
  description: string
  source: string
}

/**
 * Transforms audit template content for the task file.
 * Changes the title from "# Original Title" to "# Audit: Original Title"
 */
export function transformAuditContent(content: string): string {
  const titleMatch = content.match(/^#\s+(.+)$/m)
  if (!titleMatch) {
    return content
  }
  const originalTitle = titleMatch[1]
  return content.replace(/^#\s+.+$/m, `# Audit: ${originalTitle}`)
}

/**
 * Creates a task from an audit template
 */
async function addAudit(
  auditName: string,
  dependencies: CommandDependencies
): Promise<CommandResult> {
  const { context, fileSystem, settings } = dependencies

  const dustPath = `${context.cwd}/.dust`
  const userAuditsPath = `${dustPath}/config/audits`
  const tasksPath = `${dustPath}/tasks`
  const taskFilePath = `${tasksPath}/audit-${auditName}.md`
  const relativeTaskPath = `.dust/tasks/audit-${auditName}.md`

  // Check if audit task already exists
  if (fileSystem.exists(taskFilePath)) {
    context.stderr(`Error: Audit task already exists at ${relativeTaskPath}`)
    return { exitCode: 1 }
  }

  // Try user audit first
  const userAuditPath = `${userAuditsPath}/${auditName}.md`
  if (fileSystem.exists(userAuditPath)) {
    const content = await fileSystem.readFile(userAuditPath)
    const transformedContent = transformAuditContent(content)

    await fileSystem.mkdir(tasksPath, { recursive: true })
    await fileSystem.writeFile(taskFilePath, transformedContent)

    context.stdout(`→ ${relativeTaskPath}`)
    return { exitCode: 0 }
  }

  // Try stock audit
  const stockAudit = loadStockAudits().find(a => a.name === auditName)
  if (stockAudit) {
    const transformedContent = transformAuditContent(stockAudit.template)

    await fileSystem.mkdir(tasksPath, { recursive: true })
    await fileSystem.writeFile(taskFilePath, transformedContent)

    context.stdout(`→ ${relativeTaskPath}`)
    return { exitCode: 0 }
  }

  // Not found
  context.stderr(`Error: Audit '${auditName}' not found`)
  context.stderr(`Run '${settings.dustCommand} audit' to see available audits`)
  return { exitCode: 1 }
}

/**
 * Lists available audit templates
 */
async function listAudits(
  dependencies: CommandDependencies
): Promise<CommandResult> {
  const { context, fileSystem } = dependencies
  const colors = getColors()

  const dustPath = `${context.cwd}/.dust`
  const userAuditsPath = `${dustPath}/config/audits`

  const audits = new Map<string, AuditInfo>()

  // First, add stock audits
  for (const stockAudit of loadStockAudits()) {
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

export async function audit(
  dependencies: CommandDependencies
): Promise<CommandResult> {
  const auditName = dependencies.arguments[0]

  if (auditName) {
    return addAudit(auditName, dependencies)
  }

  return listAudits(dependencies)
}
