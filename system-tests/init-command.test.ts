import { expect, test } from 'vitest'
import { createShellEmulator } from './support/shell-emulator'

test('init command creates .dust directory structure', async () => {
  // Use shell emulator directly since init doesn't follow typical agent flow
  const shell = await createShellEmulator({
    fileSystemTree: {
      project: {
        // Empty project, no .dust directory
      },
    },
  })

  const result = await shell.exec('bin/dust init')

  expect(result.exitCode).toBe(0)
  expect(result.stdout).toContain('Initialized')
  expect(result.stdout).toContain('.dust/')
})

test('init command creates required directories', async () => {
  const shell = await createShellEmulator({
    fileSystemTree: {
      project: {},
    },
  })

  const result = await shell.exec('bin/dust init')

  expect(result.exitCode).toBe(0)
  // Should mention created directories
  expect(result.stdout).toContain('principles')
  expect(result.stdout).toContain('tasks')
  expect(result.stdout).toContain('ideas')
  expect(result.stdout).toContain('facts')
})

test('init command creates CLAUDE.md with agent instructions', async () => {
  const shell = await createShellEmulator({
    fileSystemTree: {
      project: {},
    },
  })

  const result = await shell.exec('bin/dust init')

  expect(result.exitCode).toBe(0)
  expect(result.stdout).toContain('CLAUDE.md')

  // Verify the file was created
  const claudeMd = shell.fileSystem.writtenFiles.get('/project/CLAUDE.md')
  expect(claudeMd).toBeDefined()
  expect(claudeMd).toContain('dust agent')
})

test('init command creates AGENTS.md with agent instructions', async () => {
  const shell = await createShellEmulator({
    fileSystemTree: {
      project: {},
    },
  })

  const result = await shell.exec('bin/dust init')

  expect(result.exitCode).toBe(0)
  expect(result.stdout).toContain('AGENTS.md')

  // Verify the file was created
  const agentsMd = shell.fileSystem.writtenFiles.get('/project/AGENTS.md')
  expect(agentsMd).toBeDefined()
  expect(agentsMd).toContain('dust agent')
})

test('init command creates settings.json', async () => {
  const shell = await createShellEmulator({
    fileSystemTree: {
      project: {},
    },
  })

  const result = await shell.exec('bin/dust init')

  expect(result.exitCode).toBe(0)
  expect(result.stdout).toContain('settings.json')

  // Verify settings file was created
  const settings = shell.fileSystem.writtenFiles.get(
    '/project/.dust/config/settings.json'
  )
  expect(settings).toBeDefined()
  const parsed = JSON.parse(settings!)
  expect(parsed.dustCommand).toBeDefined()
})

test('init command creates initial fact about using dust', async () => {
  const shell = await createShellEmulator({
    fileSystemTree: {
      project: {},
    },
  })

  const result = await shell.exec('bin/dust init')

  expect(result.exitCode).toBe(0)

  // Should create a fact file about using dust
  const factFile = shell.fileSystem.writtenFiles.get(
    '/project/.dust/facts/use-dust-for-planning.md'
  )
  expect(factFile).toBeDefined()
  expect(factFile).toContain('dust')
})

test('init command warns when .dust already exists', async () => {
  const shell = await createShellEmulator({
    fileSystemTree: {
      project: {
        '.dust': {
          facts: { 'use-dust-for-planning.md': '# Existing fact' },
          config: { 'settings.json': '{}' },
        },
      },
    },
  })

  const result = await shell.exec('bin/dust init')

  expect(result.exitCode).toBe(0)
  expect(result.stdout).toContain('already exists')
})

test('init command warns when CLAUDE.md already exists', async () => {
  const shell = await createShellEmulator({
    fileSystemTree: {
      project: {
        'CLAUDE.md': '# Existing Claude Instructions',
      },
    },
  })

  const result = await shell.exec('bin/dust init')

  expect(result.exitCode).toBe(0)
  expect(result.stdout).toContain('CLAUDE.md')
  expect(result.stdout).toContain('already exists')
})

test('init command provides next steps guidance', async () => {
  const shell = await createShellEmulator({
    fileSystemTree: {
      project: {},
    },
  })

  const result = await shell.exec('bin/dust init')

  expect(result.exitCode).toBe(0)
  expect(result.stdout).toContain('Next steps')
})
