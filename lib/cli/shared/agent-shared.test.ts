import { describe, expect, test } from 'vitest'
import type { CommandDependencies, DustSettings, FileSystem } from '../types'
import {
  loadAgentInstructions,
  manageGitHooks,
  templateVariables,
  templateVariablesWithInstructions,
} from './agent-shared'

describe('templateVariables', () => {
  const defaultSettings: DustSettings = { dustCommand: 'dust' }

  test('includes agentName from detectAgent', () => {
    const vars = templateVariables(defaultSettings, false, {})
    expect(vars.agentName).toBe('Agent')
  })

  test('includes detected agent name for Claude Code', () => {
    const vars = templateVariables(defaultSettings, false, { CLAUDECODE: '1' })
    expect(vars.agentName).toBe('Claude Code')
  })

  test('includes detected agent name for Claude Code Web', () => {
    const vars = templateVariables(defaultSettings, false, {
      CLAUDECODE: '1',
      CLAUDE_CODE_REMOTE: 'true',
    })
    expect(vars.agentName).toBe('Claude Code Web')
  })

  test('includes detected agent name for Codex', () => {
    const vars = templateVariables(defaultSettings, false, {
      CODEX_HOME: '/home/user/.codex',
    })
    expect(vars.agentName).toBe('Codex')
  })

  test('includes detected agent name for Codex when CODEX_CI is set', () => {
    const vars = templateVariables(defaultSettings, false, {
      CODEX_CI: '1',
    })
    expect(vars.agentName).toBe('Codex')
  })

  test('isClaudeCodeWeb is true when agent is Claude Code Web', () => {
    const vars = templateVariables(defaultSettings, false, {
      CLAUDECODE: '1',
      CLAUDE_CODE_REMOTE: 'true',
    })
    expect(vars.isClaudeCodeWeb).toBe(true)
  })

  test('isClaudeCodeWeb is false when agent is Claude Code', () => {
    const vars = templateVariables(defaultSettings, false, { CLAUDECODE: '1' })
    expect(vars.isClaudeCodeWeb).toBe(false)
  })

  test('isClaudeCodeWeb is false when agent is Codex', () => {
    const vars = templateVariables(defaultSettings, false, {
      CODEX_HOME: '/home/user/.codex',
    })
    expect(vars.isClaudeCodeWeb).toBe(false)
  })

  test('isClaudeCodeWeb is false when agent is Codex via CODEX_CI', () => {
    const vars = templateVariables(defaultSettings, false, {
      CODEX_CI: '1',
    })
    expect(vars.isClaudeCodeWeb).toBe(false)
  })

  test('isClaudeCodeWeb is false when agent is generic Agent', () => {
    const vars = templateVariables(defaultSettings, false, {})
    expect(vars.isClaudeCodeWeb).toBe(false)
  })

  test('hooksInstalled is true when hooks are installed', () => {
    const vars = templateVariables(defaultSettings, true, {})
    expect(vars.hooksInstalled).toBe(true)
  })

  test('hooksInstalled is false when hooks are not installed', () => {
    const vars = templateVariables(defaultSettings, false, {})
    expect(vars.hooksInstalled).toBe(false)
  })

  test('hasIdeaFile defaults to true when not specified', () => {
    const vars = templateVariables(defaultSettings, false, {})
    expect(vars.hasIdeaFile).toBe(true)
  })

  test('hasIdeaFile is false when set to false', () => {
    const vars = templateVariables(
      defaultSettings,
      false,
      {},
      {
        hasIdeaFile: false,
      }
    )
    expect(vars.hasIdeaFile).toBe(false)
  })
})

