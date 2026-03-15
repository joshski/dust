/**
 * dust audit - List available audit templates or create audit task
 *
 * Audits are canned tasks that help maintain project health.
 * Sources:
 * 1. User-configured audits in .dust/config/audits/*.md (takes precedence)
 * 2. Stock audits from lib/audits/stock-audits.ts
 *
 * Usage:
 *   dust audit                      - List available audits
 *   dust audit <name>               - Create a task from the audit template
 *   dust audit <name> "<details>"   - Create a task with ad-hoc scope details
 */

import { basename } from 'node:path'
import { injectAdHocScope, transformAuditContent } from '../../audits/index'
import { loadStockAudits } from '../../audits/stock-audits'
import {
  extractOpeningSentence,
  extractTitle,
} from '../../markdown/markdown-utilities'
import { getColors } from '../colors'
import type { CommandDependencies, CommandResult } from '../types'

interface AuditInfo {
  name: string
  description: string
  source: string
}

/**
 * Creates a task from an audit template
 */
async function addAudit(
  auditName: string,
  adHocDetails: string | undefined,
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
    let transformedContent = transformAuditContent(content)
    if (adHocDetails) {
      transformedContent = injectAdHocScope(transformedContent, adHocDetails)
    }

    await fileSystem.mkdir(tasksPath, { recursive: true })
    await fileSystem.writeFile(taskFilePath, transformedContent)

    context.stdout(`→ ${relativeTaskPath}`)
    return { exitCode: 0 }
  }

  // Try stock audit
  const stockAudit = loadStockAudits().find(a => a.name === auditName)
  if (stockAudit) {
    let transformedContent = transformAuditContent(stockAudit.template)
    if (adHocDetails) {
      transformedContent = injectAdHocScope(transformedContent, adHocDetails)
    }

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
    const mdFiles = files.filter(f => f.endsWith('.md')).toSorted()

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
  const adHocDetails = dependencies.arguments[1]

  if (auditName) {
    return addAudit(auditName, adHocDetails, dependencies)
  }

  return listAudits(dependencies)
}
