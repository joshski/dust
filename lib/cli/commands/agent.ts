/**
 * dust agent - Agent greeting and routing instructions
 *
 * Displays the welcome message and command routing guidance for AI agents.
 * Also runs the install command if configured.
 */

import { type ChildProcess, spawn } from 'node:child_process'
import { loadTemplate } from '../templates'
import type { CommandDependencies, CommandResult } from '../types'
import { manageGitHooks, templateVariables } from './agent-shared'

export type SpawnFn = (
  command: string,
  commandArguments: string[],
  options: { cwd: string; shell?: boolean }
) => ChildProcess

export interface InstallRunner {
  run: (
    command: string,
    cwd: string
  ) => Promise<{ exitCode: number; output: string }>
}

export function createInstallRunner(spawnFn: SpawnFn): InstallRunner {
  return {
    run: (command, cwd) => {
      return new Promise(resolve => {
        const proc = spawnFn(command, [], { cwd, shell: true })
        const chunks: string[] = []

        proc.stdout?.on('data', (data: Buffer) => {
          chunks.push(data.toString())
        })
        proc.stderr?.on('data', (data: Buffer) => {
          chunks.push(data.toString())
        })

        proc.on('close', code => {
          resolve({ exitCode: code ?? 1, output: chunks.join('') })
        })
        proc.on('error', error => {
          resolve({ exitCode: 1, output: error.message })
        })
      })
    },
  }
}

export const defaultInstallRunner: InstallRunner = createInstallRunner(spawn)

export async function agent(
  dependencies: CommandDependencies,
  installRunner: InstallRunner = defaultInstallRunner
): Promise<CommandResult> {
  const { context, settings } = dependencies
  const hooksInstalled = await manageGitHooks(dependencies)

  // Show greeting first
  const vars = templateVariables(settings, hooksInstalled)
  context.stdout(loadTemplate('agent-greeting', vars))

  // Run install command if configured
  if (settings.installCommand) {
    context.stdout('')
    context.stdout('Installing project dependencies:')
    context.stdout('')
    context.stdout(`> ${settings.installCommand}`)
    const { exitCode, output } = await installRunner.run(
      settings.installCommand,
      context.cwd
    )
    if (output.trim()) {
      context.stdout(output.trimEnd())
    }
    if (exitCode !== 0) {
      context.stderr(`Install command failed with exit code ${exitCode}`)
    } else {
      context.stdout('')
      context.stdout('✅ Dependencies installed, ready to roll!')
    }
  }

  return { exitCode: 0 }
}
