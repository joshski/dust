/**
 * Audits repository - programmatic access to audit templates.
 *
 * Audits are canned tasks that help maintain project health.
 * Sources:
 * 1. User-configured audits in .dust/config/audits/*.md (takes precedence)
 * 2. Stock audits from lib/audits/stock-audits.ts
 */

import { basename } from 'node:path'
import type { FileSystem } from '../filesystem/types'
import {
  extractOpeningSentence,
  extractTitle,
} from '../markdown/markdown-utilities'
import { loadStockAudits } from './stock-audits'

export { loadStockAudits } from './stock-audits'

export interface Audit {
  name: string
  title: string
  description: string
  template: string
  source: 'stock' | string
}

export interface CreateAuditTaskResult {
  filePath: string
  relativePath: string
}

export interface AuditsRepository {
  listAudits(): Promise<Audit[]>
  parseAudit(options: { name: string }): Promise<Audit>
  createAuditTask(options: { name: string }): Promise<CreateAuditTaskResult>
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
 * Injects an Ad-hoc Scope section after the opening description, before ## Scope.
 * The ad-hoc details are passed through without validation.
 */
export function injectAdHocScope(
  content: string,
  adHocDetails: string
): string {
  // Find the ## Scope heading and insert before it
  const scopeMatch = content.match(/\n## Scope\n/)
  if (scopeMatch?.index !== undefined) {
    const insertIndex = scopeMatch.index
    const adHocSection = `\n## Ad-hoc Scope\n\n${adHocDetails}\n`
    return (
      content.slice(0, insertIndex) + adHocSection + content.slice(insertIndex)
    )
  }
  // If no ## Scope heading, append at end
  return `${content}\n\n## Ad-hoc Scope\n\n${adHocDetails}\n`
}

export function buildAuditsRepository(
  fileSystem: FileSystem,
  dustPath: string
): AuditsRepository {
  const userAuditsPath = `${dustPath}/config/audits`
  const tasksPath = `${dustPath}/tasks`

  async function loadAllAudits(): Promise<Map<string, Audit>> {
    const audits = new Map<string, Audit>()

    // First, add stock audits (stock audits always have h1 titles)
    for (const stockAudit of loadStockAudits()) {
      audits.set(stockAudit.name, {
        name: stockAudit.name,
        title: extractTitle(stockAudit.template) as string,
        description: stockAudit.description,
        template: stockAudit.template,
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
        const title = extractTitle(content) || name
        const description = extractOpeningSentence(content) || ''
        const relativePath = `.dust/config/audits/${file}`

        audits.set(name, {
          name,
          title,
          description,
          template: content,
          source: relativePath,
        })
      }
    }

    return audits
  }

  return {
    async listAudits(): Promise<Audit[]> {
      const auditsMap = await loadAllAudits()
      return Array.from(auditsMap.values()).toSorted((a, b) =>
        a.name.localeCompare(b.name)
      )
    },

    async parseAudit(options: { name: string }): Promise<Audit> {
      const auditsMap = await loadAllAudits()
      const audit = auditsMap.get(options.name)

      if (!audit) {
        throw new Error(`Audit not found: "${options.name}"`)
      }

      return audit
    },

    async createAuditTask(options: {
      name: string
    }): Promise<CreateAuditTaskResult> {
      const audit = await this.parseAudit(options)

      const taskFilePath = `${tasksPath}/audit-${options.name}.md`
      const relativeTaskPath = `.dust/tasks/audit-${options.name}.md`

      // Check if audit task already exists
      if (fileSystem.exists(taskFilePath)) {
        throw new Error(`Audit task already exists at ${relativeTaskPath}`)
      }

      const transformedContent = transformAuditContent(audit.template)

      await fileSystem.mkdir(tasksPath, { recursive: true })
      await fileSystem.writeFile(taskFilePath, transformedContent)

      return {
        filePath: taskFilePath,
        relativePath: relativeTaskPath,
      }
    },
  }
}
