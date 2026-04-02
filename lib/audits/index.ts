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
export {
  analyzeDirectoryHierarchy,
  type DirectoryNode,
  type IssueType,
  type MigrationComplexity,
  type Finding,
} from './directory-hierarchy-analysis'

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
  createAuditTask(options: {
    name: string
    comment?: string
  }): Promise<CreateAuditTaskResult>
}

/**
 * Transforms audit template content for the task file.
 * Changes the title from "# Original Title" to "# Audit: Original Title"
 * and adds the Task Type section.
 */
export function transformAuditContent(content: string): string {
  // Update title
  const titleMatch = content.match(/^#\s+(.+)$/m)
  if (!titleMatch) {
    return content
  }
  const originalTitle = titleMatch[1]
  let transformed = content.replace(/^#\s+.+$/m, `# Audit: ${originalTitle}`)

  // Insert Task Type section before Blocked By, skipping code fences
  const lines = transformed.split('\n')
  let inCodeFence = false
  let blockedByIndex = -1

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]

    // Track code fences
    if (line.startsWith('```')) {
      inCodeFence = !inCodeFence
      continue
    }

    // Skip lines inside code fences
    if (inCodeFence) continue

    // Find the first ## Blocked By outside of code fences
    if (line === '## Blocked By') {
      blockedByIndex = i
      break
    }
  }

  if (blockedByIndex !== -1) {
    // Insert Task Type section before Blocked By
    lines.splice(blockedByIndex, 0, '## Task Type', '', 'implement', '')
    transformed = lines.join('\n')
  }

  return transformed
}

/**
 * Injects a Comments section after the opening description, before ## Scope.
 * The comment is passed through without validation.
 */
export function injectComment(content: string, comment: string): string {
  // Find the ## Scope heading and insert before it
  const scopeMatch = content.match(/\n## Scope\n/)
  if (scopeMatch?.index !== undefined) {
    const insertIndex = scopeMatch.index
    const commentSection = `\n## Comments\n\n${comment}\n`
    return (
      content.slice(0, insertIndex) +
      commentSection +
      content.slice(insertIndex)
    )
  }
  // If no ## Scope heading, append at end
  return `${content}\n\n## Comments\n\n${comment}\n`
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
      comment?: string
    }): Promise<CreateAuditTaskResult> {
      const audit = await this.parseAudit(options)

      const taskFilePath = `${tasksPath}/audit-${options.name}.md`
      const relativeTaskPath = `.dust/tasks/audit-${options.name}.md`

      // Check if audit task already exists
      if (fileSystem.exists(taskFilePath)) {
        throw new Error(`Audit task already exists at ${relativeTaskPath}`)
      }

      let transformedContent = transformAuditContent(audit.template)
      if (options.comment) {
        transformedContent = injectComment(transformedContent, options.comment)
      }

      await fileSystem.mkdir(tasksPath, { recursive: true })
      await fileSystem.writeFile(taskFilePath, transformedContent)

      return {
        filePath: taskFilePath,
        relativePath: relativeTaskPath,
      }
    },
  }
}
