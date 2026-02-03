import { describe, expect, test } from 'vitest'
import { formatToolUse } from './tool-formatters'

describe('formatToolUse', () => {
  describe('Write formatter', () => {
    test('formats file path and content', () => {
      const lines = formatToolUse('Write', {
        file_path: '/path/to/file.txt',
        content: 'Hello World',
      })

      expect(lines[0]).toBe('🔧 Write: /path/to/file.txt')
      expect(lines[1]).toContain('────')
      expect(lines[2]).toBe('   Hello World')
      expect(lines[3]).toContain('────')
    })

    test('handles multiline content', () => {
      const lines = formatToolUse('Write', {
        file_path: '/path/to/file.txt',
        content: 'Line 1\nLine 2\nLine 3',
      })

      expect(lines).toContain('   Line 1')
      expect(lines).toContain('   Line 2')
      expect(lines).toContain('   Line 3')
    })

    test('shows unrecognized arguments', () => {
      const lines = formatToolUse('Write', {
        file_path: '/path/to/file.txt',
        content: 'Hello',
        unknown_arg: 'value',
      })

      expect(lines.join('\n')).toContain('(Other arguments:')
      expect(lines.join('\n')).toContain('unknown_arg')
    })

    test('handles missing content', () => {
      const lines = formatToolUse('Write', {
        file_path: '/path/to/file.txt',
      })

      expect(lines[0]).toBe('🔧 Write: /path/to/file.txt')
      expect(lines[1]).toContain('────')
      expect(lines[2]).toContain('────')
    })

    test('handles missing file_path', () => {
      const lines = formatToolUse('Write', {
        content: 'test',
      })

      expect(lines[0]).toBe('🔧 Write: (unknown)')
    })
  })

  describe('Edit formatter', () => {
    test('formats file path, old_string, and new_string', () => {
      const lines = formatToolUse('Edit', {
        file_path: '/path/to/file.ts',
        old_string: 'const x = 1',
        new_string: 'const x = 2',
      })

      expect(lines[0]).toBe('🔧 Edit: /path/to/file.ts')
      expect(lines).toContain('   Replace:')
      expect(lines).toContain('   const x = 1')
      expect(lines).toContain('   With:')
      expect(lines).toContain('   const x = 2')
    })

    test('handles multiline replacements', () => {
      const lines = formatToolUse('Edit', {
        file_path: '/path/to/file.ts',
        old_string: 'line1\nline2',
        new_string: 'new1\nnew2\nnew3',
      })

      expect(lines).toContain('   line1')
      expect(lines).toContain('   line2')
      expect(lines).toContain('   new1')
      expect(lines).toContain('   new2')
      expect(lines).toContain('   new3')
    })

    test('ignores replace_all in unrecognized args', () => {
      const lines = formatToolUse('Edit', {
        file_path: '/path/to/file.ts',
        old_string: 'old',
        new_string: 'new',
        replace_all: true,
      })

      expect(lines.join('\n')).not.toContain('(Other arguments:')
    })

    test('handles missing file_path', () => {
      const lines = formatToolUse('Edit', {
        old_string: 'old',
        new_string: 'new',
      })

      expect(lines[0]).toBe('🔧 Edit: (unknown)')
    })

    test('handles missing old_string and new_string', () => {
      const lines = formatToolUse('Edit', {
        file_path: '/path/to/file.ts',
      })

      expect(lines[0]).toBe('🔧 Edit: /path/to/file.ts')
      expect(lines).toContain('   Replace:')
      expect(lines).toContain('   With:')
      // Should have dividers but no content between them
      const dividerCount = lines.filter(l => l.includes('────')).length
      expect(dividerCount).toBe(4)
    })
  })

  describe('Read formatter', () => {
    test('formats file path only', () => {
      const lines = formatToolUse('Read', {
        file_path: '/path/to/file.ts',
      })

      expect(lines).toEqual(['🔧 Read: /path/to/file.ts'])
    })

    test('shows line range with offset and limit', () => {
      const lines = formatToolUse('Read', {
        file_path: '/path/to/file.ts',
        offset: 10,
        limit: 50,
      })

      expect(lines[0]).toBe('🔧 Read: /path/to/file.ts (lines 10-59)')
    })

    test('shows from line with offset only', () => {
      const lines = formatToolUse('Read', {
        file_path: '/path/to/file.ts',
        offset: 100,
      })

      expect(lines[0]).toBe('🔧 Read: /path/to/file.ts (from line 100)')
    })

    test('shows line range with limit only (starting from 1)', () => {
      const lines = formatToolUse('Read', {
        file_path: '/path/to/file.ts',
        limit: 20,
      })

      expect(lines[0]).toBe('🔧 Read: /path/to/file.ts (lines 1-20)')
    })

    test('handles missing file_path', () => {
      const lines = formatToolUse('Read', {})

      expect(lines[0]).toBe('🔧 Read: (unknown)')
    })
  })

  describe('Bash formatter', () => {
    test('formats with description', () => {
      const lines = formatToolUse('Bash', {
        command: 'ls -la',
        description: 'List files',
      })

      expect(lines[0]).toBe('🔧 Bash: List files')
      expect(lines[1]).toBe('   $ ls -la')
    })

    test('uses default header without description', () => {
      const lines = formatToolUse('Bash', {
        command: 'git status',
      })

      expect(lines[0]).toBe('🔧 Bash: Run command')
      expect(lines[1]).toBe('   $ git status')
    })

    test('handles missing command', () => {
      const lines = formatToolUse('Bash', {
        description: 'Some operation',
      })

      expect(lines).toEqual(['🔧 Bash: Some operation'])
    })

    test('ignores known optional parameters', () => {
      const lines = formatToolUse('Bash', {
        command: 'npm test',
        description: 'Run tests',
        timeout: 60000,
        run_in_background: false,
      })

      expect(lines.join('\n')).not.toContain('(Other arguments:')
    })
  })

  describe('TodoWrite formatter', () => {
    test('formats todo list with items', () => {
      const lines = formatToolUse('TodoWrite', {
        todos: [
          {
            content: 'First task',
            status: 'pending',
            activeForm: 'Doing first',
          },
          {
            content: 'Second task',
            status: 'completed',
            activeForm: 'Doing second',
          },
          {
            content: 'Third task',
            status: 'in_progress',
            activeForm: 'Doing third',
          },
        ],
      })

      expect(lines[0]).toBe('🔧 TodoWrite: 3 items')
      expect(lines[1]).toBe('   ☐ First task')
      expect(lines[2]).toBe('   ☑ Second task')
      expect(lines[3]).toBe('   ☐ Third task')
    })

    test('shows singular item count', () => {
      const lines = formatToolUse('TodoWrite', {
        todos: [
          { content: 'Only task', status: 'pending', activeForm: 'Doing' },
        ],
      })

      expect(lines[0]).toBe('🔧 TodoWrite: 1 item')
    })

    test('handles empty todos', () => {
      const lines = formatToolUse('TodoWrite', {
        todos: [],
      })

      expect(lines[0]).toBe('🔧 TodoWrite: 0 items')
    })

    test('handles undefined todos', () => {
      const lines = formatToolUse('TodoWrite', {})

      expect(lines[0]).toBe('🔧 TodoWrite: 0 items')
      expect(lines.length).toBe(1)
    })
  })

  describe('Grep formatter', () => {
    test('formats pattern and path', () => {
      const lines = formatToolUse('Grep', {
        pattern: 'TODO',
        path: '/src',
      })

      expect(lines[0]).toBe('🔧 Grep: "TODO" in /src')
    })

    test('uses current directory as default', () => {
      const lines = formatToolUse('Grep', {
        pattern: 'error',
      })

      expect(lines[0]).toBe('🔧 Grep: "error" in .')
    })

    test('shows glob filter', () => {
      const lines = formatToolUse('Grep', {
        pattern: 'import',
        glob: '*.ts',
      })

      expect(lines[0]).toBe('🔧 Grep: "import" in . (*.ts)')
    })

    test('shows type filter', () => {
      const lines = formatToolUse('Grep', {
        pattern: 'class',
        type: 'ts',
      })

      expect(lines[0]).toBe('🔧 Grep: "class" in . (type: ts)')
    })

    test('shows path without filter', () => {
      const lines = formatToolUse('Grep', {
        pattern: 'test',
        path: '/custom/path',
      })

      expect(lines[0]).toBe('🔧 Grep: "test" in /custom/path')
    })

    test('ignores known optional parameters', () => {
      const lines = formatToolUse('Grep', {
        pattern: 'test',
        output_mode: 'content',
        context: 3,
        '-i': true,
      })

      expect(lines.join('\n')).not.toContain('(Other arguments:')
    })

    test('handles missing pattern', () => {
      const lines = formatToolUse('Grep', {
        path: '/src',
      })

      expect(lines[0]).toBe('🔧 Grep: "" in /src')
    })
  })

  describe('Glob formatter', () => {
    test('formats pattern and path', () => {
      const lines = formatToolUse('Glob', {
        pattern: '**/*.ts',
        path: '/src',
      })

      expect(lines[0]).toBe('🔧 Glob: **/*.ts in /src')
    })

    test('uses current directory as default', () => {
      const lines = formatToolUse('Glob', {
        pattern: '*.json',
      })

      expect(lines[0]).toBe('🔧 Glob: *.json in .')
    })

    test('handles missing pattern', () => {
      const lines = formatToolUse('Glob', {
        path: '/custom',
      })

      expect(lines[0]).toBe('🔧 Glob:  in /custom')
    })
  })

  describe('Task formatter', () => {
    test('formats with description', () => {
      const lines = formatToolUse('Task', {
        description: 'Search codebase',
        subagent_type: 'Explore',
        prompt: 'Find all API endpoints',
      })

      expect(lines[0]).toBe('🔧 Task: Search codebase')
      expect(lines[1]).toBe('   "Find all API endpoints"')
    })

    test('uses subagent_type when no description', () => {
      const lines = formatToolUse('Task', {
        subagent_type: 'Explore',
        prompt: 'Explore the codebase',
      })

      expect(lines[0]).toBe('🔧 Task: Explore')
    })

    test('truncates long prompts', () => {
      const longPrompt = 'A'.repeat(150)
      const lines = formatToolUse('Task', {
        description: 'Long task',
        prompt: longPrompt,
      })

      expect(lines[1]).toContain('...')
      expect(lines[1].length).toBeLessThan(120)
    })

    test('ignores known optional parameters', () => {
      const lines = formatToolUse('Task', {
        description: 'Test',
        subagent_type: 'Explore',
        prompt: 'Test prompt',
        model: 'haiku',
        max_turns: 5,
        resume: 'agent-123',
        run_in_background: true,
      })

      expect(lines.join('\n')).not.toContain('(Other arguments:')
    })

    test('uses fallback header when no description or subagent_type', () => {
      const lines = formatToolUse('Task', {
        prompt: 'Do something',
      })

      expect(lines[0]).toBe('🔧 Task: task')
      expect(lines[1]).toBe('   "Do something"')
    })

    test('handles missing prompt', () => {
      const lines = formatToolUse('Task', {
        description: 'Test task',
      })

      expect(lines).toEqual(['🔧 Task: Test task'])
    })
  })

  describe('Fallback formatter', () => {
    test('formats unknown tools as JSON', () => {
      const lines = formatToolUse('UnknownTool', {
        foo: 'bar',
        baz: 123,
      })

      expect(lines[0]).toBe('🔧 Tool: UnknownTool')
      expect(lines[1]).toContain('Input:')
      expect(lines[1]).toContain('"foo"')
      expect(lines[1]).toContain('"bar"')
    })
  })
})
