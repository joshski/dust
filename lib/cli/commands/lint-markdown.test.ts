import { describe, expect, test } from 'vitest'
import {
  createContextEmulator,
  createFileSystemEmulator,
  type FileSystemEmulator,
} from '../../test/test-utilities'
import type { CommandContext, CommandDependencies } from '../types'
import {
  extractGoalRelationships,
  lintMarkdown,
  titleToFilename,
  validateBidirectionalLinks,
  validateFilename,
  validateGoalHierarchyLinks,
  validateGoalHierarchySections,
  validateLinks,
  validateNoCycles,
  validateOpeningSentence,
  validateSemanticLinks,
  validateTaskHeadings,
  validateTitleFilenameMatch,
} from './lint-markdown'

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

describe('titleToFilename', () => {
  test('converts simple titles to filenames', () => {
    expect(titleToFilename('Make Software Development Joyful')).toBe(
      'make-software-development-joyful.md'
    )
    expect(titleToFilename('Commit Log Observations')).toBe(
      'commit-log-observations.md'
    )
  })

  test('preserves existing hyphens', () => {
    expect(titleToFilename('Agent-Agnostic Design')).toBe(
      'agent-agnostic-design.md'
    )
  })

  test('removes special characters', () => {
    expect(titleToFilename('Title with `backticks`')).toBe(
      'title-with-backticks.md'
    )
    expect(titleToFilename("It's a title!")).toBe('its-a-title.md')
  })

  test('handles multiple spaces', () => {
    expect(titleToFilename('Multiple   Spaces')).toBe('multiple-spaces.md')
  })

  test('collapses multiple hyphens', () => {
    expect(titleToFilename('Title - With - Dashes')).toBe(
      'title-with-dashes.md'
    )
  })

  test('trims leading and trailing hyphens', () => {
    expect(titleToFilename('-Leading Title')).toBe('leading-title.md')
    expect(titleToFilename('Trailing Title-')).toBe('trailing-title.md')
  })

  test('handles numbers', () => {
    expect(titleToFilename('Task V2')).toBe('task-v2.md')
  })

  test('converts dots to hyphens', () => {
    expect(titleToFilename('AGENTS.md Instruction')).toBe(
      'agents-md-instruction.md'
    )
    expect(titleToFilename('File.Name.With.Dots')).toBe(
      'file-name-with-dots.md'
    )
  })
})

describe('validateTitleFilenameMatch', () => {
  test('returns null when title matches filename', () => {
    const content = '# Make Software Development Joyful\n\nDescription.'
    expect(
      validateTitleFilenameMatch(
        '/path/to/make-software-development-joyful.md',
        content
      )
    ).toBeNull()
  })

  test('returns violation when title does not match filename', () => {
    const content = '# Make Software Development Joyful\n\nDescription.'
    const violation = validateTitleFilenameMatch(
      '/path/to/wrong-filename.md',
      content
    )
    expect(violation).not.toBeNull()
    expect(violation?.message).toContain('wrong-filename.md')
    expect(violation?.message).toContain('Make Software Development Joyful')
    expect(violation?.message).toContain('make-software-development-joyful.md')
  })

  test('returns null when no title exists', () => {
    const content = 'No heading in this file.'
    expect(
      validateTitleFilenameMatch('/path/to/some-file.md', content)
    ).toBeNull()
  })

  test('handles hyphens in titles correctly', () => {
    const content = '# Agent-Agnostic Design\n\nDescription.'
    expect(
      validateTitleFilenameMatch('/path/to/agent-agnostic-design.md', content)
    ).toBeNull()
  })

  test('handles special characters in titles', () => {
    const content = '# Decouple `dust loop claude` from git\n\nDescription.'
    expect(
      validateTitleFilenameMatch(
        '/path/to/decouple-dust-loop-claude-from-git.md',
        content
      )
    ).toBeNull()
  })
})

