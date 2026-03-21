/**
 * Directory structure validation for .dust
 */

import { ARTIFACT_TYPES } from '../../artifacts/index'
import type { ReadableFileSystem } from '../../filesystem/types'
import type { Violation } from './types'

const EXPECTED_DIRECTORIES = [...ARTIFACT_TYPES, 'config']
const EXPECTED_ROOT_FILES = ['repository.md']
const EXPECTED_CONFIG_FILES = ['settings.json']
const EXPECTED_CONFIG_DIRECTORIES = ['audits', 'agents', 'container', 'hints']

export async function validateContentDirectoryFiles(
  dirPath: string,
  fileSystem: ReadableFileSystem
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
  fileSystem: ReadableFileSystem
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

  const allowedDirectories = new Set(EXPECTED_DIRECTORIES)
  const allowedRootFiles = new Set(EXPECTED_ROOT_FILES)
  const allowedRootList = [
    ...[...allowedDirectories].toSorted().map(directory => `${directory}/`),
    ...EXPECTED_ROOT_FILES,
  ].join(', ')

  for (const entry of entries) {
    const entryPath = `${dustPath}/${entry}`

    if (entry === 'Dockerfile') {
      violations.push({
        file: entryPath,
        message:
          '".dust/Dockerfile" is no longer supported. Move Docker-related configuration under ".dust/config/".',
      })
      continue
    }

    const isDirectory = fileSystem.isDirectory(entryPath)

    if (!isDirectory) {
      if (allowedRootFiles.has(entry)) {
        continue
      }
      violations.push({
        file: entryPath,
        message: `Unexpected file "${entry}" in .dust/. Allowed root paths: ${allowedRootList}`,
      })
      continue
    }

    if (!allowedDirectories.has(entry)) {
      violations.push({
        file: entryPath,
        message: `Unexpected directory "${entry}" in .dust/. Allowed root paths: ${allowedRootList}`,
      })
    }
  }

  const configPath = `${dustPath}/config`
  if (!fileSystem.isDirectory(configPath)) {
    return violations
  }

  let configEntries: string[]
  try {
    configEntries = await fileSystem.readdir(configPath)
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      return violations
    }
    throw error
  }

  const allowedConfigFiles = new Set(EXPECTED_CONFIG_FILES)
  const allowedConfigDirectories = new Set(EXPECTED_CONFIG_DIRECTORIES)
  const allowedConfigList = [
    ...EXPECTED_CONFIG_DIRECTORIES.map(directory => `${directory}/`),
    ...EXPECTED_CONFIG_FILES,
  ]
    .toSorted()
    .join(', ')

  for (const entry of configEntries) {
    const entryPath = `${configPath}/${entry}`

    if (fileSystem.isDirectory(entryPath)) {
      if (!allowedConfigDirectories.has(entry)) {
        violations.push({
          file: entryPath,
          message: `Unexpected directory "${entry}" in .dust/config/. Allowed entries: ${allowedConfigList}`,
        })
      }
      continue
    }

    if (!allowedConfigFiles.has(entry)) {
      violations.push({
        file: entryPath,
        message: `Unexpected file "${entry}" in .dust/config/. Allowed entries: ${allowedConfigList}`,
      })
    }
  }

  return violations
}
