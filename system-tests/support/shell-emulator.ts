/**
 * Shell emulator for e2e tests
 *
 * Executes dust CLI commands using in-memory file system emulation.
 * Directly calls the dust main() function with injected dependencies
 * instead of spawning subprocesses.
 */

import { main } from '../../lib/cli/main'
import {
  createContextEmulator,
  createFileSystemEmulator,
  type FileSystemEmulator,
  type FileSystemTree,
  stubEnv,
} from '../../lib/test/test-utilities'

export interface CommandResult {
  stdout: string
  stderr: string
  exitCode: number
}

export interface ShellEmulator {
  /** Execute a dust CLI command */
  exec(command: string): Promise<CommandResult>
  /** The virtual working directory path */
  readonly cwd: string
  /** Access to the file system emulator for assertions */
  readonly fileSystem: FileSystemEmulator
}

/**
 * Default file system tree with empty .dust directories
 */
const defaultFileSystemTree: FileSystemTree = {
  project: {
    '.dust': {
      principles: {},
      ideas: {},
      tasks: {},
      facts: {},
    },
  },
}

export interface ShellEmulatorOptions {
  /** Initial file system state (defaults to empty .dust directories) */
  fileSystemTree?: FileSystemTree
  /** Working directory path (defaults to /project) */
  cwd?: string
}

/**
 * Creates a shell emulator that runs commands in-memory
 *
 * Uses the existing FileSystemEmulator from test utilities for all
 * file operations, making tests fast and isolated.
 */
export async function createShellEmulator(
  options: ShellEmulatorOptions = {}
): Promise<ShellEmulator> {
  const { fileSystemTree = defaultFileSystemTree, cwd = '/project' } = options

  const fileSystem = createFileSystemEmulator(fileSystemTree)

  const exec = async (command: string): Promise<CommandResult> => {
    // Parse command - expect format like "bin/dust agent" or just "agent"
    const parts = command.split(/\s+/)

    // Remove "bin/dust" prefix if present
    const commandArguments =
      parts[0] === 'bin/dust' || parts[0] === 'dust' ? parts.slice(1) : parts

    // Create fresh context for each command to capture output
    const context = createContextEmulator(cwd)

    // System tests should exercise normal CLI behavior regardless of parent process env.
    return await stubEnv('DUST_SKIP_AGENT', undefined, async () => {
      const result = await main({
        commandArguments,
        context,
        fileSystem,
        glob: fileSystem,
      })

      return {
        stdout: context.stdoutLines.join('\n'),
        stderr: context.stderrLines.join('\n'),
        exitCode: result.exitCode,
      }
    })
  }

  return {
    exec,
    cwd,
    fileSystem,
  }
}
