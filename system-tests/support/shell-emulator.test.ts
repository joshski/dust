/**
 * Unit tests for shell emulator
 */

import { beforeEach, describe, expect, test } from 'vitest'
import { createShellEmulator, type ShellEmulator } from './shell-emulator'

describe('shell emulator', () => {
  let shell: ShellEmulator

  beforeEach(async () => {
    shell = await createShellEmulator()
  })

  test('executes dust commands and captures output', async () => {
    const result = await shell.exec('bin/dust agent')

    expect(result.exitCode).toBe(0)
    expect(result.stdout).toContain('welcome to dust')
    expect(result.stdout).toContain('dust new task')
  })

  test('strips bin/dust prefix from commands', async () => {
    const withPrefix = await shell.exec('bin/dust help')
    const withoutPrefix = await shell.exec('help')

    expect(withPrefix.stdout).toBe(withoutPrefix.stdout)
  })

  test('provides virtual cwd path', async () => {
    expect(shell.cwd).toBe('/project')
  })

  test('exposes file system emulator for assertions', async () => {
    expect(shell.fileSystem).toBeDefined()
    expect(shell.fileSystem.files).toBeDefined()
  })

  test('accepts custom initial file system state', async () => {
    const customShell = await createShellEmulator({
      fileSystemTree: {
        project: {
          '.dust': {
            principles: {},
            ideas: {},
            tasks: {
              'existing-task.md': '# Existing Task\n\nSome content',
            },
            facts: {},
          },
        },
      },
    })

    const result = await customShell.exec('bin/dust tasks')
    expect(result.exitCode).toBe(0)
    expect(result.stdout).toContain('existing-task')
  })
})