describe('loadAgentInstructions', () => {
  const createFileSystem = (files: Record<string, string>): FileSystem => ({
    exists: (path: string) => path in files,
    isDirectory: () => false,
    getFileCreationTime: () => 0,
    readFile: async (path: string) => {
      if (path in files) return files[path]
      throw new Error('File not found')
    },
    writeFile: async () => {},
    mkdir: async () => {},
    readdir: async () => [],
    chmod: async () => {},
    rename: async () => {},
  })

  test('returns empty string when file does not exist', async () => {
    const fileSystem = createFileSystem({})
    const result = await loadAgentInstructions(
      '/project',
      fileSystem,
      'claude-code-web'
    )
    expect(result).toBe('')
  })

  test('returns file contents when file exists', async () => {
    const fileSystem = createFileSystem({
      '/project/.dust/config/agents/claude-code-web.md':
        'PostgreSQL is available at localhost:5432',
    })
    const result = await loadAgentInstructions(
      '/project',
      fileSystem,
      'claude-code-web'
    )
    expect(result).toBe('PostgreSQL is available at localhost:5432')
  })

  test('trims whitespace from file contents', async () => {
    const fileSystem = createFileSystem({
      '/project/.dust/config/agents/claude-code.md':
        '\n  Some instructions  \n',
    })
    const result = await loadAgentInstructions(
      '/project',
      fileSystem,
      'claude-code'
    )
    expect(result).toBe('Some instructions')
  })

  test('loads correct file for each agent type', async () => {
    const fileSystem = createFileSystem({
      '/project/.dust/config/agents/claude-code-web.md': 'Web instructions',
      '/project/.dust/config/agents/claude-code.md': 'Desktop instructions',
      '/project/.dust/config/agents/codex.md': 'Codex instructions',
    })
    expect(
      await loadAgentInstructions('/project', fileSystem, 'claude-code-web')
    ).toBe('Web instructions')
    expect(
      await loadAgentInstructions('/project', fileSystem, 'claude-code')
    ).toBe('Desktop instructions')
    expect(await loadAgentInstructions('/project', fileSystem, 'codex')).toBe(
      'Codex instructions'
    )
  })

  test('throws on non-ENOENT read error', async () => {
    const permissionError = new Error(
      'Permission denied'
    ) as NodeJS.ErrnoException
    permissionError.code = 'EACCES'
    const fileSystem: FileSystem = {
      exists: () => true,
      isDirectory: () => false,
      getFileCreationTime: () => 0,
      readFile: async () => {
        throw permissionError
      },
      writeFile: async () => {},
      mkdir: async () => {},
      readdir: async () => [],
      chmod: async () => {},
      rename: async () => {},
    }
    await expect(
      loadAgentInstructions('/project', fileSystem, 'claude-code-web')
    ).rejects.toThrow('Permission denied')
  })

  test('returns empty string when file not found with ENOENT after exists check', async () => {
    // Race condition case: file exists when checked but not when read
    const enoentError = new Error('File not found') as NodeJS.ErrnoException
    enoentError.code = 'ENOENT'
    const fileSystem: FileSystem = {
      exists: () => true,
      isDirectory: () => false,
      getFileCreationTime: () => 0,
      readFile: async () => {
        throw enoentError
      },
      writeFile: async () => {},
      mkdir: async () => {},
      readdir: async () => [],
      chmod: async () => {},
      rename: async () => {},
    }
    const result = await loadAgentInstructions(
      '/project',
      fileSystem,
      'claude-code-web'
    )
    expect(result).toBe('')
  })
})

