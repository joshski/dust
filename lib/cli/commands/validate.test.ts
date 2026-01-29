import { describe, expect, test } from 'vitest'
import {
  createContextEmulator,
  createFileSystemEmulator,
  type FileSystemEmulator,
} from '../test-utilities'
import type { CommandContext, CommandDependencies } from '../types'
import {
  validate,
  validateFilename,
  validateLinks,
  validateSemanticLinks,
  validateTaskHeadings,
} from './validate'

function createDependencies(
  context: CommandContext,
  fileSystem: FileSystemEmulator
): CommandDependencies {
  return {
    arguments: [],
    context,
    fileSystem,
    globScanner: fileSystem,
    settings: { dustCommand: 'dust' },
  }
}

describe('validateFilename', () => {
  test('accepts valid slug names', () => {
    expect(validateFilename('my-task.md')).toBeNull()
    expect(validateFilename('task.md')).toBeNull()
    expect(validateFilename('task-v2.md')).toBeNull()
    expect(validateFilename('/path/to/my-task.md')).toBeNull()
  })

  test('rejects invalid names', () => {
    expect(validateFilename('MyTask.md')).not.toBeNull()
    expect(validateFilename('my_task.md')).not.toBeNull()
    expect(validateFilename('-task.md')).not.toBeNull()
    expect(validateFilename('task-.md')).not.toBeNull()
  })
})

describe('validateTaskHeadings', () => {
  test('returns no violations for valid task', () => {
    const content = `# Task
## Goals
## Blocked by
## Definition of done`

    const violations = validateTaskHeadings('task.md', content)
    expect(violations).toHaveLength(0)
  })

  test('reports missing headings', () => {
    const content = `# Task
## Goals`

    const violations = validateTaskHeadings('task.md', content)
    expect(violations).toHaveLength(2)
  })
})

describe('validateLinks', () => {
  test('returns no violations for valid links', () => {
    const content = '[Goal](../goals/goal.md)'
    const fileSystem = createFileSystemEmulator({
      project: {
        '.dust': {
          goals: { 'goal.md': 'content' },
        },
      },
    })

    const violations = validateLinks(
      '/project/.dust/tasks/task.md',
      content,
      fileSystem
    )
    expect(violations).toHaveLength(0)
  })

  test('reports broken links', () => {
    const content = '[Missing](../goals/missing.md)'
    const fileSystem = createFileSystemEmulator()

    const violations = validateLinks(
      '/project/.dust/tasks/task.md',
      content,
      fileSystem
    )
    expect(violations).toHaveLength(1)
    expect(violations[0].message).toContain('Broken link')
  })

  test('skips external links', () => {
    const content = '[External](https://example.com)'
    const fileSystem = createFileSystemEmulator()

    const violations = validateLinks(
      '/project/.dust/tasks/task.md',
      content,
      fileSystem
    )
    expect(violations).toHaveLength(0)
  })

  test('skips anchor links', () => {
    const content = '[Section](#section)'
    const fileSystem = createFileSystemEmulator()

    const violations = validateLinks(
      '/project/.dust/tasks/task.md',
      content,
      fileSystem
    )
    expect(violations).toHaveLength(0)
  })

  test('includes line numbers', () => {
    const content = `Line 1
Line 2
[Missing](../goals/missing.md)`
    const fileSystem = createFileSystemEmulator()

    const violations = validateLinks(
      '/project/.dust/tasks/task.md',
      content,
      fileSystem
    )
    expect(violations[0].line).toBe(3)
  })
})

