import { describe, expect, test } from 'vitest'
import {
  IDEA_TRANSITION_PREFIXES,
  titleToFilename,
} from '../../artifacts/workflow-tasks'
import {
  validateImperativeOpeningSentence,
  validateOpeningSentence,
  validateOpeningSentenceLength,
  validateTaskHeadings,
} from '../../lint/validators/content-validator'
import {
  validateContentDirectoryFiles,
  validateDirectoryStructure,
} from '../../lint/validators/directory-validator'
import {
  validateFilename,
  validateTitleFilenameMatch,
} from '../../lint/validators/filename-validator'
import {
  validateIdeaOpenQuestions,
  validateIdeaTransitionTitle,
  validateWorkflowTaskBodySection,
} from '../../lint/validators/idea-validator'
import {
  validateLinks,
  validatePrincipleHierarchyLinks,
  validateSemanticLinks,
} from '../../lint/validators/link-validator'
import {
  extractPrincipleRelationships,
  validateBidirectionalLinks,
  validateNoCycles,
  validatePrincipleHierarchySections,
} from '../../lint/validators/principle-hierarchy'
import {
  createContextEmulator,
  createFileSystemEmulator,
  type FileSystemEmulator,
} from '../../test/test-utilities'
import type { CommandContext, CommandDependencies } from '../types'
import { lintMarkdown } from './lint-markdown'

