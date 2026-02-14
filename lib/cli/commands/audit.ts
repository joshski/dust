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

Review the codebase for security vulnerabilities and misconfigurations.

## Scope

1. **Hardcoded secrets** - Search source files for API keys, passwords, tokens, and connection strings embedded in code or config files checked into version control
2. **Injection vulnerabilities** - Review all points where user input reaches shell commands, database queries, or HTML output without sanitization
3. **Authentication and authorization** - Verify that protected operations check credentials and permissions, and that failures are handled safely
4. **Sensitive data exposure** - Check that secrets, personal data, and tokens are not written to logs, included in error messages, or stored in plaintext
5. **Dependency vulnerabilities** - Run the package manager's audit command and review results for known vulnerabilities

## Goals

## Blocked By

## Definition of Done

- [ ] No hardcoded secrets found in source files, or all findings documented
- [ ] All user input boundaries reviewed for injection risks
- [ ] Auth checks confirmed present on all protected paths
- [ ] No sensitive data found in logs or error output
- [ ] Dependency audit ran with no unaddressed high or critical vulnerabilities
- [ ] Findings documented as tasks with severity (critical, high, medium, low)
`,
  },
  {
    name: 'test-coverage',
    description: 'Identify untested code paths and recommend tests to add.',
    template: `# Test Coverage

Identify untested code paths and recommend specific tests to add.

## Scope

1. **Core business logic** - Find functions handling critical operations that have no corresponding test file or test cases
2. **Error handling paths** - Identify catch blocks, fallback branches, and edge conditions that are never exercised by existing tests
3. **Integration points** - Check that API endpoints, database operations, and external service calls have tests covering success and failure cases
4. **Recent changes** - Review commits from the last week for source changes not accompanied by test changes
5. **Branch coverage gaps** - Find conditional logic where only the happy path is tested and alternative branches are not

## Goals

## Blocked By

## Definition of Done

- [ ] Modules with no test coverage listed with file paths
- [ ] Critical untested code paths prioritized by risk
- [ ] Specific test cases described for each gap (function name, scenario, expected behavior)
- [ ] Findings documented as tasks, one per module or area
`,
  },
  {
    name: 'dead-code',
    description: 'Find unused exports, unreachable code, and orphaned files.',
    template: `# Dead Code

Find unused code that can be safely removed to improve maintainability.

## Scope

1. **Unused exports** - Search for each exported function, class, and constant to confirm it is imported somewhere; flag those with no importers
2. **Unreachable code** - Look for code after return statements, conditions that can never be true, and default switch branches that are fully covered
3. **Orphaned files** - Identify source files that are not imported by any other file and are not entry points
4. **Unused dependencies** - Cross-reference packages in package.json with actual import statements in source code
5. **Commented-out code** - Find blocks of commented-out code that should be deleted or restored

## Goals

## Blocked By

## Definition of Done

- [ ] Unused exports listed with file paths and export names
- [ ] Orphaned files identified and confirmed not loaded dynamically or via plugin systems
- [ ] Unused dependencies listed by package name
- [ ] Commented-out code blocks located and listed for removal
- [ ] Each removal verified safe by checking for dynamic imports, reflection, and generated references
`,
  },
]

interface AuditInfo {
  key: string
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
  const { context, fileSystem, settings } = dependencies
  const colors = getColors()

  const dustPath = `${context.cwd}/.dust`
  const userAuditsPath = `${dustPath}/config/audits`

  const audits = new Map<string, AuditInfo>()

  // First, add stock audits (all stock templates have markdown titles)
  for (const stockAudit of STOCK_AUDITS) {
    audits.set(stockAudit.name, {
      key: stockAudit.name,
      name: extractTitle(stockAudit.template)!,
      description: stockAudit.description,
      source: 'stock',
    })
  }

  // Then, add user-configured audits (these take precedence)
  if (fileSystem.exists(userAuditsPath)) {
    const files = await fileSystem.readdir(userAuditsPath)
    const mdFiles = files.filter(f => f.endsWith('.md')).sort()

    for (const file of mdFiles) {
      const key = basename(file, '.md')
      const filePath = `${userAuditsPath}/${file}`
      const content = await fileSystem.readFile(filePath)
      const title = extractTitle(content)
      const openingSentence = extractOpeningSentence(content)
      const relativePath = `.dust/config/audits/${file}`

      audits.set(key, {
        key,
        name: title || key,
        description: openingSentence || '',
        source: relativePath,
      })
    }
  }

  // Output the list
  context.stdout('🔍 Audits')
  context.stdout('')
  context.stdout('Audits are canned tasks that help maintain project health.')
  context.stdout(
    `Run '${settings.dustCommand} audit <name>' to create an audit task.`
  )
  context.stdout('')

  for (const auditInfo of audits.values()) {
    context.stdout(`${colors.bold}# ${auditInfo.name}${colors.reset}`)
    if (auditInfo.description) {
      context.stdout(`${colors.dim}${auditInfo.description}${colors.reset}`)
    }
    context.stdout(
      `${colors.cyan}→ ${settings.dustCommand} audit ${auditInfo.key}${colors.reset} (${auditInfo.source})`
    )
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
