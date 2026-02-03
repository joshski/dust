import { describe, expect, test } from 'vitest'
import type { DustSettings } from '../types'
import { templateVariables } from './agent-shared'

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
