import { describe, expect, test } from 'vitest'
import type { CommandContext, FileSystem } from '../types'
import {
  type GlobScanner,
  validate,
  validateFilename,
  validateLinks,
  validateSemanticLinks,
  validateTaskHeadings,
} from './validate'

function createMockContext(): CommandContext & {
  stdoutLines: string[]
  stderrLines: string[]
} {
  const stdoutLines: string[] = []
  const stderrLines: string[] = []
  return {
    cwd: '/project',
    stdout: (msg: string) => stdoutLines.push(msg),
    stderr: (msg: string) => stderrLines.push(msg),
    stdoutLines,
    stderrLines,
  }
}

function createMockFs(files: Map<string, string> = new Map()): FileSystem {
  const paths = new Set(files.keys())
  // Also add directory paths
  for (const path of files.keys()) {
    let dir = path
    while (dir.includes('/')) {
      dir = dir.substring(0, dir.lastIndexOf('/'))
      if (dir) paths.add(dir)
    }
  }

  return {
    exists: (path: string) => paths.has(path),
    readFile: async (path: string) => files.get(path) || '',
    writeFile: async () => {},
    mkdir: async () => {},
    readdir: async () => [],
  }
}

function createMockGlob(files: string[]): GlobScanner {
  return {
    scan: async function* (dir: string) {
      for (const file of files) {
        if (file.startsWith(`${dir}/`)) {
          yield file.slice(dir.length + 1)
        }
      }
    },
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
    const fs = createMockFs(
      new Map([['/project/.dust/goals/goal.md', 'content']])
    )

    const violations = validateLinks(
      '/project/.dust/tasks/task.md',
      content,
      fs
    )
    expect(violations).toHaveLength(0)
  })

  test('reports broken links', () => {
    const content = '[Missing](../goals/missing.md)'
    const fs = createMockFs()

    const violations = validateLinks(
      '/project/.dust/tasks/task.md',
      content,
      fs
    )
    expect(violations).toHaveLength(1)
    expect(violations[0].message).toContain('Broken link')
  })

  test('skips external links', () => {
    const content = '[External](https://example.com)'
    const fs = createMockFs()

    const violations = validateLinks(
      '/project/.dust/tasks/task.md',
      content,
      fs
    )
    expect(violations).toHaveLength(0)
  })

  test('skips anchor links', () => {
    const content = '[Section](#section)'
    const fs = createMockFs()

    const violations = validateLinks(
      '/project/.dust/tasks/task.md',
      content,
      fs
    )
    expect(violations).toHaveLength(0)
  })

  test('includes line numbers', () => {
    const content = `Line 1
Line 2
[Missing](../goals/missing.md)`
    const fs = createMockFs()

    const violations = validateLinks(
      '/project/.dust/tasks/task.md',
      content,
      fs
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
    const ctx = createMockContext()
    const fs = createMockFs()
    const glob = createMockGlob([])

    const result = await validate(ctx, fs, [], glob)

    expect(result.exitCode).toBe(1)
    expect(ctx.stderrLines.join('\n')).toContain('.dust directory not found')
  })

  test('passes with valid files', async () => {
    const ctx = createMockContext()
    const fs = createMockFs(
      new Map([
        ['/project/.dust/goals/goal.md', '# Goal\nDescription'],
        [
          '/project/.dust/tasks/my-task.md',
          `# Task
## Goals
[Goal](../goals/goal.md)
## Blocked by
## Definition of done`,
        ],
      ])
    )
    const glob = createMockGlob([
      '/project/.dust/goals/goal.md',
      '/project/.dust/tasks/my-task.md',
    ])

    const result = await validate(ctx, fs, [], glob)

    expect(result.exitCode).toBe(0)
    expect(ctx.stdoutLines.join('\n')).toContain('All validations passed')
  })

  test('reports violations', async () => {
    const ctx = createMockContext()
    const fs = createMockFs(
      new Map([['/project/.dust/tasks/my-task.md', '# Task with no headings']])
    )
    const glob = createMockGlob(['/project/.dust/tasks/my-task.md'])

    const result = await validate(ctx, fs, [], glob)

    expect(result.exitCode).toBe(1)
    expect(ctx.stderrLines.join('\n')).toContain('violation')
  })

  test('reports filename violations for invalid task filenames', async () => {
    const ctx = createMockContext()
    const fs = createMockFs(
      new Map([
        [
          '/project/.dust/tasks/BadFileName.md',
          `# Task
## Goals
## Blocked by
## Definition of done`,
        ],
      ])
    )
    const glob = createMockGlob(['/project/.dust/tasks/BadFileName.md'])

    const result = await validate(ctx, fs, [], glob)

    expect(result.exitCode).toBe(1)
    expect(ctx.stderrLines.join('\n')).toContain('does not match slug-style')
  })

  test('skips non-markdown files in glob results', async () => {
    const ctx = createMockContext()
    const fs = createMockFs(
      new Map([
        ['/project/.dust/goals/goal.md', '# Goal'],
        [
          '/project/.dust/tasks/my-task.md',
          `# Task
## Goals
## Blocked by
## Definition of done`,
        ],
      ])
    )
    // Include non-.md files in glob results
    const glob = createMockGlob([
      '/project/.dust/goals/goal.md',
      '/project/.dust/some-file.txt',
      '/project/.dust/.gitkeep',
      '/project/.dust/tasks/my-task.md',
      '/project/.dust/tasks/README',
    ])

    const result = await validate(ctx, fs, [], glob)

    expect(result.exitCode).toBe(0)
    expect(ctx.stdoutLines.join('\n')).toContain('All validations passed')
  })

  test('displays violations with line numbers correctly', async () => {
    const ctx = createMockContext()
    const fs = createMockFs(
      new Map([
        [
          '/project/.dust/tasks/my-task.md',
          `# Task
## Goals
[Broken](../missing.md)
## Blocked by
## Definition of done`,
        ],
      ])
    )
    const glob = createMockGlob(['/project/.dust/tasks/my-task.md'])

    await validate(ctx, fs, [], glob)

    // Broken link violations include line numbers
    const output = ctx.stderrLines.join('\n')
    expect(output).toContain(':3')
    expect(output).toContain('Broken link')
  })

  test('displays violations without line numbers correctly', async () => {
    const ctx = createMockContext()
    const fs = createMockFs(
      new Map([
        [
          '/project/.dust/tasks/BadName.md',
          `# Task
## Goals
## Blocked by
## Definition of done`,
        ],
      ])
    )
    const glob = createMockGlob(['/project/.dust/tasks/BadName.md'])

    await validate(ctx, fs, [], glob)

    // Filename violations don't have line numbers
    const output = ctx.stderrLines.join('\n')
    expect(output).toContain('BadName.md')
    expect(output).toContain('does not match slug-style')
    // Should not have a colon before the message (no line number)
    expect(output).toMatch(/BadName\.md\n/)
  })

  test('skips task validation when tasks directory does not exist', async () => {
    const ctx = createMockContext()
    // Only goals directory, no tasks directory
    const fs = createMockFs(
      new Map([['/project/.dust/goals/goal.md', '# Goal']])
    )
    const glob = createMockGlob(['/project/.dust/goals/goal.md'])

    const result = await validate(ctx, fs, [], glob)

    expect(result.exitCode).toBe(0)
    expect(ctx.stdoutLines.join('\n')).toContain('All validations passed')
    // Should not mention task validation
    expect(ctx.stdoutLines.join('\n')).not.toContain('tasks')
  })

  test('reports semantic link violations for wrong link type in Goals section', async () => {
    const ctx = createMockContext()
    const fs = createMockFs(
      new Map([
        ['/project/.dust/goals/goal.md', '# Goal'],
        ['/project/.dust/tasks/other-task.md', '# Other'],
        [
          '/project/.dust/tasks/my-task.md',
          `# Task
## Goals
[Wrong](../tasks/other-task.md)
## Blocked by
## Definition of done`,
        ],
      ])
    )
    const glob = createMockGlob([
      '/project/.dust/goals/goal.md',
      '/project/.dust/tasks/my-task.md',
      '/project/.dust/tasks/other-task.md',
    ])

    const result = await validate(ctx, fs, [], glob)

    expect(result.exitCode).toBe(1)
    const output = ctx.stderrLines.join('\n')
    expect(output).toContain('## Goals')
    expect(output).toContain('goal file')
  })

  test('reports semantic link violations for wrong link type in Blocked by section', async () => {
    const ctx = createMockContext()
    const fs = createMockFs(
      new Map([
        ['/project/.dust/goals/goal.md', '# Goal'],
        [
          '/project/.dust/tasks/my-task.md',
          `# Task
## Goals
## Blocked by
[Wrong](../goals/goal.md)
## Definition of done`,
        ],
      ])
    )
    const glob = createMockGlob([
      '/project/.dust/goals/goal.md',
      '/project/.dust/tasks/my-task.md',
    ])

    const result = await validate(ctx, fs, [], glob)

    expect(result.exitCode).toBe(1)
    const output = ctx.stderrLines.join('\n')
    expect(output).toContain('## Blocked by')
    expect(output).toContain('task file')
  })
})
