/**
 * dust audit - List available audit templates or create audit task
 *
 * Audits are canned tasks that help maintain project health.
 * Sources:
 * 1. User-configured audits in .dust/config/audits/*.md (takes precedence)
 * 2. Stock audits from a hardcoded list in the codebase
 *
 * Usage:
 *   dust audit              - List available audits
 *   dust audit <name>       - Create a task from the audit template
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
 * Each entry contains a name, description, and template content.
 */
export const STOCK_AUDITS: Array<{
  name: string
  description: string
  template: string
}> = [
  {
    name: 'security-review',
    description: 'Check for common security issues in the codebase.',
    template: `# Security Review

Review the codebase for common security vulnerabilities and misconfigurations.

## Scope

Focus on these areas:

1. **Hardcoded secrets** - API keys, passwords, tokens in source code
2. **Injection vulnerabilities** - SQL injection, command injection, XSS
3. **Authentication issues** - Weak password handling, missing auth checks
4. **Sensitive data exposure** - Logging sensitive data, insecure storage
5. **Dependency vulnerabilities** - Known CVEs in dependencies

## Goals

(Link to relevant project goals)

## Blocked By

(none)

## Definition of Done

- [ ] Searched for hardcoded secrets (API keys, passwords, tokens)
- [ ] Reviewed input validation and sanitization
- [ ] Checked authentication and authorization logic
- [ ] Verified sensitive data is not logged or exposed
- [ ] Ran dependency audit for known vulnerabilities
- [ ] Documented any findings with severity ratings
`,
  },
  {
    name: 'test-coverage',
    description: 'Identify areas with missing test coverage.',
    template: `# Test Coverage

Identify untested code paths and areas that need additional test coverage.

## Scope

Focus on these areas:

1. **Core business logic** - Functions that handle critical operations
2. **Edge cases** - Boundary conditions, error handling paths
3. **Integration points** - API endpoints, database operations
4. **User-facing features** - UI components, form validation
5. **Recent changes** - Code modified in the last few commits

## Goals

(Link to relevant project goals)

## Blocked By

(none)

## Definition of Done

- [ ] Identified modules with low or no test coverage
- [ ] Listed critical paths that lack tests
- [ ] Prioritized areas by risk and importance
- [ ] Created list of specific test cases to add
- [ ] Estimated effort for improving coverage
`,
  },
  {
    name: 'dead-code',
    description: 'Find unused exports, unreachable code, and orphaned files.',
    template: `# Dead Code

Find and remove unused code to improve maintainability and reduce bundle size.

## Scope

Focus on these areas:

1. **Unused exports** - Functions, classes, constants that are never imported
2. **Unreachable code** - Code after return statements, impossible conditions
3. **Orphaned files** - Files that are not imported anywhere
4. **Unused dependencies** - Packages in package.json not used in code
5. **Commented-out code** - Old code left in comments

## Goals

(Link to relevant project goals)

## Blocked By

(none)

## Definition of Done

- [ ] Ran static analysis tools to find unused exports
- [ ] Identified files with no incoming imports
- [ ] Listed unused dependencies
- [ ] Reviewed commented-out code blocks
- [ ] Created list of code safe to remove
- [ ] Verified removal won't break dynamic imports or reflection
`,
  },
]

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
  const stockAudit = STOCK_AUDITS.find(a => a.name === auditName)
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

export async function audit(
  dependencies: CommandDependencies
): Promise<CommandResult> {
  const auditName = dependencies.arguments[0]

  if (auditName) {
    return addAudit(auditName, dependencies)
  }

  return listAudits(dependencies)
}
