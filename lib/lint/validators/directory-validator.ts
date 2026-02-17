/**
 * Directory structure validation for .dust
 */

import type { FileSystem } from '../../cli/types'
import type { Violation } from './types'

const EXPECTED_DIRECTORIES = ['goals', 'ideas', 'tasks', 'facts', 'config']

export async function validateContentDirectoryFiles(
  dirPath: string,
  fileSystem: FileSystem
): Promise<Violation[]> {
  const violations: Violation[] = []

  let entries: string[]
  try {
    entries = await fileSystem.readdir(dirPath)
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      return []
    }
    throw error
  }

  for (const entry of entries) {
    const entryPath = `${dirPath}/${entry}`

    // Check for hidden files
    if (entry.startsWith('.')) {
      violations.push({
        file: entryPath,
        message: `Hidden file "${entry}" found in content directory`,
      })
      continue
    }

    // Check for subdirectories
    if (fileSystem.isDirectory(entryPath)) {
      violations.push({
        file: entryPath,
        message: `Subdirectory "${entry}" found in content directory (content directories should be flat)`,
      })
      continue
    }

    // Check for non-markdown files
    if (!entry.endsWith('.md')) {
      violations.push({
        file: entryPath,
        message: `Non-markdown file "${entry}" found in content directory`,
      })
    }
  }

  return violations
}

export async function validateDirectoryStructure(
  dustPath: string,
  fileSystem: FileSystem,
  extraDirectories: string[] = []
): Promise<Violation[]> {
  const violations: Violation[] = []

  let entries: string[]
  try {
    entries = await fileSystem.readdir(dustPath)
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      return []
    }
    throw error
  }

  const allowedDirectories = new Set([
    ...EXPECTED_DIRECTORIES,
    ...extraDirectories,
  ])

  for (const entry of entries) {
    const entryPath = `${dustPath}/${entry}`

    if (!fileSystem.isDirectory(entryPath)) {
      continue
    }

    if (!allowedDirectories.has(entry)) {
      const allowedList = [...allowedDirectories].sort().join(', ')
      violations.push({
        file: entryPath,
        message: `Unexpected directory "${entry}" in .dust/. Allowed directories: ${allowedList}. To allow this directory, add it to "extraDirectories" in .dust/config/settings.json`,
      })
    }
  }

  return violations
}