describe('templateVariablesWithInstructions', () => {
  const defaultSettings: DustSettings = { dustCommand: 'dust' }

  const createFileSystem = (files: Record<string, string>): FileSystem => ({
    exists: (path: string) => path in files,
    isDirectory: () => false,
    getFileCreationTime: () => 0,
    readFile: async (path: string) => {
      if (path in files) return files[path]
      throw new Error('File not found')
    },
    writeFile: async () => {},
    mkdir: async () => {},
    readdir: async () => [],
    chmod: async () => {},
    rename: async () => {},
  })

  test('includes agentInstructions when file exists', async () => {
    const fileSystem = createFileSystem({
      '/project/.dust/config/agents/claude-code-web.md':
        'Web-specific instructions',
    })
    const vars = await templateVariablesWithInstructions(
      '/project',
      fileSystem,
      defaultSettings,
      false,
      { CLAUDECODE: '1', CLAUDE_CODE_REMOTE: 'true' }
    )
    expect(vars.agentInstructions).toBe('Web-specific instructions')
  })

  test('agentInstructions is empty string when no file exists', async () => {
    const fileSystem = createFileSystem({})
    const vars = await templateVariablesWithInstructions(
      '/project',
      fileSystem,
      defaultSettings,
      false,
      { CLAUDECODE: '1' }
    )
    expect(vars.agentInstructions).toBe('')
  })

  test('includes all other template variables', async () => {
    const fileSystem = createFileSystem({})
    const vars = await templateVariablesWithInstructions(
      '/project',
      fileSystem,
      defaultSettings,
      true,
      { CLAUDECODE: '1', CLAUDE_CODE_REMOTE: 'true' }
    )
    expect(vars.bin).toBe('dust')
    expect(vars.agentName).toBe('Claude Code Web')
    expect(vars.hooksInstalled).toBe(true)
    expect(vars.isClaudeCodeWeb).toBe(true)
  })

  test('hasIdeaFile is false when set to false', async () => {
    const fileSystem = createFileSystem({})
    const vars = await templateVariablesWithInstructions(
      '/project',
      fileSystem,
      defaultSettings,
      false,
      {},
      { hasIdeaFile: false }
    )
    expect(vars.hasIdeaFile).toBe(false)
  })
})

describe('manageGitHooks', () => {
  const hookContent =
    '#!/bin/sh\n\n# BEGIN DUST HOOK\ndust pre push\nif [ $? -ne 0 ]; then\n  echo "dust pre-push check failed"\n  exit 1\nfi\n# END DUST HOOK\n'

  function createTestDependencies(
    files: Record<string, string>,
    settings: DustSettings = { dustCommand: 'dust' }
  ): CommandDependencies {
    const written: Record<string, string> = {}
    const fileSystem: FileSystem = {
      exists: (path: string) => path in files,
      isDirectory: () => false,
      getFileCreationTime: () => 0,
      readFile: async (path: string) => {
        if (path in written) return written[path]
        if (path in files) return files[path]
        const error = new Error('ENOENT') as NodeJS.ErrnoException
        error.code = 'ENOENT'
        throw error
      },
      writeFile: async (path: string, content: string) => {
        written[path] = content
      },
      mkdir: async () => {},
      readdir: async () => [],
      chmod: async () => {},
      rename: async () => {},
    }
    return {
      arguments: [],
      context: {
        cwd: '/project',
        stdout: () => {},
        stderr: () => {},
      },
      fileSystem,
      globScanner: {
        async *scan() {
          yield* []
        },
      },
      settings,
    }
  }

  test('returns false when not a git repo', async () => {
    const dependencies = createTestDependencies({})
    expect(await manageGitHooks(dependencies)).toBe(false)
  })

  test('installs hooks when not already installed', async () => {
    const dependencies = createTestDependencies({ '/project/.git': '' })
    expect(await manageGitHooks(dependencies)).toBe(true)
  })

  test('returns true when hooks already installed', async () => {
    const dependencies = createTestDependencies({
      '/project/.git': '',
      '/project/.git/hooks/pre-push': hookContent,
    })
    expect(await manageGitHooks(dependencies)).toBe(true)
  })

  test('updates binary path when it differs from settings', async () => {
    const dependencies = createTestDependencies(
      {
        '/project/.git': '',
        '/project/.git/hooks/pre-push': hookContent,
      },
      { dustCommand: 'npx dust' }
    )
    expect(await manageGitHooks(dependencies)).toBe(true)
  })

  test('does not update binary path when it matches settings', async () => {
    const dependencies = createTestDependencies({
      '/project/.git': '',
      '/project/.git/hooks/pre-push': hookContent,
    })
    expect(await manageGitHooks(dependencies)).toBe(true)
  })
})
