/**
 * Filename validation for .dust markdown files
 */

import { titleToFilename } from '../../artifacts/workflow-tasks'
import { extractTitle } from '../../markdown/markdown-utilities'
import type { Violation } from './types'

const SLUG_PATTERN = /^[a-z0-9]+(-[a-z0-9]+)*\.md$/

export function validateFilename(filePath: string): Violation | null {
  const parts = filePath.split('/')
  const filename = parts[parts.length - 1]
  if (!SLUG_PATTERN.test(filename)) {
    return {
      file: filePath,
      message: `Filename "${filename}" does not match slug-style naming`,
    }
  }
  return null
}

export function validateTitleFilenameMatch(
  filePath: string,
  content: string
): Violation | null {
  const title = extractTitle(content)
  if (!title) {
    return null // No title to validate against
  }

  const parts = filePath.split('/')
  const actualFilename = parts[parts.length - 1]
  const expectedFilename = titleToFilename(title)

  if (actualFilename !== expectedFilename) {
    return {
      file: filePath,
      message: `Filename "${actualFilename}" does not match title "${title}" (expected "${expectedFilename}")`,
    }
  }

  return null
}
