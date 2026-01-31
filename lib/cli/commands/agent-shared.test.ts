import { describe, expect, test } from 'vitest'
import type { DustSettings } from '../types'
import { detectAgent, templateVariables } from './agent-shared'

describe('detectAgent', () => {
  test('detects Claude Code Web when CLAUDECODE and CLAUDE_CODE_ENTRYPOINT=remote', () => {
    const env = { CLAUDECODE: '1', CLAUDE_CODE_ENTRYPOINT: 'remote' }
    expect(detectAgent(env)).toBe('Claude Code Web')
  })

  test('detects Claude Code when CLAUDECODE is set without remote entrypoint', () => {
    const env = { CLAUDECODE: '1' }
    expect(detectAgent(env)).toBe('Claude Code')
  })

  test('detects Claude Code when CLAUDECODE is set with non-remote entrypoint', () => {
    const env = { CLAUDECODE: '1', CLAUDE_CODE_ENTRYPOINT: 'local' }
    expect(detectAgent(env)).toBe('Claude Code')
  })

  test('detects Codex when CODEX_HOME is set', () => {
    const env = { CODEX_HOME: '/home/user/.codex' }
    expect(detectAgent(env)).toBe('Codex')
  })

  test('falls back to Agent when no environment variables are set', () => {
    const env = {}
    expect(detectAgent(env)).toBe('Agent')
  })

  test('prioritizes Claude Code over Codex when both are set', () => {
    const env = { CLAUDECODE: '1', CODEX_HOME: '/home/user/.codex' }
    expect(detectAgent(env)).toBe('Claude Code')
  })

  test('prioritizes Claude Code Web over Codex when all are set', () => {
    const env = {
      CLAUDECODE: '1',
      CLAUDE_CODE_ENTRYPOINT: 'remote',
      CODEX_HOME: '/home/user/.codex',
    }
    expect(detectAgent(env)).toBe('Claude Code Web')
  })
})

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
})
