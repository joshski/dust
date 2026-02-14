import { describe, expect, test } from 'vitest'
import { loadTemplate } from './templates'

describe('loadTemplate', () => {
  test('substitutes simple variables', () => {
    const result = loadTemplate('help', { bin: 'bin/dust' })
    expect(result).toContain('bin/dust')
  })

  test('leaves unmatched variables as placeholders', () => {
    const result = loadTemplate('help', {})
    // The help template uses {{bin}} not {{dustCommand}}
    expect(result).toContain('{{bin}}')
  })
})

describe('template conditionals', () => {
  test('{{#if variable}} shows block when variable is truthy', () => {
    const result = loadTemplate('agent-new-goal', {
      bin: 'dust',
      isClaudeCodeWeb: 'true',
    })
    expect(result).toContain('Use a todo list to track your progress')
  })

  test('{{#if variable}} hides block when variable is false', () => {
    const result = loadTemplate('agent-new-goal', {
      bin: 'dust',
      isClaudeCodeWeb: 'false',
    })
    expect(result).not.toContain('Use a todo list')
  })

  test('{{#unless variable}} shows block when variable is false', () => {
    const result = loadTemplate('agent-new-goal', {
      bin: 'dust',
      isClaudeCodeWeb: 'false',
    })
    expect(result).toContain('Follow these steps:')
  })
})

describe('todo list instruction', () => {
  test('agent-new-goal shows todo instruction when isClaudeCodeWeb is true', () => {
    const result = loadTemplate('agent-new-goal', {
      bin: 'dust',
      isClaudeCodeWeb: 'true',
    })
    expect(result).toContain('Use a todo list to track your progress')
  })

  test('agent-new-goal hides todo instruction when isClaudeCodeWeb is false', () => {
    const result = loadTemplate('agent-new-goal', {
      bin: 'dust',
      isClaudeCodeWeb: 'false',
    })
    expect(result).not.toContain('Use a todo list')
  })
})
