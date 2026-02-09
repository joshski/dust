import { describe, expect, test } from 'vitest'
import type { DustSettings, FileSystem } from '../types'
import {
  loadAgentInstructions,
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
      CLAUDE_CODE_ENTRYPOINT: 'remote',
    })
    expect(vars.agentName).toBe('Claude Code Web')
  })

  test('includes detected agent name for Codex', () => {
    const vars = templateVariables(defaultSettings, false, {
      CODEX_HOME: '/home/user/.codex',
    })
    expect(vars.agentName).toBe('Codex')
  })

  test('isClaudeCodeWeb is "true" when agent is Claude Code Web', () => {
    const vars = templateVariables(defaultSettings, false, {
      CLAUDECODE: '1',
      CLAUDE_CODE_ENTRYPOINT: 'remote',
    })
    expect(vars.isClaudeCodeWeb).toBe('true')
  })

  test('isClaudeCodeWeb is empty string when agent is Claude Code', () => {
    const vars = templateVariables(defaultSettings, false, { CLAUDECODE: '1' })
    expect(vars.isClaudeCodeWeb).toBe('')
  })

  test('isClaudeCodeWeb is empty string when agent is Codex', () => {
    const vars = templateVariables(defaultSettings, false, {
      CODEX_HOME: '/home/user/.codex',
    })
    expect(vars.isClaudeCodeWeb).toBe('')
  })

  test('isClaudeCodeWeb is empty string when agent is generic Agent', () => {
    const vars = templateVariables(defaultSettings, false, {})
    expect(vars.isClaudeCodeWeb).toBe('')
  })

  test('hooksInstalled is "true" when hooks are installed', () => {
    const vars = templateVariables(defaultSettings, true, {})
    expect(vars.hooksInstalled).toBe('true')
  })

  test('hooksInstalled is "false" when hooks are not installed', () => {
    const vars = templateVariables(defaultSettings, false, {})
    expect(vars.hooksInstalled).toBe('false')
  })
})

describe('loadAgentInstructions', () => {
  const createFileSystem = (files: Record<string, string>): FileSystem => ({
    exists: (path: string) => path in files,
    readFile: async (path: string) => {
      if (path in files) return files[path]
      throw new Error('File not found')
    },
    writeFile: async () => {},
    unlink: async () => {},
    mkdir: async () => {},
    readdir: async () => [],
    chmod: async () => {},
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

  test('returns empty string on read error', async () => {
    const fileSystem: FileSystem = {
      exists: () => true,
      readFile: async () => {
        throw new Error('Permission denied')
      },
      writeFile: async () => {},
      unlink: async () => {},
      mkdir: async () => {},
      readdir: async () => [],
      chmod: async () => {},
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
    readFile: async (path: string) => {
      if (path in files) return files[path]
      throw new Error('File not found')
    },
    writeFile: async () => {},
    unlink: async () => {},
    mkdir: async () => {},
    readdir: async () => [],
    chmod: async () => {},
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
      { CLAUDECODE: '1', CLAUDE_CODE_ENTRYPOINT: 'remote' }
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
      { CLAUDECODE: '1', CLAUDE_CODE_ENTRYPOINT: 'remote' }
    )
    expect(vars.bin).toBe('dust')
    expect(vars.agentName).toBe('Claude Code Web')
    expect(vars.hooksInstalled).toBe('true')
    expect(vars.isClaudeCodeWeb).toBe('true')
  })
})
