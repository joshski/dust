/**
 * Testable wiring logic for the CLI entry point.
 *
 * This module extracts the dependency construction and wiring logic
 * so it can be tested independently of the real Node.js APIs.
 */
import { existsSync, statSync } from 'node:fs'
import {
  chmod,
  mkdir,
  readdir,
  readFile,
  rename,
  writeFile,
} from 'node:fs/promises'
import { createGitDirectoryFileSorter } from '../git/file-sorter'
import { main } from './main'
import { defaultGitRunner } from './process-runner'
import type { FileSystem, GlobScanner } from './types'

/**
 * Node.js primitives required to construct the FileSystem
 */
export interface FileSystemPrimitives {
  existsSync: (path: string) => boolean
  statSync: (path: string) => {
    isDirectory: () => boolean
    birthtimeMs: number
  }
  readFile: (path: string, encoding: 'utf-8') => Promise<string>
  writeFile: (
    path: string,
    content: string,
    options?: { encoding: 'utf-8'; flag?: string }
  ) => Promise<void>
  mkdir: (
    path: string,
    options?: { recursive?: boolean }
  ) => Promise<string | undefined>
  readdir: {
    (path: string): Promise<string[]>
    (path: string, options: { recursive: true }): Promise<string[]>
  }
  chmod: (path: string, mode: number) => Promise<void>
  rename: (oldPath: string, newPath: string) => Promise<void>
}

/**
 * Process primitives required for the entry point
 */
export interface ProcessPrimitives {
  argv: string[]
  cwd: () => string
  exit: (code: number) => void
}

import type { CommandEvent } from '../command-events'

/**
 * Console primitives required for the entry point
 */
export interface ConsolePrimitives {
  log: (message: string) => void
  write?: (message: string) => void
  error: (message: string) => void
  emitEvent?: (event: CommandEvent) => void
}

/**
 * Creates a FileSystem implementation from Node.js primitives
 */
export function createFileSystem(primitives: FileSystemPrimitives): FileSystem {
  return {
    exists: primitives.existsSync,
    isDirectory: path => {
      try {
        return primitives.statSync(path).isDirectory()
      } catch {
        return false
      }
    },
    readFile: path => primitives.readFile(path, 'utf-8'),
    writeFile: (path, content, options) =>
      primitives.writeFile(path, content, {
        encoding: 'utf-8',
        flag: options?.flag,
      }),
    mkdir: async (path, options) => {
      await primitives.mkdir(path, options)
    },
    getFileCreationTime: path => primitives.statSync(path).birthtimeMs,
    readdir: path => primitives.readdir(path),
    chmod: (path, mode) => primitives.chmod(path, mode),
    rename: (oldPath, newPath) => primitives.rename(oldPath, newPath),
  }
}

/**
 * Creates a GlobScanner implementation from the readdir primitive
 */
export function createGlobScanner(
  readdirFn: FileSystemPrimitives['readdir']
): GlobScanner {
  return {
    scan: async function* (dir) {
      for (const entry of await readdirFn(dir, { recursive: true })) {
        if (entry.endsWith('.md')) yield entry
      }
    },
  }
}

/**
 * Default file system primitives backed by real Node.js fs APIs.
 */
export const defaultFileSystemPrimitives: FileSystemPrimitives = {
  existsSync,
  statSync,
  readFile,
  writeFile,
  mkdir,
  readdir,
  chmod,
  rename,
}

/**
 * Wires together all dependencies and runs the CLI.
 * This is the testable core of the entry point.
 */
export async function wireEntry(
  fsPrimitives: FileSystemPrimitives,
  processPrimitives: ProcessPrimitives,
  consolePrimitives: ConsolePrimitives
): Promise<void> {
  const fileSystem = createFileSystem(fsPrimitives)
  const glob = createGlobScanner(fsPrimitives.readdir)
  const directoryFileSorter = createGitDirectoryFileSorter(defaultGitRunner)

  const result = await main({
    commandArguments: processPrimitives.argv.slice(2),
    context: {
      cwd: processPrimitives.cwd(),
      stdout: consolePrimitives.log,
      stdoutInline: consolePrimitives.write,
      stderr: consolePrimitives.error,
      emitEvent: consolePrimitives.emitEvent,
    },
    fileSystem,
    glob,
    directoryFileSorter,
  })

  processPrimitives.exit(result.exitCode)
}
