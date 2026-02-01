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
    const result = loadTemplate('agent-implement-task', {
      bin: 'dust',
      hooksInstalled: 'true',
    })
    // When hooksInstalled is true, commit step is 5 (no check step)
    expect(result).toContain('5. Create a single atomic commit')
    expect(result).toContain('6. Push your commit')
  })

  test('{{#if variable}} hides block when variable is false', () => {
    const result = loadTemplate('agent-implement-task', {
      bin: 'dust',
      hooksInstalled: 'false',
    })
    // When hooksInstalled is false, commit step is 6 (after check step)
    expect(result).toContain('6. Create a single atomic commit')
    expect(result).toContain('7. Push your commit')
  })

  test('{{#unless variable}} shows block when variable is false', () => {
    const result = loadTemplate('agent-implement-task', {
      bin: 'dust',
      hooksInstalled: 'false',
    })
    // When hooksInstalled is false, should include the manual check reminder
    expect(result).toContain('5. Run `dust check` before committing')
  })
})

describe('todo list instruction', () => {
  test('agent-implement-task shows todo instruction when isClaudeCodeWeb is true', () => {
    const result = loadTemplate('agent-implement-task', {
      bin: 'dust',
      isClaudeCodeWeb: 'true',
    })
    expect(result).toContain('Use a todo list to track your progress')
  })

  test('agent-implement-task hides todo instruction when isClaudeCodeWeb is false', () => {
    const result = loadTemplate('agent-implement-task', {
      bin: 'dust',
      isClaudeCodeWeb: 'false',
    })
    expect(result).not.toContain('Use a todo list')
  })

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