function createDependencies(
  context: CommandContext,
  fileSystem: FileSystemEmulator,
  settingsOverrides?: Partial<CommandDependencies['settings']>
): CommandDependencies {
  return {
    arguments: [],
    context,
    fileSystem,
    globScanner: fileSystem,
    settings: { dustCommand: 'dust', ...settingsOverrides },
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
    expect(titleToFilename('Enable Flow State')).toBe('enable-flow-state.md')
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
    const content = '# Enable Flow State\n\nDescription.'
    expect(
      validateTitleFilenameMatch('/path/to/enable-flow-state.md', content)
    ).toBeNull()
  })

  test('returns violation when title does not match filename', () => {
    const content = '# Enable Flow State\n\nDescription.'
    const violation = validateTitleFilenameMatch(
      '/path/to/wrong-filename.md',
      content
    )
    expect(violation).not.toBeNull()
    expect(violation?.message).toContain('wrong-filename.md')
    expect(violation?.message).toContain('Enable Flow State')
    expect(violation?.message).toContain('enable-flow-state.md')
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

describe('validateOpeningSentenceLength', () => {
  test('returns null for sentence within limit', () => {
    const content = '# Title\n\nThis is a short sentence.'
    expect(validateOpeningSentenceLength('file.md', content)).toBeNull()
  })

  test('returns null for sentence exactly at limit', () => {
    // Create a sentence exactly 150 characters long (including the period)
    const sentence = `${'A'.repeat(149)}.`
    const content = `# Title\n\n${sentence}`
    expect(validateOpeningSentenceLength('file.md', content)).toBeNull()
  })

  test('returns violation for sentence exceeding limit', () => {
    // Create a sentence 151 characters long
    const sentence = `${'A'.repeat(150)}.`
    const content = `# Title\n\n${sentence}`
    const violation = validateOpeningSentenceLength('file.md', content)
    expect(violation).not.toBeNull()
    expect(violation?.message).toContain('151 characters')
    expect(violation?.message).toContain('max 150')
  })

  test('returns null when opening sentence is missing', () => {
    // Missing sentence is handled by validateOpeningSentence, not this function
    const content = '# Title\n\n## Another Heading'
    expect(validateOpeningSentenceLength('file.md', content)).toBeNull()
  })
})

describe('validateImperativeOpeningSentence', () => {
  test('passes for imperative sentences', () => {
    expect(
      validateImperativeOpeningSentence(
        'file.md',
        '# Title\n\nAdd authentication to the login page.'
      )
    ).toBeNull()
    expect(
      validateImperativeOpeningSentence(
        'file.md',
        '# Title\n\nReplace the old caching layer.'
      )
    ).toBeNull()
    expect(
      validateImperativeOpeningSentence(
        'file.md',
        '# Title\n\nFix the race condition in the worker pool.'
      )
    ).toBeNull()
  })

  test('fails for sentences starting with articles', () => {
    const violation = validateImperativeOpeningSentence(
      'file.md',
      '# Title\n\nThe authentication system needs updating.'
    )
    expect(violation).not.toBeNull()
    expect(violation?.message).toContain('imperative form')
  })

  test('fails for sentences starting with demonstratives', () => {
    const violation = validateImperativeOpeningSentence(
      'file.md',
      '# Title\n\nThis task adds authentication.'
    )
    expect(violation).not.toBeNull()
    expect(violation?.message).toContain('imperative form')
  })

  test('fails for sentences starting with pronouns', () => {
    const violation = validateImperativeOpeningSentence(
      'file.md',
      '# Title\n\nWe need to add authentication.'
    )
    expect(violation).not.toBeNull()
    expect(violation?.message).toContain('imperative form')
  })

  test('fails for sentences starting with gerunds', () => {
    const violation = validateImperativeOpeningSentence(
      'file.md',
      '# Title\n\nAdding authentication to the login page.'
    )
    expect(violation).not.toBeNull()
    expect(violation?.message).toContain('imperative form')
  })

  test('returns null when there is no opening sentence', () => {
    expect(
      validateImperativeOpeningSentence('file.md', '# Title\n\n## Heading')
    ).toBeNull()
  })
})

describe('validateIdeaOpenQuestions', () => {
  test('returns no violations when no Open Questions section exists', () => {
    const content = `# My Idea

This is a simple idea.
`
    expect(validateIdeaOpenQuestions('idea.md', content)).toHaveLength(0)
  })

  test('returns no violations for valid Open Questions section', () => {
    const content = `# My Idea

This is an idea.

## Open Questions

### Should we take our own payments?

#### Yes, take our own payments

Lower costs, seller of record, but merchant account required.

#### No, use a payment provider

Higher costs, simpler setup.

### Which framework should we use?

#### React

Large ecosystem, widely adopted.

#### Vue

Simpler API, smaller bundle.
`
    expect(validateIdeaOpenQuestions('idea.md', content)).toHaveLength(0)
  })

  test('returns violation when question heading does not end with question mark', () => {
    const content = `# My Idea

This is an idea.

## Open Questions

### This is not a question

#### Option A

Some analysis.
`
    const violations = validateIdeaOpenQuestions('idea.md', content)
    expect(violations).toHaveLength(1)
    expect(violations[0].message).toContain('Questions must end with "?"')
    expect(violations[0].line).toBe(7)
  })

  test('returns violation when question has no options', () => {
    const content = `# My Idea

This is an idea.

## Open Questions

### Should we take our own payments?
`
    const violations = validateIdeaOpenQuestions('idea.md', content)
    expect(violations).toHaveLength(1)
    expect(violations[0].message).toContain('no options')
    expect(violations[0].line).toBe(7)
  })

  test('returns violation when question has no options before next question', () => {
    const content = `# My Idea

This is an idea.

## Open Questions

### Should we take our own payments?

### Which framework should we use?

#### React

Large ecosystem.
`
    const violations = validateIdeaOpenQuestions('idea.md', content)
    expect(violations).toHaveLength(1)
    expect(violations[0].message).toContain('no options')
    expect(violations[0].line).toBe(7)
  })

  test('returns violation when question has no options before next section', () => {
    const content = `# My Idea

This is an idea.

## Open Questions

### Should we take our own payments?

## Notes

Some notes.
`
    const violations = validateIdeaOpenQuestions('idea.md', content)
    expect(violations).toHaveLength(1)
    expect(violations[0].message).toContain('no options')
    expect(violations[0].line).toBe(7)
  })

  test('ignores headings in other sections', () => {
    const content = `# My Idea

This is an idea.

## Notes

### This is not a question

#### And this is not an option
`
    expect(validateIdeaOpenQuestions('idea.md', content)).toHaveLength(0)
  })

  test('reports multiple violations', () => {
    const content = `# My Idea

This is an idea.

## Open Questions

### Not a question

#### Option A

Some analysis.

### Also not a question

#### Option B

Some analysis.
`
    const violations = validateIdeaOpenQuestions('idea.md', content)
    expect(violations).toHaveLength(2)
  })

  test('rejects bullet-point lines in Open Questions', () => {
    const content = `# My Idea

## Open Questions

- Should we do X?
- Should we do Y?
`
    const violations = validateIdeaOpenQuestions('idea.md', content)
    expect(violations).toHaveLength(2)
    expect(violations[0].message).toContain('top level')
    expect(violations[0].line).toBe(5)
    expect(violations[1].line).toBe(6)
  })

  test('rejects asterisk bullet-point lines in Open Questions', () => {
    const content = `# My Idea

## Open Questions

* Should we do X?
`
    const violations = validateIdeaOpenQuestions('idea.md', content)
    expect(violations).toHaveLength(1)
    expect(violations[0].message).toContain('top level')
  })

  test('rejects mixed bullet-points and headings in Open Questions', () => {
    const content = `# My Idea

## Open Questions

### Should we do X?

- But also this bullet point

#### Option A

Some analysis.
`
    const violations = validateIdeaOpenQuestions('idea.md', content)
    expect(violations).toHaveLength(1)
    expect(violations[0].message).toContain('top level')
    expect(violations[0].line).toBe(7)
  })

  test('rejects ordered-list lines at the top level in Open Questions', () => {
    const content = `# My Idea

## Open Questions

1. Should we do X?
2. Should we do Y?
`
    const violations = validateIdeaOpenQuestions('idea.md', content)
    expect(violations).toHaveLength(2)
    expect(violations[0].message).toContain('top level')
    expect(violations[0].line).toBe(5)
    expect(violations[1].line).toBe(6)
  })

  test('rejects top-level stray text in Open Questions', () => {
    const content = `# My Idea

## Open Questions

This is stray top-level text.

### Should we do X?

#### Option A
`
    const violations = validateIdeaOpenQuestions('idea.md', content)
    expect(violations).toHaveLength(1)
    expect(violations[0].message).toContain('top level')
    expect(violations[0].line).toBe(5)
  })

  test('rejects fenced code blocks at top level in Open Questions', () => {
    const content = `# My Idea

## Open Questions

\`\`\`markdown
### Not a real question heading
\`\`\`
`
    const violations = validateIdeaOpenQuestions('idea.md', content)
    expect(violations).toHaveLength(1)
    expect(violations[0].message).toContain('top level')
    expect(violations[0].line).toBe(5)
  })

  test('ignores bullet points inside fenced code blocks in Open Questions', () => {
    const content = `# My Idea

## Open Questions

### Should we do X?

#### Option A

Example:

\`\`\`markdown
- This bullet point is in a code block
* So is this one
\`\`\`

Some analysis.
`
    expect(validateIdeaOpenQuestions('idea.md', content)).toHaveLength(0)
  })

  test('allows markdown lists inside Open Questions option descriptions', () => {
    const content = `# My Idea

## Open Questions

### Should we do X?

#### Option A

Pros:

1. Cheaper
2. Faster

- Fewer dependencies
- Easier setup
`
    expect(validateIdeaOpenQuestions('idea.md', content)).toHaveLength(0)
  })

  test('allows bullet points in other sections', () => {
    const content = `# My Idea

## Notes

- This is fine
- So is this

## Open Questions

### Should we do X?

#### Option A

Some analysis.
`
    expect(validateIdeaOpenQuestions('idea.md', content)).toHaveLength(0)
  })

  test('reports violation for "## open questions" (all lowercase)', () => {
    const content = `# My Idea

This is an idea.

## open questions

### Should we do X?

#### Yes

Good idea.

#### No

Bad idea.
`
    const violations = validateIdeaOpenQuestions('idea.md', content)
    expect(violations).toHaveLength(1)
    expect(violations[0].message).toBe(
      'Heading "## open questions" should be "## Open Questions"'
    )
    expect(violations[0].line).toBe(5)
  })

  test('reports violation for "## Open questions" (wrong capitalization)', () => {
    const content = `# My Idea

This is an idea.

## Open questions

### Should we do X?

#### Yes

Sure.

#### No

Nope.
`
    const violations = validateIdeaOpenQuestions('idea.md', content)
    expect(violations).toHaveLength(1)
    expect(violations[0].message).toBe(
      'Heading "## Open questions" should be "## Open Questions"'
    )
  })

  test('reports violation for "## OPEN QUESTIONS" (all uppercase)', () => {
    const content = `# My Idea

This is an idea.

## OPEN QUESTIONS

### Should we do X?

#### Yes

Sure.

#### No

Nope.
`
    const violations = validateIdeaOpenQuestions('idea.md', content)
    expect(violations).toHaveLength(1)
    expect(violations[0].message).toBe(
      'Heading "## OPEN QUESTIONS" should be "## Open Questions"'
    )
  })
})

describe('validateTaskHeadings', () => {
  test('returns no violations for valid task', () => {
    const content = `# Task
## Blocked By
## Definition of Done`

    const violations = validateTaskHeadings('task.md', content)
    expect(violations).toHaveLength(0)
  })

  test('reports missing headings', () => {
    const content = `# Task
## Blocked By`

    const violations = validateTaskHeadings('task.md', content)
    expect(violations).toHaveLength(1)
  })
})

describe('validateLinks', () => {
  test('returns no violations for valid links', () => {
    const content = '[Principle](../principles/principle.md)'
    const fileSystem = createFileSystemEmulator({
      project: {
        '.dust': {
          principles: { 'principle.md': 'content' },
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
    const content = '[Missing](../principles/missing.md)'
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
[Missing](../principles/missing.md)`
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
  test('returns no violations when Principles link points to principles directory', () => {
    const content = `# Task
## Principles
[Principle](../principles/my-principle.md)
## Blocked By
## Definition of Done`

    const violations = validateSemanticLinks(
      '/project/.dust/tasks/task.md',
      content
    )
    expect(violations).toHaveLength(0)
  })

  test('returns violation when Principles link points to tasks directory', () => {
    const content = `# Task
## Principles
[Task](../tasks/other-task.md)
## Blocked By
## Definition of Done`

    const violations = validateSemanticLinks(
      '/project/.dust/tasks/task.md',
      content
    )
    expect(violations).toHaveLength(1)
    expect(violations[0].message).toContain('## Principles')
    expect(violations[0].message).toContain('principle file')
    expect(violations[0].line).toBe(3)
  })

  test('returns no violations when Blocked by link points to tasks directory', () => {
    const content = `# Task
## Principles
## Blocked By
[Blocker](../tasks/blocker-task.md)
## Definition of Done`

    const violations = validateSemanticLinks(
      '/project/.dust/tasks/task.md',
      content
    )
    expect(violations).toHaveLength(0)
  })

  test('returns violation when Blocked by link points to principles directory', () => {
    const content = `# Task
## Principles
## Blocked By
[Principle](../principles/my-principle.md)
## Definition of Done`

    const violations = validateSemanticLinks(
      '/project/.dust/tasks/task.md',
      content
    )
    expect(violations).toHaveLength(1)
    expect(violations[0].message).toContain('## Blocked By')
    expect(violations[0].message).toContain('task file')
    expect(violations[0].line).toBe(4)
  })

  test('rejects external links in semantic sections', () => {
    const content = `# Task
## Principles
[External](https://example.com)
## Blocked By
## Definition of Done`

    const violations = validateSemanticLinks(
      '/project/.dust/tasks/task.md',
      content
    )
    expect(violations).toHaveLength(1)
    expect(violations[0].message).toContain('## Principles')
    expect(violations[0].message).toContain('external URL')
    expect(violations[0].line).toBe(3)
  })

  test('rejects anchor links in semantic sections', () => {
    const content = `# Task
## Principles
[Section](#section)
## Blocked By
## Definition of Done`

    const violations = validateSemanticLinks(
      '/project/.dust/tasks/task.md',
      content
    )
    expect(violations).toHaveLength(1)
    expect(violations[0].message).toContain('## Principles')
    expect(violations[0].message).toContain('anchor')
    expect(violations[0].line).toBe(3)
  })

  test('ignores links in other sections', () => {
    const content = `# Task
## Principles
## Blocked By
## Definition of Done
[Any Link](../random/file.md)`

    const violations = validateSemanticLinks(
      '/project/.dust/tasks/task.md',
      content
    )
    expect(violations).toHaveLength(0)
  })

  test('handles multiple links in same section', () => {
    const content = `# Task
## Principles
[Principle1](../principles/principle1.md)
[Principle2](../tasks/wrong.md)
[Principle3](../principles/principle3.md)
## Blocked By
## Definition of Done`

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
          principles: {
            'principle.md': `# Principle

This is a principle.

## Parent Principle

- (none)

## Sub-Principles

- (none)
`,
          },
          tasks: {
            'my-task.md': `# My Task

Implement the task functionality.

## Principles
[Principle](../principles/principle.md)
## Blocked By
## Definition of Done`,
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
## Principles
## Blocked By
## Definition of Done`,
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

  test('reports non-markdown files in .dust root', async () => {
    const context = createContextEmulator()
    const fileSystem = createFileSystemEmulator({
      project: {
        '.dust': {
          principles: {
            'principle.md': `# Principle

This is a principle.

## Parent Principle

- (none)

## Sub-Principles

- (none)
`,
          },
          tasks: {
            'my-task.md': `# My Task

Implement the task functionality.

## Principles
## Blocked By
## Definition of Done`,
          },
          // These are outside content directories, so they should be ignored
          'some-file.txt': '',
          '.gitkeep': '',
          config: {
            'settings.json': '{}',
          },
        },
      },
    })

    const result = await lintMarkdown(createDependencies(context, fileSystem))

    expect(result.exitCode).toBe(1)
    expect(context.stderrLines.join('\n')).toContain(
      'Unexpected file "some-file.txt" in .dust/'
    )
    expect(context.stderrLines.join('\n')).toContain(
      'Unexpected file ".gitkeep" in .dust/'
    )
  })

  test('displays violations with line numbers correctly', async () => {
    const context = createContextEmulator()
    const fileSystem = createFileSystemEmulator({
      project: {
        '.dust': {
          tasks: {
            'my-task.md': `# Task
## Principles
[Broken](../missing.md)
## Blocked By
## Definition of Done`,
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
## Principles
## Blocked By
## Definition of Done`,
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

  test('reports opening sentence length violations', async () => {
    const context = createContextEmulator()
    // Create a sentence that exceeds 150 characters
    const longSentence = `${'A'.repeat(150)}.`
    const fileSystem = createFileSystemEmulator({
      project: {
        '.dust': {
          ideas: {
            'long-sentence.md': `# Long Sentence

${longSentence}
`,
          },
        },
      },
    })

    const result = await lintMarkdown(createDependencies(context, fileSystem))

    expect(result.exitCode).toBe(1)
    const output = context.stderrLines.join('\n')
    expect(output).toContain('151 characters')
    expect(output).toContain('max 150')
  })

  test('skips task validation when tasks directory does not exist', async () => {
    const context = createContextEmulator()
    // Only principles directory, no tasks directory
    const fileSystem = createFileSystemEmulator({
      project: {
        '.dust': {
          principles: {
            'principle.md': `# Principle

This is a principle.

## Parent Principle

- (none)

## Sub-Principles

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

  test('reports semantic link violations for wrong link type in Principles section', async () => {
    const context = createContextEmulator()
    const fileSystem = createFileSystemEmulator({
      project: {
        '.dust': {
          principles: { 'principle.md': '# Principle' },
          tasks: {
            'other-task.md': '# Other',
            'my-task.md': `# Task
## Principles
[Wrong](../tasks/other-task.md)
## Blocked By
## Definition of Done`,
          },
        },
      },
    })

    const result = await lintMarkdown(createDependencies(context, fileSystem))

    expect(result.exitCode).toBe(1)
    const output = context.stderrLines.join('\n')
    expect(output).toContain('## Principles')
    expect(output).toContain('principle file')
  })

  test('reports imperative opening sentence violations for task files', async () => {
    const context = createContextEmulator()
    const fileSystem = createFileSystemEmulator({
      project: {
        '.dust': {
          tasks: {
            'my-task.md': `# My Task

This task does something.

## Principles
## Blocked By
## Definition of Done`,
          },
        },
      },
    })

    const result = await lintMarkdown(createDependencies(context, fileSystem))

    expect(result.exitCode).toBe(1)
    const output = context.stderrLines.join('\n')
    expect(output).toContain('imperative form')
  })

  test('reports semantic link violations for wrong link type in Blocked by section', async () => {
    const context = createContextEmulator()
    const fileSystem = createFileSystemEmulator({
      project: {
        '.dust': {
          principles: { 'principle.md': '# Principle' },
          tasks: {
            'my-task.md': `# Task
## Principles
## Blocked By
[Wrong](../principles/principle.md)
## Definition of Done`,
          },
        },
      },
    })

    const result = await lintMarkdown(createDependencies(context, fileSystem))

    expect(result.exitCode).toBe(1)
    const output = context.stderrLines.join('\n')
    expect(output).toContain('## Blocked By')
    expect(output).toContain('task file')
  })
})

describe('validatePrincipleHierarchySections', () => {
  test('returns no violations for valid principle with both sections', () => {
    const content = `# Principle

This is a principle.

## Parent Principle

- (none)

## Sub-Principles

- (none)
`
    const violations = validatePrincipleHierarchySections(
      'principle.md',
      content
    )
    expect(violations).toHaveLength(0)
  })

  test('reports missing Parent Principle section', () => {
    const content = `# Principle

This is a principle.

## Sub-Principles

- (none)
`
    const violations = validatePrincipleHierarchySections(
      'principle.md',
      content
    )
    expect(violations).toHaveLength(1)
    expect(violations[0].message).toContain('## Parent Principle')
  })

  test('reports missing Sub-Principles section', () => {
    const content = `# Principle

This is a principle.

## Parent Principle

- (none)
`
    const violations = validatePrincipleHierarchySections(
      'principle.md',
      content
    )
    expect(violations).toHaveLength(1)
    expect(violations[0].message).toContain('## Sub-Principles')
  })

  test('reports both missing sections', () => {
    const content = `# Principle

This is a principle.
`
    const violations = validatePrincipleHierarchySections(
      'principle.md',
      content
    )
    expect(violations).toHaveLength(2)
  })
})

describe('validatePrincipleHierarchyLinks', () => {
  test('returns no violations for valid principle links', () => {
    const content = `# Principle

This is a principle.

## Parent Principle

- [Parent](parent-principle.md)

## Sub-Principles

- [Child](child-principle.md)
`
    const violations = validatePrincipleHierarchyLinks(
      '/project/.dust/principles/principle.md',
      content
    )
    expect(violations).toHaveLength(0)
  })

  test('returns violation for non-principle link in Parent Principle section', () => {
    const content = `# Principle

## Parent Principle

- [Task](../tasks/task.md)

## Sub-Principles

- (none)
`
    const violations = validatePrincipleHierarchyLinks(
      '/project/.dust/principles/principle.md',
      content
    )
    expect(violations).toHaveLength(1)
    expect(violations[0].message).toContain('## Parent Principle')
    expect(violations[0].message).toContain('principle file')
  })

  test('returns violation for non-principle link in Sub-Principles section', () => {
    const content = `# Principle

## Parent Principle

- (none)

## Sub-Principles

- [Idea](../ideas/idea.md)
`
    const violations = validatePrincipleHierarchyLinks(
      '/project/.dust/principles/principle.md',
      content
    )
    expect(violations).toHaveLength(1)
    expect(violations[0].message).toContain('## Sub-Principles')
    expect(violations[0].message).toContain('principle file')
  })

  test('rejects external links in hierarchy sections', () => {
    const content = `# Principle

## Parent Principle

- [External](https://example.com)

## Sub-Principles

- (none)
`
    const violations = validatePrincipleHierarchyLinks(
      '/project/.dust/principles/principle.md',
      content
    )
    expect(violations).toHaveLength(1)
    expect(violations[0].message).toContain('external URL')
  })

  test('rejects anchor links in hierarchy sections', () => {
    const content = `# Principle

## Parent Principle

- [Anchor](#section)

## Sub-Principles

- (none)
`
    const violations = validatePrincipleHierarchyLinks(
      '/project/.dust/principles/principle.md',
      content
    )
    expect(violations).toHaveLength(1)
    expect(violations[0].message).toContain('anchor')
  })

  test('includes line numbers in violations', () => {
    const content = `# Principle

## Parent Principle

- [Task](../tasks/task.md)

## Sub-Principles

- (none)
`
    const violations = validatePrincipleHierarchyLinks(
      '/project/.dust/principles/principle.md',
      content
    )
    expect(violations[0].line).toBe(5)
  })
})

describe('extractPrincipleRelationships', () => {
  test('extracts parent and sub-principle relationships', () => {
    const content = `# Principle

## Parent Principle

- [Parent](parent.md)

## Sub-Principles

- [Child1](child1.md)
- [Child2](child2.md)
`
    const rel = extractPrincipleRelationships(
      '/project/.dust/principles/principle.md',
      content
    )
    expect(rel.filePath).toBe('/project/.dust/principles/principle.md')
    expect(rel.parentPrinciples).toEqual([
      '/project/.dust/principles/parent.md',
    ])
    expect(rel.subPrinciples).toEqual([
      '/project/.dust/principles/child1.md',
      '/project/.dust/principles/child2.md',
    ])
  })

  test('handles principles with no parents', () => {
    const content = `# Principle

## Parent Principle

- (none)

## Sub-Principles

- [Child](child.md)
`
    const rel = extractPrincipleRelationships(
      '/project/.dust/principles/principle.md',
      content
    )
    expect(rel.parentPrinciples).toEqual([])
    expect(rel.subPrinciples).toEqual(['/project/.dust/principles/child.md'])
  })

  test('handles principles with no sub-principles', () => {
    const content = `# Principle

## Parent Principle

- [Parent](parent.md)

## Sub-Principles

- (none)
`
    const rel = extractPrincipleRelationships(
      '/project/.dust/principles/principle.md',
      content
    )
    expect(rel.parentPrinciples).toEqual([
      '/project/.dust/principles/parent.md',
    ])
    expect(rel.subPrinciples).toEqual([])
  })

  test('ignores non-principle links', () => {
    const content = `# Principle

## Parent Principle

- [Task](../tasks/task.md)

## Sub-Principles

- (none)
`
    const rel = extractPrincipleRelationships(
      '/project/.dust/principles/principle.md',
      content
    )
    expect(rel.parentPrinciples).toEqual([])
    expect(rel.subPrinciples).toEqual([])
  })

  test('ignores anchor links', () => {
    const content = `# Principle

## Parent Principle

- [Anchor](#section)

## Sub-Principles

- (none)
`
    const rel = extractPrincipleRelationships(
      '/project/.dust/principles/principle.md',
      content
    )
    expect(rel.parentPrinciples).toEqual([])
    expect(rel.subPrinciples).toEqual([])
  })

  test('ignores external links', () => {
    const content = `# Principle

## Parent Principle

- [External](https://example.com)

## Sub-Principles

- [HTTP](http://example.com)
`
    const rel = extractPrincipleRelationships(
      '/project/.dust/principles/principle.md',
      content
    )
    expect(rel.parentPrinciples).toEqual([])
    expect(rel.subPrinciples).toEqual([])
  })
})

describe('validateBidirectionalLinks', () => {
  test('returns no violations for consistent bidirectional links', () => {
    const relationships = [
      {
        filePath: '/project/.dust/principles/parent.md',
        parentPrinciples: [],
        subPrinciples: ['/project/.dust/principles/child.md'],
      },
      {
        filePath: '/project/.dust/principles/child.md',
        parentPrinciples: ['/project/.dust/principles/parent.md'],
        subPrinciples: [],
      },
    ]
    const violations = validateBidirectionalLinks(relationships)
    expect(violations).toHaveLength(0)
  })

  test('reports missing sub-principle link in parent', () => {
    const relationships = [
      {
        filePath: '/project/.dust/principles/parent.md',
        parentPrinciples: [],
        subPrinciples: [], // Parent doesn't list child as sub-principle
      },
      {
        filePath: '/project/.dust/principles/child.md',
        parentPrinciples: ['/project/.dust/principles/parent.md'],
        subPrinciples: [],
      },
    ]
    const violations = validateBidirectionalLinks(relationships)
    expect(violations).toHaveLength(1)
    expect(violations[0].file).toBe('/project/.dust/principles/child.md')
    expect(violations[0].message).toContain(
      'does not list this principle as a sub-principle'
    )
  })

  test('reports missing parent link in child', () => {
    const relationships = [
      {
        filePath: '/project/.dust/principles/parent.md',
        parentPrinciples: [],
        subPrinciples: ['/project/.dust/principles/child.md'],
      },
      {
        filePath: '/project/.dust/principles/child.md',
        parentPrinciples: [], // Child doesn't list parent
        subPrinciples: [],
      },
    ]
    const violations = validateBidirectionalLinks(relationships)
    expect(violations).toHaveLength(1)
    expect(violations[0].file).toBe('/project/.dust/principles/parent.md')
    expect(violations[0].message).toContain(
      'does not list this principle as its parent'
    )
  })

  test('handles complex hierarchy with multiple children', () => {
    const relationships = [
      {
        filePath: '/project/.dust/principles/root.md',
        parentPrinciples: [],
        subPrinciples: [
          '/project/.dust/principles/a.md',
          '/project/.dust/principles/b.md',
        ],
      },
      {
        filePath: '/project/.dust/principles/a.md',
        parentPrinciples: ['/project/.dust/principles/root.md'],
        subPrinciples: [],
      },
      {
        filePath: '/project/.dust/principles/b.md',
        parentPrinciples: ['/project/.dust/principles/root.md'],
        subPrinciples: [],
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
        filePath: '/project/.dust/principles/root.md',
        parentPrinciples: [],
        subPrinciples: ['/project/.dust/principles/child.md'],
      },
      {
        filePath: '/project/.dust/principles/child.md',
        parentPrinciples: ['/project/.dust/principles/root.md'],
        subPrinciples: [],
      },
    ]
    const violations = validateNoCycles(relationships)
    expect(violations).toHaveLength(0)
  })

  test('detects simple cycle between two principles', () => {
    const relationships = [
      {
        filePath: '/project/.dust/principles/a.md',
        parentPrinciples: ['/project/.dust/principles/b.md'],
        subPrinciples: [],
      },
      {
        filePath: '/project/.dust/principles/b.md',
        parentPrinciples: ['/project/.dust/principles/a.md'],
        subPrinciples: [],
      },
    ]
    const violations = validateNoCycles(relationships)
    expect(violations.length).toBeGreaterThan(0)
    expect(violations[0].message).toContain('Cycle detected')
  })

  test('detects longer cycle', () => {
    const relationships = [
      {
        filePath: '/project/.dust/principles/a.md',
        parentPrinciples: ['/project/.dust/principles/c.md'],
        subPrinciples: [],
      },
      {
        filePath: '/project/.dust/principles/b.md',
        parentPrinciples: ['/project/.dust/principles/a.md'],
        subPrinciples: [],
      },
      {
        filePath: '/project/.dust/principles/c.md',
        parentPrinciples: ['/project/.dust/principles/b.md'],
        subPrinciples: [],
      },
    ]
    const violations = validateNoCycles(relationships)
    expect(violations.length).toBeGreaterThan(0)
    expect(violations[0].message).toContain('Cycle detected')
  })

  test('detects self-referential cycle', () => {
    const relationships = [
      {
        filePath: '/project/.dust/principles/a.md',
        parentPrinciples: ['/project/.dust/principles/a.md'],
        subPrinciples: [],
      },
    ]
    const violations = validateNoCycles(relationships)
    expect(violations.length).toBeGreaterThan(0)
    expect(violations[0].message).toContain('Cycle detected')
  })
})

describe('validateContentDirectoryFiles', () => {
  test('returns empty array for directory with only markdown files', async () => {
    const fileSystem = createFileSystemEmulator({
      project: {
        '.dust': {
          tasks: {
            'task-one.md': '# Task One',
            'task-two.md': '# Task Two',
          },
        },
      },
    })

    const violations = await validateContentDirectoryFiles(
      '/project/.dust/tasks',
      fileSystem
    )

    expect(violations).toEqual([])
  })

  test('reports violation for non-markdown files', async () => {
    const fileSystem = createFileSystemEmulator({
      project: {
        '.dust': {
          tasks: {
            'task.md': '# Task',
            README: 'some readme',
          },
        },
      },
    })

    const violations = await validateContentDirectoryFiles(
      '/project/.dust/tasks',
      fileSystem
    )

    expect(violations.length).toBe(1)
    expect(violations[0].file).toBe('/project/.dust/tasks/README')
    expect(violations[0].message).toContain('Non-markdown file')
  })

  test('reports violation for hidden files', async () => {
    const fileSystem = createFileSystemEmulator({
      project: {
        '.dust': {
          ideas: {
            'idea.md': '# Idea',
            '.DS_Store': '',
          },
        },
      },
    })

    const violations = await validateContentDirectoryFiles(
      '/project/.dust/ideas',
      fileSystem
    )

    expect(violations.length).toBe(1)
    expect(violations[0].file).toBe('/project/.dust/ideas/.DS_Store')
    expect(violations[0].message).toContain('Hidden file')
  })

  test('reports violation for subdirectories', async () => {
    const fileSystem = createFileSystemEmulator({
      project: {
        '.dust': {
          principles: {
            'principle.md': '# Principle',
            subdir: {
              'nested.md': '# Nested',
            },
          },
        },
      },
    })

    const violations = await validateContentDirectoryFiles(
      '/project/.dust/principles',
      fileSystem
    )

    expect(violations.length).toBe(1)
    expect(violations[0].file).toBe('/project/.dust/principles/subdir')
    expect(violations[0].message).toContain('Subdirectory')
    expect(violations[0].message).toContain('should be flat')
  })

  test('returns empty array for non-existent directory', async () => {
    const fileSystem = createFileSystemEmulator({
      project: {
        '.dust': {},
      },
    })
    fileSystem.readdir = async () => {
      const error = new Error('ENOENT') as NodeJS.ErrnoException
      error.code = 'ENOENT'
      throw error
    }

    const violations = await validateContentDirectoryFiles(
      '/project/.dust/nonexistent',
      fileSystem
    )

    expect(violations).toEqual([])
  })

  test('rethrows non-ENOENT errors from readdir', async () => {
    const fileSystem = createFileSystemEmulator({
      project: { '.dust': {} },
    })
    fileSystem.readdir = async () => {
      const error = new Error('Permission denied') as NodeJS.ErrnoException
      error.code = 'EACCES'
      throw error
    }

    await expect(
      validateContentDirectoryFiles('/project/.dust/tasks', fileSystem)
    ).rejects.toThrow('Permission denied')
  })

  test('reports multiple violations', async () => {
    const fileSystem = createFileSystemEmulator({
      project: {
        '.dust': {
          facts: {
            'fact.md': '# Fact',
            '.hidden': '',
            'backup.txt': '',
            nested: {
              'file.md': '# Nested file',
            },
          },
        },
      },
    })

    const violations = await validateContentDirectoryFiles(
      '/project/.dust/facts',
      fileSystem
    )

    expect(violations.length).toBe(3)
    const messages = violations.map(v => v.message)
    expect(messages.some(m => m.includes('Hidden file'))).toBe(true)
    expect(messages.some(m => m.includes('Non-markdown file'))).toBe(true)
    expect(messages.some(m => m.includes('Subdirectory'))).toBe(true)
  })
})

describe('validateDirectoryStructure', () => {
  test('returns empty array for valid directory structure', async () => {
    const fileSystem = createFileSystemEmulator({
      project: {
        '.dust': {
          principles: { 'principle.md': '# Principle' },
          tasks: { 'task.md': '# Task' },
          ideas: { 'idea.md': '# Idea' },
          facts: { 'fact.md': '# Fact' },
          config: { 'settings.json': '{}' },
        },
      },
    })

    const violations = await validateDirectoryStructure(
      '/project/.dust',
      fileSystem
    )

    expect(violations).toEqual([])
  })

  test('reports violation for unexpected directory', async () => {
    const fileSystem = createFileSystemEmulator({
      project: {
        '.dust': {
          principles: { 'principle.md': '# Principle' },
          task: { 'task.md': '# Task' }, // typo: "task" instead of "tasks"
        },
      },
    })

    const violations = await validateDirectoryStructure(
      '/project/.dust',
      fileSystem
    )

    expect(violations.length).toBe(1)
    expect(violations[0].file).toBe('/project/.dust/task')
    expect(violations[0].message).toContain('Unexpected directory "task"')
    expect(violations[0].message).toContain('Allowed root paths:')
    expect(violations[0].message).toContain('extraDirectories')
  })

  test('reports multiple unexpected directories', async () => {
    const fileSystem = createFileSystemEmulator({
      project: {
        '.dust': {
          goal: { 'principle.md': '# Principle' }, // typo
          task: { 'task.md': '# Task' }, // typo
        },
      },
    })

    const violations = await validateDirectoryStructure(
      '/project/.dust',
      fileSystem
    )

    expect(violations.length).toBe(2)
  })

  test('reports violation for .dust/Dockerfile with migration message', async () => {
    const fileSystem = createFileSystemEmulator({
      project: {
        '.dust': {
          Dockerfile: 'FROM node:20',
        },
      },
    })

    const violations = await validateDirectoryStructure(
      '/project/.dust',
      fileSystem
    )

    expect(violations).toEqual([
      {
        file: '/project/.dust/Dockerfile',
        message:
          '".dust/Dockerfile" is no longer supported. Move Docker-related configuration under ".dust/config/".',
      },
    ])
  })

  test('allows directories specified in extraDirectories', async () => {
    const fileSystem = createFileSystemEmulator({
      project: {
        '.dust': {
          principles: { 'principle.md': '# Principle' },
          templates: { 'template.md': '# Template' }, // custom directory
        },
      },
    })

    const violations = await validateDirectoryStructure(
      '/project/.dust',
      fileSystem,
      ['templates']
    )

    expect(violations).toEqual([])
  })

  test('accepts known files and subdirectories in .dust/config/', async () => {
    const fileSystem = createFileSystemEmulator({
      project: {
        '.dust': {
          config: {
            'settings.json': '{}',
            audits: {
              'security.md': '# Security',
            },
            hints: {
              'build.md': '# Build',
            },
            agents: {
              'codex.md': '# Codex',
            },
          },
        },
      },
    })

    const violations = await validateDirectoryStructure(
      '/project/.dust',
      fileSystem
    )

    expect(violations).toEqual([])
  })

  test('reports unexpected file in .dust/config/', async () => {
    const fileSystem = createFileSystemEmulator({
      project: {
        '.dust': {
          config: {
            'settings.json': '{}',
            'notes.txt': 'todo',
          },
        },
      },
    })

    const violations = await validateDirectoryStructure(
      '/project/.dust',
      fileSystem
    )

    expect(violations).toEqual([
      {
        file: '/project/.dust/config/notes.txt',
        message:
          'Unexpected file "notes.txt" in .dust/config/. Allowed entries: agents/, audits/, hints/, settings.json',
      },
    ])
  })

  test('reports unexpected subdirectory in .dust/config/', async () => {
    const fileSystem = createFileSystemEmulator({
      project: {
        '.dust': {
          config: {
            examples: {
              'example.md': '# Example',
            },
          },
        },
      },
    })

    const violations = await validateDirectoryStructure(
      '/project/.dust',
      fileSystem
    )

    expect(violations).toEqual([
      {
        file: '/project/.dust/config/examples',
        message:
          'Unexpected directory "examples" in .dust/config/. Allowed entries: agents/, audits/, hints/, settings.json',
      },
    ])
  })

  test('reports unexpected root files', async () => {
    const fileSystem = createFileSystemEmulator({
      project: {
        '.dust': {
          principles: { 'principle.md': '# Principle' },
          'README.md': '# Readme',
          '.gitkeep': '',
        },
      },
    })

    const violations = await validateDirectoryStructure(
      '/project/.dust',
      fileSystem
    )

    expect(violations).toHaveLength(2)
    expect(violations).toEqual(
      expect.arrayContaining([
        {
          file: '/project/.dust/.gitkeep',
          message:
            'Unexpected file ".gitkeep" in .dust/. Allowed root paths: config/, facts/, ideas/, principles/, tasks/, repository.md',
        },
        {
          file: '/project/.dust/README.md',
          message:
            'Unexpected file "README.md" in .dust/. Allowed root paths: config/, facts/, ideas/, principles/, tasks/, repository.md',
        },
      ])
    )
  })

  test('allows .dust/repository.md at root', async () => {
    const fileSystem = createFileSystemEmulator({
      project: {
        '.dust': {
          'repository.md': '# Repository',
        },
      },
    })

    const violations = await validateDirectoryStructure(
      '/project/.dust',
      fileSystem
    )

    expect(violations).toEqual([])
  })

  test('returns empty array for non-existent directory', async () => {
    const fileSystem = createFileSystemEmulator({
      project: {},
    })
    fileSystem.readdir = async () => {
      const error = new Error('ENOENT: no such file or directory')
      ;(error as NodeJS.ErrnoException).code = 'ENOENT'
      throw error
    }

    const violations = await validateDirectoryStructure(
      '/project/.dust',
      fileSystem
    )

    expect(violations).toEqual([])
  })

  test('rethrows non-ENOENT errors', async () => {
    const fileSystem = createFileSystemEmulator({
      project: {
        '.dust': {},
      },
    })
    fileSystem.readdir = async () => {
      throw new Error('Permission denied')
    }

    await expect(
      validateDirectoryStructure('/project/.dust', fileSystem)
    ).rejects.toThrow('Permission denied')
  })

  test('returns existing violations when .dust/config disappears before readdir', async () => {
    const fileSystem = createFileSystemEmulator({
      project: {
        '.dust': {
          task: { 'task.md': '# Task' },
          config: {
            'settings.json': '{}',
          },
        },
      },
    })
    const originalReaddir = fileSystem.readdir
    fileSystem.readdir = async path => {
      if (path === '/project/.dust/config') {
        const error = new Error('ENOENT: no such file or directory')
        ;(error as NodeJS.ErrnoException).code = 'ENOENT'
        throw error
      }
      return originalReaddir(path)
    }

    const violations = await validateDirectoryStructure(
      '/project/.dust',
      fileSystem
    )

    expect(violations).toEqual([
      expect.objectContaining({
        file: '/project/.dust/task',
        message: expect.stringContaining('Unexpected directory "task"'),
      }),
    ])
  })

  test('rethrows non-ENOENT errors when reading .dust/config', async () => {
    const fileSystem = createFileSystemEmulator({
      project: {
        '.dust': {
          config: {
            'settings.json': '{}',
          },
        },
      },
    })
    const originalReaddir = fileSystem.readdir
    fileSystem.readdir = async path => {
      if (path === '/project/.dust/config') {
        const error = new Error('Permission denied')
        ;(error as NodeJS.ErrnoException).code = 'EACCES'
        throw error
      }
      return originalReaddir(path)
    }

    await expect(
      validateDirectoryStructure('/project/.dust', fileSystem)
    ).rejects.toThrow('Permission denied')
  })

  test('error message lists allowed directories in sorted order', async () => {
    const fileSystem = createFileSystemEmulator({
      project: {
        '.dust': {
          unknown: { 'file.md': '# File' },
        },
      },
    })

    const violations = await validateDirectoryStructure(
      '/project/.dust',
      fileSystem
    )

    expect(violations.length).toBe(1)
    expect(violations[0].message).toContain(
      'config/, facts/, ideas/, principles/, tasks/, repository.md'
    )
  })
})

describe('lintMarkdown directory structure validation', () => {
  test('reports unexpected directories in .dust/', async () => {
    const context = createContextEmulator()
    const fileSystem = createFileSystemEmulator({
      project: {
        '.dust': {
          principles: {
            'principle.md': `# Principle

This is a principle.

## Parent Principle

- (none)

## Sub-Principles

- (none)
`,
          },
          task: { 'task.md': '# Task' }, // typo: should be "tasks"
        },
      },
    })

    const result = await lintMarkdown(createDependencies(context, fileSystem))

    expect(result.exitCode).toBe(1)
    expect(context.stderrLines.join('\n')).toContain('Unexpected directory')
    expect(context.stderrLines.join('\n')).toContain('task')
  })

  test('reports unexpected root files in .dust/', async () => {
    const context = createContextEmulator()
    const fileSystem = createFileSystemEmulator({
      project: {
        '.dust': {
          principles: {
            'principle.md': `# Principle

This is a principle.

## Parent Principle

- (none)

## Sub-Principles

- (none)
`,
          },
          'README.md': '# Notes',
        },
      },
    })

    const result = await lintMarkdown(createDependencies(context, fileSystem))

    expect(result.exitCode).toBe(1)
    expect(context.stderrLines.join('\n')).toContain('Unexpected file')
    expect(context.stderrLines.join('\n')).toContain('README.md')
    expect(context.stderrLines.join('\n')).toContain(
      'Allowed root paths: config/, facts/, ideas/, principles/, tasks/, repository.md'
    )
  })

  test('reports migration error for .dust/Dockerfile', async () => {
    const context = createContextEmulator()
    const fileSystem = createFileSystemEmulator({
      project: {
        '.dust': {
          Dockerfile: 'FROM node:20',
        },
      },
    })

    const result = await lintMarkdown(createDependencies(context, fileSystem))

    expect(result.exitCode).toBe(1)
    expect(context.stderrLines.join('\n')).toContain(
      '".dust/Dockerfile" is no longer supported'
    )
    expect(context.stderrLines.join('\n')).toContain(
      'Move Docker-related configuration under ".dust/config/".'
    )
  })

  test('reports unexpected entries in .dust/config/', async () => {
    const context = createContextEmulator()
    const fileSystem = createFileSystemEmulator({
      project: {
        '.dust': {
          config: {
            'settings.json': '{}',
            'notes.txt': 'todo',
            examples: {
              'example.md': '# Example',
            },
          },
        },
      },
    })

    const result = await lintMarkdown(createDependencies(context, fileSystem))

    expect(result.exitCode).toBe(1)
    expect(context.stderrLines.join('\n')).toContain(
      'Unexpected file "notes.txt" in .dust/config/'
    )
    expect(context.stderrLines.join('\n')).toContain(
      'Unexpected directory "examples" in .dust/config/'
    )
    expect(context.stderrLines.join('\n')).toContain(
      'Allowed entries: agents/, audits/, hints/, settings.json'
    )
  })

  test('allows known entries in .dust/config/', async () => {
    const context = createContextEmulator()
    const fileSystem = createFileSystemEmulator({
      project: {
        '.dust': {
          principles: {
            'principle.md': `# Principle

This is a principle.

## Parent Principle

- (none)

## Sub-Principles

- (none)
`,
          },
          config: {
            'settings.json': '{}',
            audits: {},
            hints: {},
            agents: {},
          },
        },
      },
    })

    const result = await lintMarkdown(createDependencies(context, fileSystem))

    expect(result.exitCode).toBe(0)
    expect(context.stdoutLines.join('\n')).toContain('All validations passed')
  })

  test('allows extra directories via settings', async () => {
    const context = createContextEmulator()
    const fileSystem = createFileSystemEmulator({
      project: {
        '.dust': {
          principles: {
            'principle.md': `# Principle

This is a principle.

## Parent Principle

- (none)

## Sub-Principles

- (none)
`,
          },
          templates: { 'template.md': '# Template\n\nThis is a template.' },
        },
      },
    })

    const result = await lintMarkdown(
      createDependencies(context, fileSystem, {
        extraDirectories: ['templates'],
      })
    )

    expect(result.exitCode).toBe(0)
    expect(context.stdoutLines.join('\n')).toContain('All validations passed')
  })

  test('outputs directory structure validation step', async () => {
    const context = createContextEmulator()
    const fileSystem = createFileSystemEmulator({
      project: {
        '.dust': {
          principles: {
            'principle.md': `# Principle

This is a principle.

## Parent Principle

- (none)

## Sub-Principles

- (none)
`,
          },
        },
      },
    })

    await lintMarkdown(createDependencies(context, fileSystem))

    expect(context.stdoutLines.join('\n')).toContain(
      'Validating directory structure'
    )
  })
})

describe('lintMarkdown content directory file validation', () => {
  test('reports violations for non-markdown files in content directories', async () => {
    const context = createContextEmulator()
    const fileSystem = createFileSystemEmulator({
      project: {
        '.dust': {
          principles: {
            'principle.md': `# Principle

This is a principle.

## Parent Principle

- (none)

## Sub-Principles

- (none)
`,
          },
          tasks: {
            'my-task.md': `# My Task

Implement the task functionality.

## Principles
## Blocked By
## Definition of Done`,
            README: 'some readme content',
          },
        },
      },
    })

    const result = await lintMarkdown(createDependencies(context, fileSystem))

    expect(result.exitCode).toBe(1)
    expect(context.stderrLines.join('\n')).toContain('Non-markdown file')
    expect(context.stderrLines.join('\n')).toContain('README')
  })

  test('reports violations for hidden files in content directories', async () => {
    const context = createContextEmulator()
    const fileSystem = createFileSystemEmulator({
      project: {
        '.dust': {
          principles: {
            'principle.md': `# Principle

This is a principle.

## Parent Principle

- (none)

## Sub-Principles

- (none)
`,
          },
          ideas: {
            '.DS_Store': '',
          },
        },
      },
    })

    const result = await lintMarkdown(createDependencies(context, fileSystem))

    expect(result.exitCode).toBe(1)
    expect(context.stderrLines.join('\n')).toContain('Hidden file')
    expect(context.stderrLines.join('\n')).toContain('.DS_Store')
  })

  test('reports violations for subdirectories in content directories', async () => {
    const context = createContextEmulator()
    const fileSystem = createFileSystemEmulator({
      project: {
        '.dust': {
          principles: {
            'principle.md': `# Principle

This is a principle.

## Parent Principle

- (none)

## Sub-Principles

- (none)
`,
          },
          tasks: {
            'my-task.md': `# My Task

Implement the task functionality.

## Principles
## Blocked By
## Definition of Done`,
            archived: {
              'old-task.md': '# Old Task',
            },
          },
        },
      },
    })

    const result = await lintMarkdown(createDependencies(context, fileSystem))

    expect(result.exitCode).toBe(1)
    expect(context.stderrLines.join('\n')).toContain('Subdirectory')
    expect(context.stderrLines.join('\n')).toContain('archived')
    expect(context.stderrLines.join('\n')).toContain('should be flat')
  })
})

describe('lintMarkdown idea open questions validation', () => {
  test('passes with valid idea Open Questions section', async () => {
    const context = createContextEmulator()
    const fileSystem = createFileSystemEmulator({
      project: {
        '.dust': {
          ideas: {
            'my-idea.md': `# My Idea

This is an idea.

## Open Questions

### Should we take our own payments?

#### Yes, take our own payments

Lower costs, seller of record.

#### No, use a payment provider

Higher costs, simpler setup.
`,
          },
        },
      },
    })

    const result = await lintMarkdown(createDependencies(context, fileSystem))

    expect(result.exitCode).toBe(0)
    expect(context.stdoutLines.join('\n')).toContain('All validations passed')
  })

  test('passes with idea that has no Open Questions section', async () => {
    const context = createContextEmulator()
    const fileSystem = createFileSystemEmulator({
      project: {
        '.dust': {
          ideas: {
            'simple-idea.md': `# Simple Idea

This is a simple idea without open questions.
`,
          },
        },
      },
    })

    const result = await lintMarkdown(createDependencies(context, fileSystem))

    expect(result.exitCode).toBe(0)
  })

  test('reports violations for malformed Open Questions section', async () => {
    const context = createContextEmulator()
    const fileSystem = createFileSystemEmulator({
      project: {
        '.dust': {
          ideas: {
            'bad-idea.md': `# Bad Idea

This is an idea with bad questions.

## Open Questions

### This is not a question

#### Option A

Some analysis.
`,
          },
        },
      },
    })

    const result = await lintMarkdown(createDependencies(context, fileSystem))

    expect(result.exitCode).toBe(1)
    const output = context.stderrLines.join('\n')
    expect(output).toContain('Questions must end with "?"')
  })

  test('reports violations for questions with no options', async () => {
    const context = createContextEmulator()
    const fileSystem = createFileSystemEmulator({
      project: {
        '.dust': {
          ideas: {
            'no-options.md': `# No Options

This is an idea with a question but no options.

## Open Questions

### Should we take our own payments?
`,
          },
        },
      },
    })

    const result = await lintMarkdown(createDependencies(context, fileSystem))

    expect(result.exitCode).toBe(1)
    const output = context.stderrLines.join('\n')
    expect(output).toContain('no options')
  })

  test('skips idea files that disappear between scan and read (ENOENT)', async () => {
    const context = createContextEmulator()
    const fileSystem = createFileSystemEmulator({
      project: {
        '.dust': {
          ideas: {
            'idea.md': `# Idea

This is an idea.

## Open Questions

### Should we do this?

#### Yes

Good reasons.

#### No

Other reasons.
`,
          },
        },
      },
    })
    const originalReadFile = fileSystem.readFile.bind(fileSystem)
    let ideaReadCount = 0
    fileSystem.readFile = async (path: string) => {
      if (path.includes('/ideas/')) {
        ideaReadCount++
        // Ideas are read 3 times:
        // 1. .dust root links validation
        // 2. content validation
        // 3. idea-specific validation (open questions)
        if (ideaReadCount === 3) {
          const error = new Error('ENOENT: file deleted')
          ;(error as NodeJS.ErrnoException).code = 'ENOENT'
          throw error
        }
      }
      return originalReadFile(path)
    }

    const result = await lintMarkdown(createDependencies(context, fileSystem))
    expect(result.exitCode).toBe(0)
  })

  test('reports non-markdown files in ideas directory as violations', async () => {
    const context = createContextEmulator()
    const fileSystem = createFileSystemEmulator({
      project: {
        '.dust': {
          ideas: {
            'idea.md': `# Idea

This is an idea.
`,
            README: '',
            '.gitkeep': '',
          },
        },
      },
    })

    const result = await lintMarkdown(createDependencies(context, fileSystem))

    expect(result.exitCode).toBe(1)
    expect(context.stderrLines.join('\n')).toContain('Non-markdown file')
    expect(context.stderrLines.join('\n')).toContain('Hidden file')
  })

  test('rethrows non-ENOENT errors when reading idea files during idea validation', async () => {
    const context = createContextEmulator()
    const fileSystem = createFileSystemEmulator({
      project: {
        '.dust': {
          ideas: {
            'idea.md': '# Idea\n\nThis is an idea.',
          },
        },
      },
    })
    const originalReadFile = fileSystem.readFile.bind(fileSystem)
    let ideaReadCount = 0
    fileSystem.readFile = async (path: string) => {
      if (path.includes('/ideas/')) {
        ideaReadCount++
        if (ideaReadCount === 3) {
          throw new Error('Permission denied')
        }
      }
      return originalReadFile(path)
    }

    await expect(
      lintMarkdown(createDependencies(context, fileSystem))
    ).rejects.toThrow('Permission denied')
  })
})

describe('validateIdeaTransitionTitle', () => {
  test('returns null for non-transition task title', () => {
    const content = '# Add User Authentication\n\nImplement auth.'
    const fileSystem = createFileSystemEmulator()
    const violation = validateIdeaTransitionTitle(
      '/project/.dust/tasks/add-user-authentication.md',
      content,
      '/project/.dust/ideas',
      fileSystem
    )
    expect(violation).toBeNull()
  })

  test('returns null when idea file exists for Refine Idea prefix', () => {
    const content = '# Refine Idea: My Great Idea\n\nRefine this idea.'
    const fileSystem = createFileSystemEmulator({
      project: {
        '.dust': {
          ideas: { 'my-great-idea.md': '# My Great Idea\n\nAn idea.' },
        },
      },
    })
    const violation = validateIdeaTransitionTitle(
      '/project/.dust/tasks/refine-idea-my-great-idea.md',
      content,
      '/project/.dust/ideas',
      fileSystem
    )
    expect(violation).toBeNull()
  })

  test('returns null when idea file exists for Decompose Idea prefix', () => {
    const content =
      '# Decompose Idea: My Great Idea\n\nCreate one or more well-defined tasks from this idea.'
    const fileSystem = createFileSystemEmulator({
      project: {
        '.dust': {
          ideas: { 'my-great-idea.md': '# My Great Idea\n\nAn idea.' },
        },
      },
    })
    const violation = validateIdeaTransitionTitle(
      '/project/.dust/tasks/decompose-idea-my-great-idea.md',
      content,
      '/project/.dust/ideas',
      fileSystem
    )
    expect(violation).toBeNull()
  })

  test('returns null when idea file exists for Shelve Idea prefix', () => {
    const content = '# Shelve Idea: My Great Idea\n\nShelve this idea.'
    const fileSystem = createFileSystemEmulator({
      project: {
        '.dust': {
          ideas: { 'my-great-idea.md': '# My Great Idea\n\nAn idea.' },
        },
      },
    })
    const violation = validateIdeaTransitionTitle(
      '/project/.dust/tasks/shelve-idea-my-great-idea.md',
      content,
      '/project/.dust/ideas',
      fileSystem
    )
    expect(violation).toBeNull()
  })

  test('returns violation when referenced idea does not exist', () => {
    const content = '# Refine Idea: Nonexistent Idea\n\nRefine this idea.'
    const fileSystem = createFileSystemEmulator({
      project: {
        '.dust': {
          ideas: {},
        },
      },
    })
    const violation = validateIdeaTransitionTitle(
      '/project/.dust/tasks/refine-idea-nonexistent-idea.md',
      content,
      '/project/.dust/ideas',
      fileSystem
    )
    expect(violation).not.toBeNull()
    expect(violation?.message).toContain('Nonexistent Idea')
    expect(violation?.message).toContain('nonexistent-idea.md')
  })

  test('returns null when content has no title', () => {
    const content = 'No heading in this file.'
    const fileSystem = createFileSystemEmulator()
    const violation = validateIdeaTransitionTitle(
      '/project/.dust/tasks/some-task.md',
      content,
      '/project/.dust/ideas',
      fileSystem
    )
    expect(violation).toBeNull()
  })
})

describe('IDEA_TRANSITION_PREFIXES', () => {
  test('exports the three known prefixes', () => {
    expect(IDEA_TRANSITION_PREFIXES).toEqual([
      'Refine Idea: ',
      'Decompose Idea: ',
      'Shelve Idea: ',
    ])
  })
})

describe('validateWorkflowTaskBodySection', () => {
  test('returns no violations for non-workflow tasks', () => {
    const fileSystem = createFileSystemEmulator({
      project: { '.dust': { ideas: {}, tasks: {} } },
    })
    const content = `# Regular Task

Do something.

## Blocked By

(none)
`
    const violations = validateWorkflowTaskBodySection(
      '/project/.dust/tasks/regular-task.md',
      content,
      '/project/.dust/ideas',
      fileSystem
    )
    expect(violations).toEqual([])
  })

  test('returns no violations for files without a title', () => {
    const fileSystem = createFileSystemEmulator({
      project: { '.dust': { ideas: {}, tasks: {} } },
    })
    const content = 'Just some text without a heading.'
    const violations = validateWorkflowTaskBodySection(
      '/project/.dust/tasks/no-title.md',
      content,
      '/project/.dust/ideas',
      fileSystem
    )
    expect(violations).toEqual([])
  })

  test('returns violation when Refines Idea section is missing', () => {
    const fileSystem = createFileSystemEmulator({
      project: {
        '.dust': {
          ideas: { 'my-idea.md': '# My Idea\n\nDescription.' },
          tasks: {},
        },
      },
    })
    const content = `# Refine Idea: My Idea

Research and refine this idea.

## Blocked By

(none)
`
    const violations = validateWorkflowTaskBodySection(
      '/project/.dust/tasks/refine-idea-my-idea.md',
      content,
      '/project/.dust/ideas',
      fileSystem
    )
    expect(violations).toHaveLength(1)
    expect(violations[0].message).toContain('missing required')
    expect(violations[0].message).toContain('## Refines Idea')
  })

  test('returns violation when Refines Idea section has no links', () => {
    const fileSystem = createFileSystemEmulator({
      project: {
        '.dust': {
          ideas: { 'my-idea.md': '# My Idea\n\nDescription.' },
          tasks: {},
        },
      },
    })
    const content = `# Refine Idea: My Idea

Research and refine this idea.

## Refines Idea

This section has no links.

## Blocked By

(none)
`
    const violations = validateWorkflowTaskBodySection(
      '/project/.dust/tasks/refine-idea-my-idea.md',
      content,
      '/project/.dust/ideas',
      fileSystem
    )
    expect(violations).toHaveLength(1)
    expect(violations[0].message).toContain('contains no link')
  })

  test('returns violation when Refines Idea section has no idea links', () => {
    const fileSystem = createFileSystemEmulator({
      project: {
        '.dust': {
          ideas: { 'my-idea.md': '# My Idea\n\nDescription.' },
          tasks: {},
        },
      },
    })
    const content = `# Refine Idea: My Idea

Research and refine this idea.

## Refines Idea

- [External Link](https://example.com/idea)

## Blocked By

(none)
`
    const violations = validateWorkflowTaskBodySection(
      '/project/.dust/tasks/refine-idea-my-idea.md',
      content,
      '/project/.dust/ideas',
      fileSystem
    )
    expect(violations).toHaveLength(1)
    expect(violations[0].message).toContain('contains no link to an idea file')
  })

  test('returns violation when linked idea file does not exist', () => {
    const fileSystem = createFileSystemEmulator({
      project: {
        '.dust': {
          ideas: {},
          tasks: {},
        },
      },
    })
    const content = `# Refine Idea: My Idea

Research and refine this idea.

## Refines Idea

- [My Idea](../ideas/my-idea.md)

## Blocked By

(none)
`
    const violations = validateWorkflowTaskBodySection(
      '/project/.dust/tasks/refine-idea-my-idea.md',
      content,
      '/project/.dust/ideas',
      fileSystem
    )
    expect(violations).toHaveLength(1)
    expect(violations[0].message).toContain('points to non-existent file')
  })

  test('returns no violations when Refines Idea section links to existing idea', () => {
    const fileSystem = createFileSystemEmulator({
      project: {
        '.dust': {
          ideas: { 'my-idea.md': '# My Idea\n\nDescription.' },
          tasks: {},
        },
      },
    })
    const content = `# Refine Idea: My Idea

Research and refine this idea.

## Refines Idea

- [My Idea](../ideas/my-idea.md)

## Blocked By

(none)
`
    const violations = validateWorkflowTaskBodySection(
      '/project/.dust/tasks/refine-idea-my-idea.md',
      content,
      '/project/.dust/ideas',
      fileSystem
    )
    expect(violations).toEqual([])
  })

  test('returns violation for Decompose Idea task missing section', () => {
    const fileSystem = createFileSystemEmulator({
      project: {
        '.dust': {
          ideas: { 'my-idea.md': '# My Idea\n\nDescription.' },
          tasks: {},
        },
      },
    })
    const content = `# Decompose Idea: My Idea

Create tasks from this idea.

## Blocked By

(none)
`
    const violations = validateWorkflowTaskBodySection(
      '/project/.dust/tasks/decompose-idea-my-idea.md',
      content,
      '/project/.dust/ideas',
      fileSystem
    )
    expect(violations).toHaveLength(1)
    expect(violations[0].message).toContain('## Decomposes Idea')
  })

  test('returns violation for Shelve Idea task missing section', () => {
    const fileSystem = createFileSystemEmulator({
      project: {
        '.dust': {
          ideas: { 'my-idea.md': '# My Idea\n\nDescription.' },
          tasks: {},
        },
      },
    })
    const content = `# Shelve Idea: My Idea

Archive this idea.

## Blocked By

(none)
`
    const violations = validateWorkflowTaskBodySection(
      '/project/.dust/tasks/shelve-idea-my-idea.md',
      content,
      '/project/.dust/ideas',
      fileSystem
    )
    expect(violations).toHaveLength(1)
    expect(violations[0].message).toContain('## Shelves Idea')
  })

  test('section parsing stops at next H1 heading', () => {
    const fileSystem = createFileSystemEmulator({
      project: {
        '.dust': {
          ideas: { 'my-idea.md': '# My Idea\n\nDescription.' },
          tasks: {},
        },
      },
    })
    const content = `# Refine Idea: My Idea

Research and refine this idea.

## Refines Idea

# Another H1 heading interrupts

- [My Idea](../ideas/my-idea.md)

## Blocked By

(none)
`
    const violations = validateWorkflowTaskBodySection(
      '/project/.dust/tasks/refine-idea-my-idea.md',
      content,
      '/project/.dust/ideas',
      fileSystem
    )
    expect(violations).toHaveLength(1)
    expect(violations[0].message).toContain('contains no link')
  })

  test('section parsing stops at next H2 heading', () => {
    const fileSystem = createFileSystemEmulator({
      project: {
        '.dust': {
          ideas: { 'my-idea.md': '# My Idea\n\nDescription.' },
          tasks: {},
        },
      },
    })
    const content = `# Refine Idea: My Idea

Research and refine this idea.

## Refines Idea

## Next Section

- [My Idea](../ideas/my-idea.md)

## Blocked By

(none)
`
    const violations = validateWorkflowTaskBodySection(
      '/project/.dust/tasks/refine-idea-my-idea.md',
      content,
      '/project/.dust/ideas',
      fileSystem
    )
    expect(violations).toHaveLength(1)
    expect(violations[0].message).toContain('contains no link')
  })

  test('ignores idea links without .md extension in filename', () => {
    const fileSystem = createFileSystemEmulator({
      project: {
        '.dust': {
          ideas: { 'my-idea.md': '# My Idea\n\nDescription.' },
          tasks: {},
        },
      },
    })
    const content = `# Refine Idea: My Idea

Research and refine this idea.

## Refines Idea

- [My Idea](../ideas/my-idea)
- [Other Idea](../ideas/other-idea.md)

## Blocked By

(none)
`
    const violations = validateWorkflowTaskBodySection(
      '/project/.dust/tasks/refine-idea-my-idea.md',
      content,
      '/project/.dust/ideas',
      fileSystem
    )
    expect(violations).toHaveLength(1)
    expect(violations[0].message).toContain('other-idea.md')
  })
})

describe('lintMarkdown idea transition validation', () => {
  test('passes when transition task references existing idea', async () => {
    const context = createContextEmulator()
    const fileSystem = createFileSystemEmulator({
      project: {
        '.dust': {
          ideas: {
            'my-idea.md': '# My Idea\n\nThis is an idea.',
          },
          tasks: {
            'refine-idea-my-idea.md': `# Refine Idea: My Idea

Refine this idea.

## Refines Idea

- [My Idea](../ideas/my-idea.md)

## Principles
## Blocked By
## Definition of Done`,
          },
        },
      },
    })

    const result = await lintMarkdown(createDependencies(context, fileSystem))
    expect(result.exitCode).toBe(0)
  })

  test('reports violation when transition task references non-existent idea', async () => {
    const context = createContextEmulator()
    const fileSystem = createFileSystemEmulator({
      project: {
        '.dust': {
          ideas: {},
          tasks: {
            'refine-idea-missing-idea.md': `# Refine Idea: Missing Idea

Refine this idea.

## Refines Idea

- [Missing Idea](../ideas/missing-idea.md)

## Principles
## Blocked By
## Definition of Done`,
          },
        },
      },
    })

    const result = await lintMarkdown(createDependencies(context, fileSystem))
    expect(result.exitCode).toBe(1)
    const output = context.stderrLines.join('\n')
    expect(output).toContain('Missing Idea')
    expect(output).toContain('missing-idea.md')
  })
})

describe('lintMarkdown principle hierarchy validation', () => {
  test('passes with valid principle hierarchy', async () => {
    const context = createContextEmulator()
    const fileSystem = createFileSystemEmulator({
      project: {
        '.dust': {
          principles: {
            'parent-principle.md': `# Parent Principle

This is the parent principle.

## Parent Principle

- (none)

## Sub-Principles

- [Child](child-principle.md)
`,
            'child-principle.md': `# Child Principle

This is the child principle.

## Parent Principle

- [Parent](parent-principle.md)

## Sub-Principles

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

  test('reports missing hierarchy sections in principle files', async () => {
    const context = createContextEmulator()
    const fileSystem = createFileSystemEmulator({
      project: {
        '.dust': {
          principles: {
            'principle.md': `# Principle

This is a principle without hierarchy sections.
`,
          },
        },
      },
    })

    const result = await lintMarkdown(createDependencies(context, fileSystem))

    expect(result.exitCode).toBe(1)
    const output = context.stderrLines.join('\n')
    expect(output).toContain('## Parent Principle')
    expect(output).toContain('## Sub-Principles')
  })

  test('reports bidirectional link violations', async () => {
    const context = createContextEmulator()
    const fileSystem = createFileSystemEmulator({
      project: {
        '.dust': {
          principles: {
            'parent.md': `# Parent Principle

This is the parent principle.

## Parent Principle

- (none)

## Sub-Principles

- (none)
`,
            'child.md': `# Child Principle

This is the child principle.

## Parent Principle

- [Parent](parent.md)

## Sub-Principles

- (none)
`,
          },
        },
      },
    })

    const result = await lintMarkdown(createDependencies(context, fileSystem))

    expect(result.exitCode).toBe(1)
    const output = context.stderrLines.join('\n')
    expect(output).toContain('does not list this principle as a sub-principle')
  })

  test('reports cycle in principle hierarchy', async () => {
    const context = createContextEmulator()
    const fileSystem = createFileSystemEmulator({
      project: {
        '.dust': {
          principles: {
            'a.md': `# Principle A

This is principle A.

## Parent Principle

- [Principle B](b.md)

## Sub-Principles

- (none)
`,
            'b.md': `# Principle B

This is principle B.

## Parent Principle

- [Principle A](a.md)

## Sub-Principles

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
          principles: {
            'principle.md': `# Principle

This is a principle.

## Parent Principle

- [Task](../tasks/task.md)

## Sub-Principles

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
    expect(output).toContain('## Parent Principle')
    expect(output).toContain('principle file')
  })

  test('reports non-markdown files in principles directory as violations', async () => {
    const context = createContextEmulator()
    const fileSystem = createFileSystemEmulator({
      project: {
        '.dust': {
          principles: {
            'principle.md': `# Principle

This is a principle.

## Parent Principle

- (none)

## Sub-Principles

- (none)
`,
            README: '',
            '.gitkeep': '',
          },
        },
      },
    })

    const result = await lintMarkdown(createDependencies(context, fileSystem))

    expect(result.exitCode).toBe(1)
    expect(context.stderrLines.join('\n')).toContain('Non-markdown file')
    expect(context.stderrLines.join('\n')).toContain('Hidden file')
  })

  test('rethrows non-ENOENT errors when reading files in .dust root', async () => {
    const context = createContextEmulator()
    const fileSystem = createFileSystemEmulator({
      project: {
        '.dust': {
          'readme.md': '# Readme',
        },
      },
    })
    const originalReadFile = fileSystem.readFile.bind(fileSystem)
    fileSystem.readFile = async (path: string) => {
      if (path.endsWith('.md')) {
        throw new Error('Permission denied')
      }
      return originalReadFile(path)
    }

    await expect(
      lintMarkdown(createDependencies(context, fileSystem))
    ).rejects.toThrow('Permission denied')
  })

  test('skips files that disappear in .dust root (ENOENT)', async () => {
    const context = createContextEmulator()
    const fileSystem = createFileSystemEmulator({
      project: {
        '.dust': {
          facts: {
            'readme.md': '# Readme',
          },
        },
      },
    })
    const originalReadFile = fileSystem.readFile.bind(fileSystem)
    fileSystem.readFile = async (path: string) => {
      if (path.endsWith('.md') && path.includes('.dust')) {
        const error = new Error('ENOENT: file deleted')
        ;(error as NodeJS.ErrnoException).code = 'ENOENT'
        throw error
      }
      return originalReadFile(path)
    }

    const result = await lintMarkdown(createDependencies(context, fileSystem))
    expect(result.exitCode).toBe(0)
  })

  test('rethrows non-ENOENT errors when reading content files in subdirs', async () => {
    const context = createContextEmulator()
    const fileSystem = createFileSystemEmulator({
      project: {
        '.dust': {
          ideas: {
            'idea.md': '# Idea',
          },
        },
      },
    })
    const originalReadFile = fileSystem.readFile.bind(fileSystem)
    let ideaReadCount = 0
    fileSystem.readFile = async (path: string) => {
      if (path.includes('/ideas/')) {
        ideaReadCount++
        // Ideas are read at:
        // 1. Line 544: .dust root links validation
        // 2. Line 568: content validation
        // Throw on the 2nd read (content validation) to hit line 574
        if (ideaReadCount === 2) {
          throw new Error('Permission denied')
        }
      }
      return originalReadFile(path)
    }

    await expect(
      lintMarkdown(createDependencies(context, fileSystem))
    ).rejects.toThrow('Permission denied')
  })

  test('skips content files that disappear between scan and read (ENOENT)', async () => {
    const context = createContextEmulator()
    const fileSystem = createFileSystemEmulator({
      project: {
        '.dust': {
          ideas: {
            'idea.md': '# Idea\n\nThis is an idea.',
          },
        },
      },
    })
    const originalReadFile = fileSystem.readFile.bind(fileSystem)
    let ideaReadCount = 0
    fileSystem.readFile = async (path: string) => {
      if (path.includes('/ideas/')) {
        ideaReadCount++
        // Throw ENOENT on the 2nd read (content validation) to hit lines 571-572
        if (ideaReadCount === 2) {
          const error = new Error('ENOENT: file deleted')
          ;(error as NodeJS.ErrnoException).code = 'ENOENT'
          throw error
        }
      }
      return originalReadFile(path)
    }

    const result = await lintMarkdown(createDependencies(context, fileSystem))
    expect(result.exitCode).toBe(0)
  })

  test('rethrows non-ENOENT errors when scanning directories', async () => {
    const context = createContextEmulator()
    const fileSystem = createFileSystemEmulator({
      project: {
        '.dust': {
          principles: {},
        },
      },
    })
    // Make the scan function throw a non-ENOENT error
    // biome-ignore lint/correctness/useYield: Intentionally throwing before yielding to test error handling
    fileSystem.scan = async function* () {
      throw new Error('Permission denied')
    }

    await expect(
      lintMarkdown(createDependencies(context, fileSystem))
    ).rejects.toThrow('Permission denied')
  })

  test('rethrows non-ENOENT errors when reading task files during task validation', async () => {
    const context = createContextEmulator()
    const fileSystem = createFileSystemEmulator({
      project: {
        '.dust': {
          tasks: {
            'task.md': '# Task',
          },
        },
      },
    })
    const originalReadFile = fileSystem.readFile.bind(fileSystem)
    let taskReadCount = 0
    fileSystem.readFile = async (path: string) => {
      if (path.includes('/tasks/')) {
        taskReadCount++
        // Task files are read 3 times:
        // 1. Line 544: .dust root links validation
        // 2. Line 568: content validation
        // 3. Line 615: task-specific validation
        // We want to throw non-ENOENT on the 3rd read to test line 621
        if (taskReadCount === 3) {
          throw new Error('Permission denied')
        }
      }
      return originalReadFile(path)
    }

    await expect(
      lintMarkdown(createDependencies(context, fileSystem))
    ).rejects.toThrow('Permission denied')
  })

  test('rethrows non-ENOENT errors when reading principle files during principle hierarchy validation', async () => {
    const context = createContextEmulator()
    const fileSystem = createFileSystemEmulator({
      project: {
        '.dust': {
          principles: {
            'principle.md':
              '# Principle\n\nThis is a principle.\n\n## Parent Principle\n\n## Sub-Principles\n',
          },
        },
      },
    })
    const originalReadFile = fileSystem.readFile.bind(fileSystem)
    let principleReadCount = 0
    fileSystem.readFile = async (path: string) => {
      if (path.includes('/principles/')) {
        principleReadCount++
        // Principle files are read 3 times:
        // 1. Line 544: .dust root links validation
        // 2. Line 568: content validation
        // 3. Line 648: principle hierarchy validation
        // We want to throw non-ENOENT on the 3rd read to test line 654
        if (principleReadCount === 3) {
          throw new Error('Permission denied')
        }
      }
      return originalReadFile(path)
    }

    await expect(
      lintMarkdown(createDependencies(context, fileSystem))
    ).rejects.toThrow('Permission denied')
  })

  test('skips task files that disappear between scan and task-specific validation (ENOENT)', async () => {
    const context = createContextEmulator()
    const fileSystem = createFileSystemEmulator({
      project: {
        '.dust': {
          tasks: {
            'task.md': `# Task

Implement the task functionality.

## Principles
## Blocked By
## Definition of Done`,
          },
        },
      },
    })
    const originalReadFile = fileSystem.readFile.bind(fileSystem)
    let taskReadCount = 0
    fileSystem.readFile = async (path: string) => {
      if (path.includes('/tasks/')) {
        taskReadCount++
        // Task files are read 3 times:
        // 1. Line 544: .dust root links validation
        // 2. Line 568: content validation
        // 3. Line 615: task-specific validation
        // We want to throw ENOENT on the 3rd read to test line 618-619
        if (taskReadCount === 3) {
          const error = new Error('ENOENT: file deleted')
          ;(error as NodeJS.ErrnoException).code = 'ENOENT'
          throw error
        }
      }
      return originalReadFile(path)
    }

    const result = await lintMarkdown(createDependencies(context, fileSystem))
    // Should complete without error (file gracefully skipped)
    expect(result.exitCode).toBe(0)
  })

  test('skips principle files that disappear between scan and hierarchy validation (ENOENT)', async () => {
    const context = createContextEmulator()
    const fileSystem = createFileSystemEmulator({
      project: {
        '.dust': {
          principles: {
            'principle.md':
              '# Principle\n\nThis is a principle.\n\n## Parent Principle\n\n## Sub-Principles\n',
          },
        },
      },
    })
    const originalReadFile = fileSystem.readFile.bind(fileSystem)
    let principleReadCount = 0
    fileSystem.readFile = async (path: string) => {
      if (path.includes('/principles/')) {
        principleReadCount++
        // Principle files are read 3 times:
        // 1. Line 544: .dust root links validation
        // 2. Line 568: content validation
        // 3. Line 648: principle hierarchy validation
        // We want to throw ENOENT on the 3rd read to test line 651-652
        if (principleReadCount === 3) {
          const error = new Error('ENOENT: file deleted')
          ;(error as NodeJS.ErrnoException).code = 'ENOENT'
          throw error
        }
      }
      return originalReadFile(path)
    }

    const result = await lintMarkdown(createDependencies(context, fileSystem))
    // Should complete without error (file gracefully skipped)
    expect(result.exitCode).toBe(0)
  })
})

describe('lintMarkdown settings.json validation', () => {
  test('passes with valid settings.json', async () => {
    const context = createContextEmulator()
    const fileSystem = createFileSystemEmulator({
      project: {
        '.dust': {
          principles: {
            'principle.md': `# Principle

This is a principle.

## Parent Principle

- (none)

## Sub-Principles

- (none)
`,
          },
          config: {
            'settings.json': JSON.stringify({
              dustCommand: 'bin/dust',
              checks: [{ name: 'lint', command: 'npm run lint' }],
            }),
          },
        },
      },
    })

    const result = await lintMarkdown(createDependencies(context, fileSystem))

    expect(result.exitCode).toBe(0)
    expect(context.stdoutLines.join('\n')).toContain('Validating settings.json')
  })

  test('reports invalid JSON in settings.json', async () => {
    const context = createContextEmulator()
    const fileSystem = createFileSystemEmulator({
      project: {
        '.dust': {
          principles: {
            'principle.md': `# Principle

This is a principle.

## Parent Principle

- (none)

## Sub-Principles

- (none)
`,
          },
          config: {
            'settings.json': 'not valid json',
          },
        },
      },
    })

    const result = await lintMarkdown(createDependencies(context, fileSystem))

    expect(result.exitCode).toBe(1)
    const output = context.stderrLines.join('\n')
    expect(output).toContain('Invalid JSON')
    expect(output).toContain('settings.json')
  })

  test('reports unknown keys in settings.json', async () => {
    const context = createContextEmulator()
    const fileSystem = createFileSystemEmulator({
      project: {
        '.dust': {
          principles: {
            'principle.md': `# Principle

This is a principle.

## Parent Principle

- (none)

## Sub-Principles

- (none)
`,
          },
          config: {
            'settings.json': JSON.stringify({
              check: [{ name: 'lint', command: 'npm run lint' }],
            }),
          },
        },
      },
    })

    const result = await lintMarkdown(createDependencies(context, fileSystem))

    expect(result.exitCode).toBe(1)
    const output = context.stderrLines.join('\n')
    expect(output).toContain('Unknown key "check"')
  })

  test('reports invalid checks entries in settings.json', async () => {
    const context = createContextEmulator()
    const fileSystem = createFileSystemEmulator({
      project: {
        '.dust': {
          principles: {
            'principle.md': `# Principle

This is a principle.

## Parent Principle

- (none)

## Sub-Principles

- (none)
`,
          },
          config: {
            'settings.json': JSON.stringify({
              checks: [{ wrongField: 'value' }],
            }),
          },
        },
      },
    })

    const result = await lintMarkdown(createDependencies(context, fileSystem))

    expect(result.exitCode).toBe(1)
    const output = context.stderrLines.join('\n')
    expect(output).toContain('missing required field "name"')
    expect(output).toContain('missing required field "command"')
  })

  test('reports all settings.json violations at once', async () => {
    const context = createContextEmulator()
    const fileSystem = createFileSystemEmulator({
      project: {
        '.dust': {
          principles: {
            'principle.md': `# Principle

This is a principle.

## Parent Principle

- (none)

## Sub-Principles

- (none)
`,
          },
          config: {
            'settings.json': JSON.stringify({
              unknownKey: 'value',
              dustCommand: 123,
              checks: [{ name: 'lint' }],
            }),
          },
        },
      },
    })

    const result = await lintMarkdown(createDependencies(context, fileSystem))

    expect(result.exitCode).toBe(1)
    const output = context.stderrLines.join('\n')
    expect(output).toContain('Unknown key "unknownKey"')
    expect(output).toContain('"dustCommand" must be a string')
    expect(output).toContain('missing required field "command"')
  })

  test('skips settings.json validation when file does not exist', async () => {
    const context = createContextEmulator()
    const fileSystem = createFileSystemEmulator({
      project: {
        '.dust': {
          principles: {
            'principle.md': `# Principle

This is a principle.

## Parent Principle

- (none)

## Sub-Principles

- (none)
`,
          },
        },
      },
    })

    const result = await lintMarkdown(createDependencies(context, fileSystem))

    expect(result.exitCode).toBe(0)
    expect(context.stdoutLines.join('\n')).not.toContain(
      'Validating settings.json'
    )
  })

  test('skips settings.json that disappears between exists check and read (ENOENT)', async () => {
    const context = createContextEmulator()
    const fileSystem = createFileSystemEmulator({
      project: {
        '.dust': {
          principles: {
            'principle.md': `# Principle

This is a principle.

## Parent Principle

- (none)

## Sub-Principles

- (none)
`,
          },
          config: {
            'settings.json': '{}',
          },
        },
      },
    })
    const originalReadFile = fileSystem.readFile.bind(fileSystem)
    fileSystem.readFile = async (path: string) => {
      if (path.includes('settings.json')) {
        const error = new Error('ENOENT: file deleted')
        ;(error as NodeJS.ErrnoException).code = 'ENOENT'
        throw error
      }
      return originalReadFile(path)
    }

    const result = await lintMarkdown(createDependencies(context, fileSystem))
    expect(result.exitCode).toBe(0)
  })

  test('rethrows non-ENOENT errors when reading settings.json', async () => {
    const context = createContextEmulator()
    const fileSystem = createFileSystemEmulator({
      project: {
        '.dust': {
          principles: {
            'principle.md': `# Principle

This is a principle.

## Parent Principle

- (none)

## Sub-Principles

- (none)
`,
          },
          config: {
            'settings.json': '{}',
          },
        },
      },
    })
    const originalReadFile = fileSystem.readFile.bind(fileSystem)
    fileSystem.readFile = async (path: string) => {
      if (path.includes('settings.json')) {
        throw new Error('Permission denied')
      }
      return originalReadFile(path)
    }

    await expect(
      lintMarkdown(createDependencies(context, fileSystem))
    ).rejects.toThrow('Permission denied')
  })
})

describe('validateWorkflowTaskBodySection', () => {
  test('returns no violations for non-workflow tasks', () => {
    const fileSystem = createFileSystemEmulator({
      project: { '.dust': { ideas: {}, tasks: {} } },
    })
    const content = `# Regular Task

Do something.

## Blocked By
## Definition of Done`
    const violations = validateWorkflowTaskBodySection(
      '/project/.dust/tasks/regular-task.md',
      content,
      '/project/.dust/ideas',
      fileSystem
    )
    expect(violations).toEqual([])
  })

  test('reports missing Refines Idea section', () => {
    const fileSystem = createFileSystemEmulator({
      project: {
        '.dust': {
          ideas: { 'my-idea.md': '# My Idea\n\nDescription.' },
          tasks: {},
        },
      },
    })
    const content = `# Refine Idea: My Idea

Refine this idea.

## Blocked By
## Definition of Done`
    const violations = validateWorkflowTaskBodySection(
      '/project/.dust/tasks/refine-idea-my-idea.md',
      content,
      '/project/.dust/ideas',
      fileSystem
    )
    expect(violations).toHaveLength(1)
    expect(violations[0].message).toContain(
      'missing required "## Refines Idea" section'
    )
  })

  test('reports missing Decomposes Idea section', () => {
    const fileSystem = createFileSystemEmulator({
      project: {
        '.dust': {
          ideas: { 'my-idea.md': '# My Idea\n\nDescription.' },
          tasks: {},
        },
      },
    })
    const content = `# Decompose Idea: My Idea

Create tasks from this idea.

## Blocked By
## Definition of Done`
    const violations = validateWorkflowTaskBodySection(
      '/project/.dust/tasks/decompose-idea-my-idea.md',
      content,
      '/project/.dust/ideas',
      fileSystem
    )
    expect(violations).toHaveLength(1)
    expect(violations[0].message).toContain(
      'missing required "## Decomposes Idea" section'
    )
  })

  test('reports missing Shelves Idea section', () => {
    const fileSystem = createFileSystemEmulator({
      project: {
        '.dust': {
          ideas: { 'my-idea.md': '# My Idea\n\nDescription.' },
          tasks: {},
        },
      },
    })
    const content = `# Shelve Idea: My Idea

Archive this idea.

## Blocked By
## Definition of Done`
    const violations = validateWorkflowTaskBodySection(
      '/project/.dust/tasks/shelve-idea-my-idea.md',
      content,
      '/project/.dust/ideas',
      fileSystem
    )
    expect(violations).toHaveLength(1)
    expect(violations[0].message).toContain(
      'missing required "## Shelves Idea" section'
    )
  })

  test('reports empty body section with no links', () => {
    const fileSystem = createFileSystemEmulator({
      project: {
        '.dust': {
          ideas: { 'my-idea.md': '# My Idea\n\nDescription.' },
          tasks: {},
        },
      },
    })
    const content = `# Refine Idea: My Idea

Refine this idea.

## Refines Idea

No links here.

## Blocked By
## Definition of Done`
    const violations = validateWorkflowTaskBodySection(
      '/project/.dust/tasks/refine-idea-my-idea.md',
      content,
      '/project/.dust/ideas',
      fileSystem
    )
    expect(violations).toHaveLength(1)
    expect(violations[0].message).toContain('contains no link')
  })

  test('reports section with only non-idea links', () => {
    const fileSystem = createFileSystemEmulator({
      project: {
        '.dust': {
          ideas: { 'my-idea.md': '# My Idea\n\nDescription.' },
          tasks: {},
        },
      },
    })
    const content = `# Refine Idea: My Idea

Refine this idea.

## Refines Idea

- [External](https://example.com)

## Blocked By
## Definition of Done`
    const violations = validateWorkflowTaskBodySection(
      '/project/.dust/tasks/refine-idea-my-idea.md',
      content,
      '/project/.dust/ideas',
      fileSystem
    )
    expect(violations).toHaveLength(1)
    expect(violations[0].message).toContain('contains no link to an idea file')
  })

  test('reports link to non-existent idea file', () => {
    const fileSystem = createFileSystemEmulator({
      project: {
        '.dust': {
          ideas: {},
          tasks: {},
        },
      },
    })
    const content = `# Refine Idea: My Idea

Refine this idea.

## Refines Idea

- [My Idea](../ideas/my-idea.md)

## Blocked By
## Definition of Done`
    const violations = validateWorkflowTaskBodySection(
      '/project/.dust/tasks/refine-idea-my-idea.md',
      content,
      '/project/.dust/ideas',
      fileSystem
    )
    expect(violations).toHaveLength(1)
    expect(violations[0].message).toContain('points to non-existent file')
    expect(violations[0].message).toContain('my-idea.md')
  })

  test('passes with valid body section linking to existing idea', () => {
    const fileSystem = createFileSystemEmulator({
      project: {
        '.dust': {
          ideas: { 'my-idea.md': '# My Idea\n\nDescription.' },
          tasks: {},
        },
      },
    })
    const content = `# Refine Idea: My Idea

Refine this idea.

## Refines Idea

- [My Idea](../ideas/my-idea.md)

## Blocked By
## Definition of Done`
    const violations = validateWorkflowTaskBodySection(
      '/project/.dust/tasks/refine-idea-my-idea.md',
      content,
      '/project/.dust/ideas',
      fileSystem
    )
    expect(violations).toEqual([])
  })

  test('returns no violations when file has no title', () => {
    const fileSystem = createFileSystemEmulator({
      project: { '.dust': { ideas: {}, tasks: {} } },
    })
    const content = 'Just some content without a title.'
    const violations = validateWorkflowTaskBodySection(
      '/project/.dust/tasks/some-file.md',
      content,
      '/project/.dust/ideas',
      fileSystem
    )
    expect(violations).toEqual([])
  })

  test('stops parsing section at H1 heading', () => {
    const fileSystem = createFileSystemEmulator({
      project: {
        '.dust': {
          ideas: { 'my-idea.md': '# My Idea\n\nDescription.' },
          tasks: {},
        },
      },
    })
    const content = `# Refine Idea: My Idea

Refine this idea.

## Refines Idea

# Another H1

- [My Idea](../ideas/my-idea.md)

## Blocked By`
    const violations = validateWorkflowTaskBodySection(
      '/project/.dust/tasks/refine-idea-my-idea.md',
      content,
      '/project/.dust/ideas',
      fileSystem
    )
    expect(violations).toHaveLength(1)
    expect(violations[0].message).toContain('contains no link')
  })

  test('ignores idea links without .md extension', () => {
    const fileSystem = createFileSystemEmulator({
      project: {
        '.dust': {
          ideas: { 'my-idea.md': '# My Idea\n\nDescription.' },
          tasks: {},
        },
      },
    })
    const content = `# Refine Idea: My Idea

Refine this idea.

## Refines Idea

- [My Idea](../ideas/my-idea)
- [My Idea](../ideas/my-idea.md)

## Blocked By`
    const violations = validateWorkflowTaskBodySection(
      '/project/.dust/tasks/refine-idea-my-idea.md',
      content,
      '/project/.dust/ideas',
      fileSystem
    )
    expect(violations).toEqual([])
  })
})
