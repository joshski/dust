import { describe, expect, test } from 'vitest'
import { detectAgent } from './detection'

describe('detectAgent', () => {
  test('detects Claude Code Web when CLAUDECODE and CLAUDE_CODE_ENTRYPOINT=remote', () => {
    const env = { CLAUDECODE: '1', CLAUDE_CODE_ENTRYPOINT: 'remote' }
    expect(detectAgent(env)).toEqual({
      type: 'claude-code-web',
      name: 'Claude Code Web',
    })
  })

  test('detects Claude Code Web when CLAUDE_CODE_ENTRYPOINT=remote_mobile', () => {
    const env = { CLAUDECODE: '1', CLAUDE_CODE_ENTRYPOINT: 'remote_mobile' }
    expect(detectAgent(env)).toEqual({
      type: 'claude-code-web',
      name: 'Claude Code Web',
    })
  })

  test('detects Claude Code when CLAUDECODE is set without remote entrypoint', () => {
    const env = { CLAUDECODE: '1' }
    expect(detectAgent(env)).toEqual({
      type: 'claude-code',
      name: 'Claude Code',
    })
  })

  test('detects Claude Code when CLAUDECODE is set with non-remote entrypoint', () => {
    const env = { CLAUDECODE: '1', CLAUDE_CODE_ENTRYPOINT: 'local' }
    expect(detectAgent(env)).toEqual({
      type: 'claude-code',
      name: 'Claude Code',
    })
  })

  test('detects Codex when CODEX_HOME is set', () => {
    const env = { CODEX_HOME: '/home/user/.codex' }
    expect(detectAgent(env)).toEqual({ type: 'codex', name: 'Codex' })
  })

  test('falls back to unknown Agent when no environment variables are set', () => {
    const env = {}
    expect(detectAgent(env)).toEqual({ type: 'unknown', name: 'Agent' })
  })

  test('prioritizes Claude Code over Codex when both are set', () => {
    const env = { CLAUDECODE: '1', CODEX_HOME: '/home/user/.codex' }
    expect(detectAgent(env)).toEqual({
      type: 'claude-code',
      name: 'Claude Code',
    })
  })

  test('prioritizes Claude Code Web over Codex when all are set', () => {
    const env = {
      CLAUDECODE: '1',
      CLAUDE_CODE_ENTRYPOINT: 'remote',
      CODEX_HOME: '/home/user/.codex',
    }
    expect(detectAgent(env)).toEqual({
      type: 'claude-code-web',
      name: 'Claude Code Web',
    })
  })
})
