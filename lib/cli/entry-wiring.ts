/**
 * Testable wiring logic for the CLI entry point.
 *
 * This module extracts the dependency construction and wiring logic
 * so it can be tested independently of the real Node.js APIs.
 */
import type { GlobScanner } from './commands/validate'
import { main } from './main'
import type { FileSystem } from './types'

/**
 * Node.js primitives required to construct the FileSystem
 */
export interface FileSystemPrimitives {
  existsSync: (path: string) => boolean
  readFile: (path: string, encoding: 'utf-8') => Promise<string>
  writeFile: (path: string, content: string, encoding: 'utf-8') => Promise<void>
  mkdir: (
    path: string,
    options?: { recursive?: boolean }
  ) => Promise<string | undefined>
  readdir: {
    (path: string): Promise<string[]>
    (path: string, options: { recursive: true }): Promise<string[]>
  }
  chmod: (path: string, mode: number) => Promise<void>
}

/**
 * Process primitives required for the entry point
 */
export interface ProcessPrimitives {
  argv: string[]
  cwd: () => string
  exit: (code: number) => void
}

/**
 * Console primitives required for the entry point
 */
export interface ConsolePrimitives {
  log: (message: string) => void
  error: (message: string) => void
}

/**
 * Creates a FileSystem implementation from Node.js primitives
 */
export function createFileSystem(primitives: FileSystemPrimitives): FileSystem {
  return {
    exists: primitives.existsSync,
    readFile: path => primitives.readFile(path, 'utf-8'),
    writeFile: (path, content) => primitives.writeFile(path, content, 'utf-8'),
    mkdir: async (path, options) => {
      await primitives.mkdir(path, options)
    },
    readdir: path => primitives.readdir(path),
    chmod: (path, mode) => primitives.chmod(path, mode),
  }
}

/**
 * Creates a GlobScanner implementation from the readdir primitive
 */
export function createGlobScanner(
  readdir: FileSystemPrimitives['readdir']
): GlobScanner {
  return {
    scan: async function* (dir) {
      for (const entry of await readdir(dir, { recursive: true })) {
        if (entry.endsWith('.md')) yield entry
      }
    },
  }
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
  const fs = createFileSystem(fsPrimitives)
  const glob = createGlobScanner(fsPrimitives.readdir)

  const result = await main({
    args: processPrimitives.argv.slice(2),
    ctx: {
      cwd: processPrimitives.cwd(),
      stdout: consolePrimitives.log,
      stderr: consolePrimitives.error,
    },
    fs,
    glob,
  })

  processPrimitives.exit(result.exitCode)
}