describe('validateOpeningSentence', () => {
  test('returns null for valid opening sentence', () => {
    const content = '# Title\n\nThis is a valid opening sentence.'
    expect(validateOpeningSentence('file.md', content)).toBeNull()
  })

  test('returns violation when opening sentence is missing', () => {
    const content = '# Title\n\n## Another Heading'
    const violation = validateOpeningSentence('file.md', content)
    expect(violation).not.toBeNull()
    expect(violation?.message).toContain(
      'Missing or malformed opening sentence'
    )
  })

  test('returns violation when no content after H1', () => {
    const content = '# Title'
    const violation = validateOpeningSentence('file.md', content)
    expect(violation).not.toBeNull()
  })

  test('returns violation when first paragraph has no sentence ending', () => {
    const content = '# Title\n\nNo sentence ending here'
    const violation = validateOpeningSentence('file.md', content)
    expect(violation).not.toBeNull()
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

describe('lintMarkdown command', () => {
  test('fails if .dust not found', async () => {
    const context = createContextEmulator()
    const fileSystem = createFileSystemEmulator()

    const result = await lintMarkdown(createDependencies(context, fileSystem))

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
          goals: {
            'goal.md': `# Goal

This is a goal.

## Parent Goal

- (none)

## Sub-Goals

- (none)
`,
          },
          tasks: {
            'my-task.md': `# My Task

This is a task.

## Goals
[Goal](../goals/goal.md)
## Blocked by
## Definition of done`,
          },
        },
      },
    })

    const result = await lintMarkdown(createDependencies(context, fileSystem))

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

    const result = await lintMarkdown(createDependencies(context, fileSystem))

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

    const result = await lintMarkdown(createDependencies(context, fileSystem))

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
          goals: {
            'goal.md': `# Goal

This is a goal.

## Parent Goal

- (none)

## Sub-Goals

- (none)
`,
          },
          tasks: {
            'my-task.md': `# My Task

This is a task.

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

    const result = await lintMarkdown(createDependencies(context, fileSystem))

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

    await lintMarkdown(createDependencies(context, fileSystem))

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

    await lintMarkdown(createDependencies(context, fileSystem))

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
          goals: {
            'goal.md': `# Goal

This is a goal.

## Parent Goal

- (none)

## Sub-Goals

- (none)
`,
          },
        },
      },
    })

    const result = await lintMarkdown(createDependencies(context, fileSystem))

    expect(result.exitCode).toBe(0)
    expect(context.stdoutLines.join('\n')).toContain('All validations passed')
    // Should not mention task validation in .dust/tasks/
    expect(context.stdoutLines.join('\n')).not.toContain('.dust/tasks/')
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

    const result = await lintMarkdown(createDependencies(context, fileSystem))

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

    const result = await lintMarkdown(createDependencies(context, fileSystem))

    expect(result.exitCode).toBe(1)
    const output = context.stderrLines.join('\n')
    expect(output).toContain('## Blocked by')
    expect(output).toContain('task file')
  })
})

describe('validateGoalHierarchySections', () => {
  test('returns no violations for valid goal with both sections', () => {
    const content = `# Goal

This is a goal.

## Parent Goal

- (none)

## Sub-Goals

- (none)
`
    const violations = validateGoalHierarchySections('goal.md', content)
    expect(violations).toHaveLength(0)
  })

  test('reports missing Parent Goal section', () => {
    const content = `# Goal

This is a goal.

## Sub-Goals

- (none)
`
    const violations = validateGoalHierarchySections('goal.md', content)
    expect(violations).toHaveLength(1)
    expect(violations[0].message).toContain('## Parent Goal')
  })

  test('reports missing Sub-Goals section', () => {
    const content = `# Goal

This is a goal.

## Parent Goal

- (none)
`
    const violations = validateGoalHierarchySections('goal.md', content)
    expect(violations).toHaveLength(1)
    expect(violations[0].message).toContain('## Sub-Goals')
  })

  test('reports both missing sections', () => {
    const content = `# Goal

This is a goal.
`
    const violations = validateGoalHierarchySections('goal.md', content)
    expect(violations).toHaveLength(2)
  })
})

describe('validateGoalHierarchyLinks', () => {
  test('returns no violations for valid goal links', () => {
    const content = `# Goal

This is a goal.

## Parent Goal

- [Parent](parent-goal.md)

## Sub-Goals

- [Child](child-goal.md)
`
    const violations = validateGoalHierarchyLinks(
      '/project/.dust/goals/goal.md',
      content
    )
    expect(violations).toHaveLength(0)
  })

  test('returns violation for non-goal link in Parent Goal section', () => {
    const content = `# Goal

## Parent Goal

- [Task](../tasks/task.md)

## Sub-Goals

- (none)
`
    const violations = validateGoalHierarchyLinks(
      '/project/.dust/goals/goal.md',
      content
    )
    expect(violations).toHaveLength(1)
    expect(violations[0].message).toContain('## Parent Goal')
    expect(violations[0].message).toContain('goal file')
  })

  test('returns violation for non-goal link in Sub-Goals section', () => {
    const content = `# Goal

## Parent Goal

- (none)

## Sub-Goals

- [Idea](../ideas/idea.md)
`
    const violations = validateGoalHierarchyLinks(
      '/project/.dust/goals/goal.md',
      content
    )
    expect(violations).toHaveLength(1)
    expect(violations[0].message).toContain('## Sub-Goals')
    expect(violations[0].message).toContain('goal file')
  })

  test('rejects external links in hierarchy sections', () => {
    const content = `# Goal

## Parent Goal

- [External](https://example.com)

## Sub-Goals

- (none)
`
    const violations = validateGoalHierarchyLinks(
      '/project/.dust/goals/goal.md',
      content
    )
    expect(violations).toHaveLength(1)
    expect(violations[0].message).toContain('external URL')
  })

  test('rejects anchor links in hierarchy sections', () => {
    const content = `# Goal

## Parent Goal

- [Anchor](#section)

## Sub-Goals

- (none)
`
    const violations = validateGoalHierarchyLinks(
      '/project/.dust/goals/goal.md',
      content
    )
    expect(violations).toHaveLength(1)
    expect(violations[0].message).toContain('anchor')
  })

  test('includes line numbers in violations', () => {
    const content = `# Goal

## Parent Goal

- [Task](../tasks/task.md)

## Sub-Goals

- (none)
`
    const violations = validateGoalHierarchyLinks(
      '/project/.dust/goals/goal.md',
      content
    )
    expect(violations[0].line).toBe(5)
  })
})

describe('extractGoalRelationships', () => {
  test('extracts parent and sub-goal relationships', () => {
    const content = `# Goal

## Parent Goal

- [Parent](parent.md)

## Sub-Goals

- [Child1](child1.md)
- [Child2](child2.md)
`
    const rel = extractGoalRelationships(
      '/project/.dust/goals/goal.md',
      content
    )
    expect(rel.filePath).toBe('/project/.dust/goals/goal.md')
    expect(rel.parentGoals).toEqual(['/project/.dust/goals/parent.md'])
    expect(rel.subGoals).toEqual([
      '/project/.dust/goals/child1.md',
      '/project/.dust/goals/child2.md',
    ])
  })

  test('handles goals with no parents', () => {
    const content = `# Goal

## Parent Goal

- (none)

## Sub-Goals

- [Child](child.md)
`
    const rel = extractGoalRelationships(
      '/project/.dust/goals/goal.md',
      content
    )
    expect(rel.parentGoals).toEqual([])
    expect(rel.subGoals).toEqual(['/project/.dust/goals/child.md'])
  })

  test('handles goals with no sub-goals', () => {
    const content = `# Goal

## Parent Goal

- [Parent](parent.md)

## Sub-Goals

- (none)
`
    const rel = extractGoalRelationships(
      '/project/.dust/goals/goal.md',
      content
    )
    expect(rel.parentGoals).toEqual(['/project/.dust/goals/parent.md'])
    expect(rel.subGoals).toEqual([])
  })

  test('ignores non-goal links', () => {
    const content = `# Goal

## Parent Goal

- [Task](../tasks/task.md)

## Sub-Goals

- (none)
`
    const rel = extractGoalRelationships(
      '/project/.dust/goals/goal.md',
      content
    )
    expect(rel.parentGoals).toEqual([])
    expect(rel.subGoals).toEqual([])
  })

  test('ignores anchor links', () => {
    const content = `# Goal

## Parent Goal

- [Anchor](#section)

## Sub-Goals

- (none)
`
    const rel = extractGoalRelationships(
      '/project/.dust/goals/goal.md',
      content
    )
    expect(rel.parentGoals).toEqual([])
    expect(rel.subGoals).toEqual([])
  })

  test('ignores external links', () => {
    const content = `# Goal

## Parent Goal

- [External](https://example.com)

## Sub-Goals

- [HTTP](http://example.com)
`
    const rel = extractGoalRelationships(
      '/project/.dust/goals/goal.md',
      content
    )
    expect(rel.parentGoals).toEqual([])
    expect(rel.subGoals).toEqual([])
  })
})

describe('validateBidirectionalLinks', () => {
  test('returns no violations for consistent bidirectional links', () => {
    const relationships = [
      {
        filePath: '/project/.dust/goals/parent.md',
        parentGoals: [],
        subGoals: ['/project/.dust/goals/child.md'],
      },
      {
        filePath: '/project/.dust/goals/child.md',
        parentGoals: ['/project/.dust/goals/parent.md'],
        subGoals: [],
      },
    ]
    const violations = validateBidirectionalLinks(relationships)
    expect(violations).toHaveLength(0)
  })

  test('reports missing sub-goal link in parent', () => {
    const relationships = [
      {
        filePath: '/project/.dust/goals/parent.md',
        parentGoals: [],
        subGoals: [], // Parent doesn't list child as sub-goal
      },
      {
        filePath: '/project/.dust/goals/child.md',
        parentGoals: ['/project/.dust/goals/parent.md'],
        subGoals: [],
      },
    ]
    const violations = validateBidirectionalLinks(relationships)
    expect(violations).toHaveLength(1)
    expect(violations[0].file).toBe('/project/.dust/goals/child.md')
    expect(violations[0].message).toContain(
      'does not list this goal as a sub-goal'
    )
  })

  test('reports missing parent link in child', () => {
    const relationships = [
      {
        filePath: '/project/.dust/goals/parent.md',
        parentGoals: [],
        subGoals: ['/project/.dust/goals/child.md'],
      },
      {
        filePath: '/project/.dust/goals/child.md',
        parentGoals: [], // Child doesn't list parent
        subGoals: [],
      },
    ]
    const violations = validateBidirectionalLinks(relationships)
    expect(violations).toHaveLength(1)
    expect(violations[0].file).toBe('/project/.dust/goals/parent.md')
    expect(violations[0].message).toContain(
      'does not list this goal as its parent'
    )
  })

  test('handles complex hierarchy with multiple children', () => {
    const relationships = [
      {
        filePath: '/project/.dust/goals/root.md',
        parentGoals: [],
        subGoals: ['/project/.dust/goals/a.md', '/project/.dust/goals/b.md'],
      },
      {
        filePath: '/project/.dust/goals/a.md',
        parentGoals: ['/project/.dust/goals/root.md'],
        subGoals: [],
      },
      {
        filePath: '/project/.dust/goals/b.md',
        parentGoals: ['/project/.dust/goals/root.md'],
        subGoals: [],
      },
    ]
    const violations = validateBidirectionalLinks(relationships)
    expect(violations).toHaveLength(0)
  })
})

describe('validateNoCycles', () => {
  test('returns no violations for valid hierarchy', () => {
    const relationships = [
      {
        filePath: '/project/.dust/goals/root.md',
        parentGoals: [],
        subGoals: ['/project/.dust/goals/child.md'],
      },
      {
        filePath: '/project/.dust/goals/child.md',
        parentGoals: ['/project/.dust/goals/root.md'],
        subGoals: [],
      },
    ]
    const violations = validateNoCycles(relationships)
    expect(violations).toHaveLength(0)
  })

  test('detects simple cycle between two goals', () => {
    const relationships = [
      {
        filePath: '/project/.dust/goals/a.md',
        parentGoals: ['/project/.dust/goals/b.md'],
        subGoals: [],
      },
      {
        filePath: '/project/.dust/goals/b.md',
        parentGoals: ['/project/.dust/goals/a.md'],
        subGoals: [],
      },
    ]
    const violations = validateNoCycles(relationships)
    expect(violations.length).toBeGreaterThan(0)
    expect(violations[0].message).toContain('Cycle detected')
  })

  test('detects longer cycle', () => {
    const relationships = [
      {
        filePath: '/project/.dust/goals/a.md',
        parentGoals: ['/project/.dust/goals/c.md'],
        subGoals: [],
      },
      {
        filePath: '/project/.dust/goals/b.md',
        parentGoals: ['/project/.dust/goals/a.md'],
        subGoals: [],
      },
      {
        filePath: '/project/.dust/goals/c.md',
        parentGoals: ['/project/.dust/goals/b.md'],
        subGoals: [],
      },
    ]
    const violations = validateNoCycles(relationships)
    expect(violations.length).toBeGreaterThan(0)
    expect(violations[0].message).toContain('Cycle detected')
  })

  test('detects self-referential cycle', () => {
    const relationships = [
      {
        filePath: '/project/.dust/goals/a.md',
        parentGoals: ['/project/.dust/goals/a.md'],
        subGoals: [],
      },
    ]
    const violations = validateNoCycles(relationships)
    expect(violations.length).toBeGreaterThan(0)
    expect(violations[0].message).toContain('Cycle detected')
  })
})

describe('lintMarkdown goal hierarchy validation', () => {
  test('passes with valid goal hierarchy', async () => {
    const context = createContextEmulator()
    const fileSystem = createFileSystemEmulator({
      project: {
        '.dust': {
          goals: {
            'parent-goal.md': `# Parent Goal

This is the parent goal.

## Parent Goal

- (none)

## Sub-Goals

- [Child](child-goal.md)
`,
            'child-goal.md': `# Child Goal

This is the child goal.

## Parent Goal

- [Parent](parent-goal.md)

## Sub-Goals

- (none)
`,
          },
        },
      },
    })

    const result = await lintMarkdown(createDependencies(context, fileSystem))

    expect(result.exitCode).toBe(0)
    expect(context.stdoutLines.join('\n')).toContain('All validations passed')
  })

  test('reports missing hierarchy sections in goal files', async () => {
    const context = createContextEmulator()
    const fileSystem = createFileSystemEmulator({
      project: {
        '.dust': {
          goals: {
            'goal.md': `# Goal

This is a goal without hierarchy sections.
`,
          },
        },
      },
    })

    const result = await lintMarkdown(createDependencies(context, fileSystem))

    expect(result.exitCode).toBe(1)
    const output = context.stderrLines.join('\n')
    expect(output).toContain('## Parent Goal')
    expect(output).toContain('## Sub-Goals')
  })

  test('reports bidirectional link violations', async () => {
    const context = createContextEmulator()
    const fileSystem = createFileSystemEmulator({
      project: {
        '.dust': {
          goals: {
            'parent.md': `# Parent Goal

This is the parent goal.

## Parent Goal

- (none)

## Sub-Goals

- (none)
`,
            'child.md': `# Child Goal

This is the child goal.

## Parent Goal

- [Parent](parent.md)

## Sub-Goals

- (none)
`,
          },
        },
      },
    })

    const result = await lintMarkdown(createDependencies(context, fileSystem))

    expect(result.exitCode).toBe(1)
    const output = context.stderrLines.join('\n')
    expect(output).toContain('does not list this goal as a sub-goal')
  })

  test('reports cycle in goal hierarchy', async () => {
    const context = createContextEmulator()
    const fileSystem = createFileSystemEmulator({
      project: {
        '.dust': {
          goals: {
            'a.md': `# Goal A

This is goal A.

## Parent Goal

- [Goal B](b.md)

## Sub-Goals

- (none)
`,
            'b.md': `# Goal B

This is goal B.

## Parent Goal

- [Goal A](a.md)

## Sub-Goals

- (none)
`,
          },
        },
      },
    })

    const result = await lintMarkdown(createDependencies(context, fileSystem))

    expect(result.exitCode).toBe(1)
    const output = context.stderrLines.join('\n')
    expect(output).toContain('Cycle detected')
  })

  test('reports wrong link type in hierarchy sections', async () => {
    const context = createContextEmulator()
    const fileSystem = createFileSystemEmulator({
      project: {
        '.dust': {
          goals: {
            'goal.md': `# Goal

This is a goal.

## Parent Goal

- [Task](../tasks/task.md)

## Sub-Goals

- (none)
`,
          },
          tasks: {
            'task.md': '# Task',
          },
        },
      },
    })

    const result = await lintMarkdown(createDependencies(context, fileSystem))

    expect(result.exitCode).toBe(1)
    const output = context.stderrLines.join('\n')
    expect(output).toContain('## Parent Goal')
    expect(output).toContain('goal file')
  })

  test('skips non-markdown files in goals directory', async () => {
    const context = createContextEmulator()
    const fileSystem = createFileSystemEmulator({
      project: {
        '.dust': {
          goals: {
            'goal.md': `# Goal

This is a goal.

## Parent Goal

- (none)

## Sub-Goals

- (none)
`,
            README: '',
            '.gitkeep': '',
          },
        },
      },
    })

    const result = await lintMarkdown(createDependencies(context, fileSystem))

    expect(result.exitCode).toBe(0)
    expect(context.stdoutLines.join('\n')).toContain('All validations passed')
  })
})
