/**
 * dust migrate - Migrate from legacy goals to principles terminology
 */

import { isErrorCode } from '../../filesystem/error-codes'
import { getColors } from '../colors'
import type { CommandDependencies, CommandResult, GlobScanner } from '../types'

/**
 * Safely scans a directory for markdown files.
 */
async function scanMarkdownFiles(
  glob: GlobScanner,
  dirPath: string
): Promise<string[]> {
  const files: string[] = []
  try {
    for await (const file of glob.scan(dirPath)) {
      if (file.endsWith('.md')) {
        files.push(`${dirPath}/${file}`)
      }
    }
    return files
  } catch (error) {
    if (isErrorCode(error, 'ENOENT')) {
      return []
    }
    throw error
  }
}

/**
 * Migrates a .dust repository from the legacy "goals" terminology to "principles".
 *
 * Migration steps:
 * 1. Rename .dust/goals/ directory to .dust/principles/
 * 2. Update markdown headings from "## Goals" to "## Principles"
 * 3. Update "## Parent Goal" to "## Parent Principle"
 * 4. Update "## Sub-Goals" to "## Sub-Principles"
 * 5. Update links from ../goals/ to ../principles/
 */
export async function migrate(
  dependencies: CommandDependencies
): Promise<CommandResult> {
  const { context, fileSystem, globScanner } = dependencies
  const colors = getColors()
  const dustPath = `${context.cwd}/.dust`
  const goalsPath = `${dustPath}/goals`
  const principlesPath = `${dustPath}/principles`

  // Check if .dust directory exists
  const dustExists = fileSystem.exists(dustPath)
  if (!dustExists) {
    context.stderr(
      `${colors.yellow}Error:${colors.reset} .dust directory not found. Run '${colors.cyan}dust init${colors.reset}' first.`
    )
    return { exitCode: 1 }
  }

  // Check if migration is needed
  const goalsExists = fileSystem.exists(goalsPath)
  const principlesExists = fileSystem.exists(principlesPath)

  if (!goalsExists && principlesExists) {
    context.stdout(
      `${colors.green}✓${colors.reset} Already migrated - .dust/principles/ exists`
    )
    return { exitCode: 0 }
  }

  if (!goalsExists && !principlesExists) {
    context.stdout(
      `${colors.yellow}⚠️${colors.reset} No .dust/goals/ directory found. Creating .dust/principles/...`
    )
    await fileSystem.mkdir(principlesPath, { recursive: true })
    return { exitCode: 0 }
  }

  // Perform migration
  let updatedFilesCount = 0

  // Step 1: Rename .dust/goals/ to .dust/principles/
  context.stdout(
    `${colors.cyan}→${colors.reset} Renaming .dust/goals/ to .dust/principles/...`
  )
  await fileSystem.rename(goalsPath, principlesPath)

  // Step 2: Update references in all markdown files in .dust/
  context.stdout(
    `${colors.cyan}→${colors.reset} Updating references in markdown files...`
  )

  const markdownFiles = await scanMarkdownFiles(globScanner, dustPath)

  for (const filePath of markdownFiles) {
    const content = await fileSystem.readFile(filePath)
    let updated = content

    // Replace goal-related terminology
    updated = updated.replace(/## Goals\b/g, '## Principles')
    updated = updated.replace(/## Parent Goal\b/g, '## Parent Principle')
    updated = updated.replace(/## Sub-Goals\b/g, '## Sub-Principles')
    updated = updated.replace(/\.\.\/goals\//g, '../principles/')

    if (updated !== content) {
      await fileSystem.writeFile(filePath, updated)
      updatedFilesCount++
    }
  }

  // Summary
  context.stdout('')
  context.stdout(`${colors.green}✓${colors.reset} Migration complete!`)
  context.stdout(
    `  ${colors.dim}• Renamed .dust/goals/ → .dust/principles/${colors.reset}`
  )
  if (updatedFilesCount > 0) {
    context.stdout(
      `  ${colors.dim}• Updated ${updatedFilesCount} markdown file(s)${colors.reset}`
    )
  }

  return { exitCode: 0 }
}
