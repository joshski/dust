/**
 * In-memory FileSystem emulator for testing and cache-backed use cases.
 *
 * Provides a complete FileSystem + GlobScanner implementation backed by
 * an in-memory file tree, with write tracking for test assertions.
 */

import type { FileSystem, GlobScanner, WriteOptions } from './types'

export type FileSystemTree = {
  [name: string]: string | FileSystemTree
}

/**
 * Converts a nested FileSystemTree to absolute paths.
 * Returns both a files Map (for files) and a paths Set (for all paths including directories).
 */
function flattenFileSystemTree(
  tree: FileSystemTree,
  basePath = ''
): { files: Map<string, string>; paths: Set<string> } {
  const files = new Map<string, string>()
  const paths = new Set<string>()

  for (const [name, value] of Object.entries(tree)) {
    const fullPath = basePath ? `${basePath}/${name}` : `/${name}`

    if (typeof value === 'string') {
      // It's a file
      files.set(fullPath, value)
      paths.add(fullPath)
    } else {
      // It's a directory
      paths.add(fullPath)
      const nested = flattenFileSystemTree(value, fullPath)
      for (const [path, content] of nested.files) {
        files.set(path, content)
      }
      for (const path of nested.paths) {
        paths.add(path)
      }
    }
  }

  // Add parent directories
  for (const path of [...files.keys(), ...paths]) {
    let dir = path
    while (dir.includes('/')) {
      dir = dir.substring(0, dir.lastIndexOf('/'))
      if (dir) paths.add(dir)
    }
  }

  return { files, paths }
}

/**
 * Extended file system with write tracking for assertions.
 * Also implements GlobScanner by scanning over known files.
 */
export interface FileSystemEmulator extends FileSystem, GlobScanner {
  createdDirs: string[]
  writtenFiles: Map<string, string>
  /** Internal files map - exposed for tests that need to modify file system state */
  files: Map<string, string>
  /** File permissions set via chmod - maps path to mode */
  permissions: Map<string, number>
}

/**
 * Creates a file system emulator with optional file contents and write tracking.
 * Implements both FileSystem and GlobScanner interfaces - the scan() method
 * iterates over the files the emulator knows about.
 *
 * @param tree - Nested object representing file system hierarchy (paths get '/' prefix)
 * @param flatFiles - Optional record of path→content entries added as-is (no prefix)
 * @returns FileSystemEmulator with tracking for created directories and written files
 *
 * @example
 * // Nested tree (paths become /project/.dust/...)
 * createFileSystemEmulator({
 *   project: {
 *     '.dust': {
 *       principles: { 'my-principle.md': '# My Principle' },
 *       ideas: {}  // empty directory
 *     }
 *   }
 * })
 *
 * // Flat files (paths used as-is)
 * createFileSystemEmulator({}, {
 *   '.dust/config/audits/security.md': '# Security Audit\n...',
 *   '.dust/tasks/audit-security.md': '# Run security audit\n...',
 * })
 */
export function createFileSystemEmulator(
  tree: FileSystemTree = {},
  flatFiles?: Record<string, string>
): FileSystemEmulator {
  const { files, paths } = flattenFileSystemTree(tree)

  // Add flat file entries directly (paths used as-is, no prefix added)
  if (flatFiles) {
    for (const [filePath, content] of Object.entries(flatFiles)) {
      files.set(filePath, content)
      paths.add(filePath)
      // Add parent directories
      for (
        let dir = filePath.substring(0, filePath.lastIndexOf('/'));
        dir;
        dir = dir.substring(0, dir.lastIndexOf('/'))
      ) {
        paths.add(dir)
      }
    }
  }

  const createdDirs: string[] = []
  const writtenFiles = new Map<string, string>()
  const permissions = new Map<string, number>()
  const creationTimes = new Map<string, number>()
  let nextCreationTime = 1000

  // Assign creation times in insertion order (Map iteration order)
  for (const path of files.keys()) {
    creationTimes.set(path, nextCreationTime++)
  }

  return {
    exists: (path: string) => paths.has(path),
    isDirectory: (path: string) => paths.has(path) && !files.has(path),
    readFile: async (path: string) => {
      if (!files.has(path)) {
        const error = new Error(
          `ENOENT: no such file or directory, open '${path}'`
        )
        ;(error as NodeJS.ErrnoException).code = 'ENOENT'
        throw error
      }
      return files.get(path) as string
    },
    writeFile: async (
      path: string,
      content: string,
      options?: WriteOptions
    ) => {
      if (options?.flag === 'wx' && paths.has(path)) {
        const error = new Error(`EEXIST: file already exists, open '${path}'`)
        ;(error as NodeJS.ErrnoException).code = 'EEXIST'
        throw error
      }
      writtenFiles.set(path, content)
      paths.add(path)
      files.set(path, content)
      if (!creationTimes.has(path)) {
        creationTimes.set(path, nextCreationTime++)
      }
    },
    mkdir: async (path: string) => {
      createdDirs.push(path)
    },
    readdir: async (path: string) => {
      const prefix = `${path}/`
      const entries = new Set<string>()
      // Add direct file children
      for (const f of files.keys()) {
        if (f.startsWith(prefix)) {
          const relativePath = f.slice(prefix.length)
          // If it doesn't contain '/', it's a direct child file
          if (!relativePath.includes('/')) {
            entries.add(relativePath)
          } else {
            // Otherwise, the first segment is a directory
            entries.add(relativePath.split('/')[0])
          }
        }
      }
      return Array.from(entries)
    },
    chmod: async (path: string, mode: number) => {
      permissions.set(path, mode)
    },
    getFileCreationTime: (path: string) => {
      return creationTimes.get(path) ?? 0
    },
    scan: async function* (dir: string) {
      // Check if directory exists (it's in paths if it was created or is a parent of any file)
      if (!paths.has(dir)) {
        const error = new Error(
          `ENOENT: no such file or directory, scandir '${dir}'`
        )
        ;(error as NodeJS.ErrnoException).code = 'ENOENT'
        throw error
      }
      const prefix = `${dir}/`
      for (const file of files.keys()) {
        if (file.startsWith(prefix)) {
          yield file.slice(prefix.length)
        }
      }
    },
    rename: async (oldPath: string, newPath: string) => {
      // Move all files under oldPath to newPath
      const entriesToMove: [string, string][] = []
      const pathsToUpdate: string[] = []

      for (const [path, content] of files.entries()) {
        if (path === oldPath || path.startsWith(`${oldPath}/`)) {
          const relativePath = path.slice(oldPath.length)
          const newFilePath = `${newPath}${relativePath}`
          entriesToMove.push([path, newFilePath])
          files.set(newFilePath, content)
          paths.add(newFilePath)
        }
      }

      for (const path of paths) {
        if (path === oldPath || path.startsWith(`${oldPath}/`)) {
          pathsToUpdate.push(path)
          const relativePath = path.slice(oldPath.length)
          paths.add(`${newPath}${relativePath}`)
        }
      }

      // Remove old entries
      for (const [oldFilePath] of entriesToMove) {
        files.delete(oldFilePath)
        paths.delete(oldFilePath)
      }
      for (const oldPathEntry of pathsToUpdate) {
        paths.delete(oldPathEntry)
      }
    },
    createdDirs,
    writtenFiles,
    files,
    permissions,
  }
}