describe('validateSemanticLinks', () => {
  test('returns no violations when Goals link points to goals directory', () => {
    const content = `# Task
## Goals
[Goal](../goals/my-goal.md)
## Blocked by
## Definition of done`

    const violations = validateSemanticLinks(
      '/project/.dust/tasks/task.md',
      content
    )
    expect(violations).toHaveLength(0)
  })

  test('returns violation when Goals link points to tasks directory', () => {
    const content = `# Task
## Goals
[Task](../tasks/other-task.md)
## Blocked by
## Definition of done`

    const violations = validateSemanticLinks(
      '/project/.dust/tasks/task.md',
      content
    )
    expect(violations).toHaveLength(1)
    expect(violations[0].message).toContain('## Goals')
    expect(violations[0].message).toContain('goal file')
    expect(violations[0].line).toBe(3)
  })

  test('returns no violations when Blocked by link points to tasks directory', () => {
    const content = `# Task
## Goals
## Blocked by
[Blocker](../tasks/blocker-task.md)
## Definition of done`

    const violations = validateSemanticLinks(
      '/project/.dust/tasks/task.md',
      content
    )
    expect(violations).toHaveLength(0)
  })

  test('returns violation when Blocked by link points to goals directory', () => {
    const content = `# Task
## Goals
## Blocked by
[Goal](../goals/my-goal.md)
## Definition of done`

    const violations = validateSemanticLinks(
      '/project/.dust/tasks/task.md',
      content
    )
    expect(violations).toHaveLength(1)
    expect(violations[0].message).toContain('## Blocked by')
    expect(violations[0].message).toContain('task file')
    expect(violations[0].line).toBe(4)
  })

  test('rejects external links in semantic sections', () => {
    const content = `# Task
## Goals
[External](https://example.com)
## Blocked by
## Definition of done`

    const violations = validateSemanticLinks(
      '/project/.dust/tasks/task.md',
      content
    )
    expect(violations).toHaveLength(1)
    expect(violations[0].message).toContain('## Goals')
    expect(violations[0].message).toContain('external URL')
    expect(violations[0].line).toBe(3)
  })

  test('rejects anchor links in semantic sections', () => {
    const content = `# Task
## Goals
[Section](#section)
## Blocked by
## Definition of done`

    const violations = validateSemanticLinks(
      '/project/.dust/tasks/task.md',
      content
    )
    expect(violations).toHaveLength(1)
    expect(violations[0].message).toContain('## Goals')
    expect(violations[0].message).toContain('anchor')
    expect(violations[0].line).toBe(3)
  })

  test('ignores links in other sections', () => {
    const content = `# Task
## Goals
## Blocked by
## Definition of done
[Any Link](../random/file.md)`

    const violations = validateSemanticLinks(
      '/project/.dust/tasks/task.md',
      content
    )
    expect(violations).toHaveLength(0)
  })

  test('handles multiple links in same section', () => {
    const content = `# Task
## Goals
[Goal1](../goals/goal1.md)
[Goal2](../tasks/wrong.md)
[Goal3](../goals/goal3.md)
## Blocked by
## Definition of done`

    const violations = validateSemanticLinks(
      '/project/.dust/tasks/task.md',
      content
    )
    expect(violations).toHaveLength(1)
    expect(violations[0].line).toBe(4)
  })
})

