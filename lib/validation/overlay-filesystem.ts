/**
 * Overlay filesystem that layers patch files over an existing ReadableFileSystem.
 * Supports deletions via a set of paths to hide from the base filesystem.
 */

import type { ReadableFileSystem } from '../filesystem/types'

export function createOverlayFileSystem(
  base: ReadableFileSystem,
  patchFiles: Map<string, string>,
  deletedPaths: Set<string> = new Set()
): ReadableFileSystem {
  // Pre-compute patch directories
  const patchDirs = new Set<string>()
  for (const path of patchFiles.keys()) {
    let dir = path
    while (dir.includes('/')) {
      dir = dir.substring(0, dir.lastIndexOf('/'))
      if (dir) patchDirs.add(dir)
    }
  }

  function isDeleted(path: string): boolean {
    return deletedPaths.has(path)
  }

  return {
    exists(path: string): boolean {
      if (isDeleted(path)) return false
      return patchFiles.has(path) || patchDirs.has(path) || base.exists(path)
    },

    async readFile(path: string): Promise<string> {
      if (isDeleted(path)) {
        const error = new Error(
          `ENOENT: no such file or directory, open '${path}'`
        )
        ;(error as NodeJS.ErrnoException).code = 'ENOENT'
        throw error
      }
      const patchContent = patchFiles.get(path)
      if (patchContent !== undefined) {
        return patchContent
      }
      return base.readFile(path)
    },

    async readdir(path: string): Promise<string[]> {
      const prefix = `${path}/`
      const entries = new Set<string>()

      // Add entries from patch
      for (const patchPath of patchFiles.keys()) {
        if (patchPath.startsWith(prefix)) {
          const relative = patchPath.slice(prefix.length)
          const firstSegment = relative.split('/')[0]
          entries.add(firstSegment)
        }
      }

      // Add entries from base
      try {
        const baseEntries = await base.readdir(path)
        for (const entry of baseEntries) {
          const entryPath = `${path}/${entry}`
          if (!isDeleted(entryPath)) {
            entries.add(entry)
          }
        }
      } catch {
        // Base directory may not exist
      }

      return Array.from(entries)
    },

    isDirectory(path: string): boolean {
      if (isDeleted(path)) return false
      return patchDirs.has(path) || base.isDirectory(path)
    },
  }
}