describe('validate command', () => {
  test('fails if .dust not found', async () => {
    const context = createContextEmulator()
    const fileSystem = createFileSystemEmulator()

    const result = await validate(createDependencies(context, fileSystem))

    expect(result.exitCode).toBe(1)
    expect(context.stderrLines.join('\n')).toContain(
      '.dust directory not found'
    )
  })

  test('passes with valid files', async () => {
    const context = createContextEmulator()
    const fileSystem = createFileSystemEmulator({
      project: {
        '.dust': {
          goals: { 'goal.md': '# Goal\nDescription' },
          tasks: {
            'my-task.md': `# Task
## Goals
[Goal](../goals/goal.md)
## Blocked by
## Definition of done`,
          },
        },
      },
    })

    const result = await validate(createDependencies(context, fileSystem))

    expect(result.exitCode).toBe(0)
    expect(context.stdoutLines.join('\n')).toContain('All validations passed')
  })

  test('reports violations', async () => {
    const context = createContextEmulator()
    const fileSystem = createFileSystemEmulator({
      project: {
        '.dust': {
          tasks: { 'my-task.md': '# Task with no headings' },
        },
      },
    })

    const result = await validate(createDependencies(context, fileSystem))

    expect(result.exitCode).toBe(1)
    expect(context.stderrLines.join('\n')).toContain('violation')
  })

  test('reports filename violations for invalid task filenames', async () => {
    const context = createContextEmulator()
    const fileSystem = createFileSystemEmulator({
      project: {
        '.dust': {
          tasks: {
            'BadFileName.md': `# Task
## Goals
## Blocked by
## Definition of done`,
          },
        },
      },
    })

    const result = await validate(createDependencies(context, fileSystem))

    expect(result.exitCode).toBe(1)
    expect(context.stderrLines.join('\n')).toContain(
      'does not match slug-style'
    )
  })

  test('skips non-markdown files in glob results', async () => {
    const context = createContextEmulator()
    // Include non-.md files in the file system - they should be skipped during validation
    const fileSystem = createFileSystemEmulator({
      project: {
        '.dust': {
          goals: { 'goal.md': '# Goal' },
          tasks: {
            'my-task.md': `# Task
## Goals
## Blocked by
## Definition of done`,
            README: '',
          },
          'some-file.txt': '',
          '.gitkeep': '',
        },
      },
    })

    const result = await validate(createDependencies(context, fileSystem))

    expect(result.exitCode).toBe(0)
    expect(context.stdoutLines.join('\n')).toContain('All validations passed')
  })

  test('displays violations with line numbers correctly', async () => {
    const context = createContextEmulator()
    const fileSystem = createFileSystemEmulator({
      project: {
        '.dust': {
          tasks: {
            'my-task.md': `# Task
## Goals
[Broken](../missing.md)
## Blocked by
## Definition of done`,
          },
        },
      },
    })

    await validate(createDependencies(context, fileSystem))

    // Broken link violations include line numbers
    const output = context.stderrLines.join('\n')
    expect(output).toContain(':3')
    expect(output).toContain('Broken link')
  })

  test('displays violations without line numbers correctly', async () => {
    const context = createContextEmulator()
    const fileSystem = createFileSystemEmulator({
      project: {
        '.dust': {
          tasks: {
            'BadName.md': `# Task
## Goals
## Blocked by
## Definition of done`,
          },
        },
      },
    })

    await validate(createDependencies(context, fileSystem))

    // Filename violations don't have line numbers
    const output = context.stderrLines.join('\n')
    expect(output).toContain('BadName.md')
    expect(output).toContain('does not match slug-style')
    // Should not have a colon before the message (no line number)
    expect(output).toMatch(/BadName\.md\n/)
  })

  test('skips task validation when tasks directory does not exist', async () => {
    const context = createContextEmulator()
    // Only goals directory, no tasks directory
    const fileSystem = createFileSystemEmulator({
      project: {
        '.dust': {
          goals: { 'goal.md': '# Goal' },
        },
      },
    })

    const result = await validate(createDependencies(context, fileSystem))

    expect(result.exitCode).toBe(0)
    expect(context.stdoutLines.join('\n')).toContain('All validations passed')
    // Should not mention task validation
    expect(context.stdoutLines.join('\n')).not.toContain('tasks')
  })

  test('reports semantic link violations for wrong link type in Goals section', async () => {
    const context = createContextEmulator()
    const fileSystem = createFileSystemEmulator({
      project: {
        '.dust': {
          goals: { 'goal.md': '# Goal' },
          tasks: {
            'other-task.md': '# Other',
            'my-task.md': `# Task
## Goals
[Wrong](../tasks/other-task.md)
## Blocked by
## Definition of done`,
          },
        },
      },
    })

    const result = await validate(createDependencies(context, fileSystem))

    expect(result.exitCode).toBe(1)
    const output = context.stderrLines.join('\n')
    expect(output).toContain('## Goals')
    expect(output).toContain('goal file')
  })

  test('reports semantic link violations for wrong link type in Blocked by section', async () => {
    const context = createContextEmulator()
    const fileSystem = createFileSystemEmulator({
      project: {
        '.dust': {
          goals: { 'goal.md': '# Goal' },
          tasks: {
            'my-task.md': `# Task
## Goals
## Blocked by
[Wrong](../goals/goal.md)
## Definition of done`,
          },
        },
      },
    })

    const result = await validate(createDependencies(context, fileSystem))

    expect(result.exitCode).toBe(1)
    const output = context.stderrLines.join('\n')
    expect(output).toContain('## Blocked by')
    expect(output).toContain('task file')
  })
})
