import { describe, expect, test } from 'vitest'
import { createFileSystemEmulator, lintTaskFile } from '../test/test-utilities'
import {
  CAPTURE_IDEA_PREFIX,
  createIdeaTask,
  createRefineIdeaTask,
  createShelveIdeaTask,
  decomposeIdea,
  EXPEDITE_IDEA_PREFIX,
  findAllWorkflowTasks,
  findWorkflowTaskForIdea,
  IDEA_TRANSITION_PREFIXES,
  type OpenQuestionResponse,
  parseCaptureIdeaTask,
  titleToFilename,
} from './workflow-tasks'

describe('IDEA_TRANSITION_PREFIXES', () => {
  test('contains all three transition prefixes', () => {
    expect(IDEA_TRANSITION_PREFIXES).toEqual([
      'Refine Idea: ',
      'Decompose Idea: ',
      'Shelve Idea: ',
    ])
  })
})

describe('titleToFilename', () => {
  test('converts titles to kebab-case filenames', () => {
    expect(titleToFilename('Refine Idea: My Great Idea')).toBe(
      'refine-idea-my-great-idea.md'
    )
  })
})

function createFileSystem() {
  return createFileSystemEmulator({
    project: {
      '.dust': {
        ideas: {
          'progress-broadcasting.md':
            '# Progress Broadcasting\n\nA great idea.',
        },
        tasks: {},
      },
    },
  })
}

describe('createRefineIdeaTask', () => {
  test('creates a refine-idea task with auto-filled defaults', async () => {
    const fileSystem = createFileSystem()
    const result = await createRefineIdeaTask(
      fileSystem,
      '/project/.dust',
      'progress-broadcasting'
    )

    expect(result.filePath).toBe(
      '/project/.dust/tasks/refine-idea-progress-broadcasting.md'
    )
    const content = fileSystem.writtenFiles.get(result.filePath) as string
    expect(content).toContain('# Refine Idea: Progress Broadcasting')
    expect(content).toContain(
      'Run `dust principles` for alignment and `dust facts` for relevant design decisions.'
    )
    expect(content).toContain(
      'See [Progress Broadcasting](../ideas/progress-broadcasting.md).'
    )
    expect(content).toContain(
      'If you add open questions, use `## Open Questions` with `### Question?` headings and one or more `#### Option` headings beneath each question, and only add questions that are meaningful decisions worth asking.'
    )
    expect(content).toContain('## Blocked By\n\n(none)')
    expect(content).toContain(
      '- [ ] Idea is thoroughly researched with relevant codebase context'
    )
    expect(content).toContain(
      '- [ ] Open questions are added for any ambiguous or underspecified aspects'
    )
    expect(content).toContain(
      '- [ ] Open questions follow the required heading format and focus on high-value decisions'
    )
    expect(content).toContain('- [ ] Idea file is updated with findings')
  })

  test('includes optional description as a new paragraph', async () => {
    const fileSystem = createFileSystem()
    const result = await createRefineIdeaTask(
      fileSystem,
      '/project/.dust',
      'progress-broadcasting',
      'Focus on the WebSocket approach.'
    )

    const content = fileSystem.writtenFiles.get(result.filePath) as string
    expect(content).toContain(
      'Run `dust principles` for alignment and `dust facts` for relevant design decisions. See [Progress Broadcasting](../ideas/progress-broadcasting.md). If you add open questions, use `## Open Questions` with `### Question?` headings and one or more `#### Option` headings beneath each question, and only add questions that are meaningful decisions worth asking.\n\nFocus on the WebSocket approach.'
    )
  })

  test('uses custom dustCommand in template', async () => {
    const fileSystem = createFileSystem()
    const result = await createRefineIdeaTask(
      fileSystem,
      '/project/.dust',
      'progress-broadcasting',
      undefined,
      'bin/dust'
    )

    const content = fileSystem.writtenFiles.get(result.filePath) as string
    expect(content).toContain('Run `bin/dust principles` for alignment')
    expect(content).toContain('`bin/dust facts` for relevant design decisions')
  })

  test('includes Refines Idea section with link to target idea', async () => {
    const fileSystem = createFileSystem()
    const result = await createRefineIdeaTask(
      fileSystem,
      '/project/.dust',
      'progress-broadcasting'
    )

    const content = fileSystem.writtenFiles.get(result.filePath) as string
    expect(content).toContain('## Refines Idea')
    expect(content).toContain(
      '- [Progress Broadcasting](../ideas/progress-broadcasting.md)'
    )
  })

  test('appends workflow hint when refine.md hint file exists', async () => {
    const fileSystem = createFileSystemEmulator({
      project: {
        '.dust': {
          ideas: {
            'progress-broadcasting.md':
              '# Progress Broadcasting\n\nA great idea.',
          },
          tasks: {},
          config: {
            'workflow-hints': {
              'refine.md': 'Focus on edge cases and error handling.',
            },
          },
        },
      },
    })
    const result = await createRefineIdeaTask(
      fileSystem,
      '/project/.dust',
      'progress-broadcasting'
    )

    const content = fileSystem.writtenFiles.get(result.filePath) as string
    expect(content).toContain('Focus on edge cases and error handling.')
    expect(content).toContain(
      'only add questions that are meaningful decisions worth asking.\n\nFocus on edge cases and error handling.'
    )
  })

  test('generates task without hint when refine.md does not exist', async () => {
    const fileSystem = createFileSystem()
    const result = await createRefineIdeaTask(
      fileSystem,
      '/project/.dust',
      'progress-broadcasting'
    )

    const content = fileSystem.writtenFiles.get(result.filePath) as string
    expect(content).toContain('# Refine Idea: Progress Broadcasting')
    expect(content).not.toContain('Focus on edge cases')
  })
})

describe('decomposeIdea', () => {
  test('creates a task-from-idea task with auto-filled defaults', async () => {
    const fileSystem = createFileSystem()
    const result = await decomposeIdea(fileSystem, '/project/.dust', {
      ideaSlug: 'progress-broadcasting',
    })

    expect(result.filePath).toBe(
      '/project/.dust/tasks/decompose-idea-progress-broadcasting.md'
    )
    const content = fileSystem.writtenFiles.get(result.filePath) as string
    expect(content).toContain('# Decompose Idea: Progress Broadcasting')
    expect(content).toContain(
      'Run `dust principles` to link relevant principles and `dust facts` for design decisions that should inform the task.'
    )
    expect(content).toContain(
      'See [Progress Broadcasting](../ideas/progress-broadcasting.md).'
    )
    expect(content).toContain(
      '- [ ] One or more new tasks are created in .dust/tasks/'
    )
    expect(content).toContain(
      "- [ ] Task's Principles section links to relevant principles from .dust/principles/"
    )
    expect(content).toContain(
      '- [ ] The original idea is deleted or updated to reflect remaining scope'
    )
  })

  test('uses custom dustCommand in template', async () => {
    const fileSystem = createFileSystem()
    const result = await decomposeIdea(
      fileSystem,
      '/project/.dust',
      {
        ideaSlug: 'progress-broadcasting',
      },
      'bin/dust'
    )

    const content = fileSystem.writtenFiles.get(result.filePath) as string
    expect(content).toContain(
      'Run `bin/dust principles` to link relevant principles'
    )
    expect(content).toContain('`bin/dust facts` for design decisions')
  })

  test('includes open question responses as a Resolved Questions section', async () => {
    const fileSystem = createFileSystem()
    const responses: OpenQuestionResponse[] = [
      {
        question: 'Should we use WebSockets?',
        chosenOption: 'Yes',
      },
      {
        question: 'How should errors be handled?',
        chosenOption: 'Retry automatically',
      },
    ]
    const result = await decomposeIdea(fileSystem, '/project/.dust', {
      ideaSlug: 'progress-broadcasting',
      openQuestionResponses: responses,
    })

    const content = fileSystem.writtenFiles.get(result.filePath) as string
    expect(content).toContain('## Resolved Questions')
    expect(content).toContain('### Should we use WebSockets?')
    expect(content).toContain('**Decision:** Yes')
    expect(content).toContain('### How should errors be handled?')
    expect(content).toContain('**Decision:** Retry automatically')
  })

  test('includes both description and open question responses', async () => {
    const fileSystem = createFileSystem()
    const result = await decomposeIdea(fileSystem, '/project/.dust', {
      ideaSlug: 'progress-broadcasting',
      description: 'Focus on real-time updates.',
      openQuestionResponses: [
        { question: 'Which protocol?', chosenOption: 'WebSockets' },
      ],
    })

    const content = fileSystem.writtenFiles.get(result.filePath) as string
    expect(content).toContain('Focus on real-time updates.')
    expect(content).toContain('## Resolved Questions')
    expect(content).toContain('**Decision:** WebSockets')
  })

  test('omits Resolved Questions section when no responses provided', async () => {
    const fileSystem = createFileSystem()
    const result = await decomposeIdea(fileSystem, '/project/.dust', {
      ideaSlug: 'progress-broadcasting',
    })

    const content = fileSystem.writtenFiles.get(result.filePath) as string
    expect(content).not.toContain('## Resolved Questions')
  })

  test('omits Resolved Questions section when responses array is empty', async () => {
    const fileSystem = createFileSystem()
    const result = await decomposeIdea(fileSystem, '/project/.dust', {
      ideaSlug: 'progress-broadcasting',
      openQuestionResponses: [],
    })

    const content = fileSystem.writtenFiles.get(result.filePath) as string
    expect(content).not.toContain('## Resolved Questions')
  })

  test('includes Decomposes Idea section with link to target idea', async () => {
    const fileSystem = createFileSystem()
    const result = await decomposeIdea(fileSystem, '/project/.dust', {
      ideaSlug: 'progress-broadcasting',
    })

    const content = fileSystem.writtenFiles.get(result.filePath) as string
    expect(content).toContain('## Decomposes Idea')
    expect(content).toContain(
      '- [Progress Broadcasting](../ideas/progress-broadcasting.md)'
    )
  })

  test('appends workflow hint when decompose-idea.md hint file exists', async () => {
    const fileSystem = createFileSystemEmulator({
      project: {
        '.dust': {
          ideas: {
            'progress-broadcasting.md':
              '# Progress Broadcasting\n\nA great idea.',
          },
          tasks: {},
          config: {
            'workflow-hints': {
              'decompose-idea.md': 'Prefer tasks under 100 lines of code.',
            },
          },
        },
      },
    })
    const result = await decomposeIdea(fileSystem, '/project/.dust', {
      ideaSlug: 'progress-broadcasting',
    })

    const content = fileSystem.writtenFiles.get(result.filePath) as string
    expect(content).toContain('Prefer tasks under 100 lines of code.')
  })

  test('generates task without hint when decompose-idea.md does not exist', async () => {
    const fileSystem = createFileSystem()
    const result = await decomposeIdea(fileSystem, '/project/.dust', {
      ideaSlug: 'progress-broadcasting',
    })

    const content = fileSystem.writtenFiles.get(result.filePath) as string
    expect(content).toContain('# Decompose Idea: Progress Broadcasting')
    expect(content).not.toContain('Prefer tasks under 100 lines')
  })
})

describe('createShelveIdeaTask', () => {
  test('creates a shelve-idea task with auto-filled defaults', async () => {
    const fileSystem = createFileSystem()
    const result = await createShelveIdeaTask(
      fileSystem,
      '/project/.dust',
      'progress-broadcasting'
    )

    expect(result.filePath).toBe(
      '/project/.dust/tasks/shelve-idea-progress-broadcasting.md'
    )
    const content = fileSystem.writtenFiles.get(result.filePath) as string
    expect(content).toContain('# Shelve Idea: Progress Broadcasting')
    expect(content).toContain(
      'Archive this idea and remove it from the active backlog. See [Progress Broadcasting](../ideas/progress-broadcasting.md).'
    )
    expect(content).toContain('- [ ] Idea file is deleted')
    expect(content).toContain(
      '- [ ] Rationale is recorded in the commit message'
    )
  })

  test('includes Shelves Idea section with link to target idea', async () => {
    const fileSystem = createFileSystem()
    const result = await createShelveIdeaTask(
      fileSystem,
      '/project/.dust',
      'progress-broadcasting'
    )

    const content = fileSystem.writtenFiles.get(result.filePath) as string
    expect(content).toContain('## Shelves Idea')
    expect(content).toContain(
      '- [Progress Broadcasting](../ideas/progress-broadcasting.md)'
    )
  })

  test('appends workflow hint when shelve.md hint file exists', async () => {
    const fileSystem = createFileSystemEmulator({
      project: {
        '.dust': {
          ideas: {
            'progress-broadcasting.md':
              '# Progress Broadcasting\n\nA great idea.',
          },
          tasks: {},
          config: {
            'workflow-hints': {
              'shelve.md': 'Document the reason for shelving clearly.',
            },
          },
        },
      },
    })
    const result = await createShelveIdeaTask(
      fileSystem,
      '/project/.dust',
      'progress-broadcasting'
    )

    const content = fileSystem.writtenFiles.get(result.filePath) as string
    expect(content).toContain('Document the reason for shelving clearly.')
  })

  test('generates task without hint when shelve.md does not exist', async () => {
    const fileSystem = createFileSystem()
    const result = await createShelveIdeaTask(
      fileSystem,
      '/project/.dust',
      'progress-broadcasting'
    )

    const content = fileSystem.writtenFiles.get(result.filePath) as string
    expect(content).toContain('# Shelve Idea: Progress Broadcasting')
    expect(content).not.toContain('Document the reason')
  })
})

describe('createIdeaTask', () => {
  test('creates a capture-idea task with title and description', async () => {
    const fileSystem = createFileSystem()
    const result = await createIdeaTask(fileSystem, '/project/.dust', {
      title: 'Progress Broadcasting',
      description: 'Allow agents to broadcast progress via WebSocket.',
    })

    expect(result.filePath).toBe(
      '/project/.dust/tasks/add-idea-progress-broadcasting.md'
    )
    const content = fileSystem.writtenFiles.get(result.filePath) as string
    expect(content).toContain('# Add Idea: Progress Broadcasting')
    expect(content).toContain(
      'Research this idea thoroughly, then create one or more idea files in `.dust/ideas/`.'
    )
    expect(content).toContain(
      'Run `dust principles` and `dust facts` for relevant context.'
    )
    expect(content).toContain(
      'If you add open questions, use `## Open Questions` with `### Question?` headings and one or more `#### Option` headings beneath each question, and only add questions that are meaningful decisions worth asking.'
    )
    // Description should be under its own heading, not inline in opening sentence
    expect(content).toContain('## Idea Description')
    expect(content).toContain(
      '## Idea Description\n\nAllow agents to broadcast progress via WebSocket.'
    )
    // Opening sentence should NOT reference title/description inline
    expect(content).not.toContain('The idea should have the title')
    expect(content).not.toContain('start from the following description')
    expect(content).toContain(
      '- [ ] One or more idea files are created in `.dust/ideas/`'
    )
    expect(content).toContain(
      '- [ ] Each idea file has an H1 title matching its content'
    )
    expect(content).toContain(
      '- [ ] Idea includes relevant context from codebase exploration'
    )
    expect(content).toContain(
      '- [ ] Open questions are added for any ambiguous or underspecified aspects'
    )
    expect(content).toContain(
      '- [ ] Open questions follow the required heading format and focus on high-value decisions'
    )
  })

  test('throws if title is empty', async () => {
    const fileSystem = createFileSystem()
    await expect(
      createIdeaTask(fileSystem, '/project/.dust', {
        title: '',
        description: 'Some description',
      })
    ).rejects.toThrow('title is required and must not be whitespace-only')
  })

  test('throws if title is whitespace-only', async () => {
    const fileSystem = createFileSystem()
    await expect(
      createIdeaTask(fileSystem, '/project/.dust', {
        title: '   ',
        description: 'Some description',
      })
    ).rejects.toThrow('title is required and must not be whitespace-only')
  })

  test('throws if description is empty', async () => {
    const fileSystem = createFileSystem()
    await expect(
      createIdeaTask(fileSystem, '/project/.dust', {
        title: 'Some Title',
        description: '',
      })
    ).rejects.toThrow('description is required and must not be whitespace-only')
  })

  test('throws if description is whitespace-only', async () => {
    const fileSystem = createFileSystem()
    await expect(
      createIdeaTask(fileSystem, '/project/.dust', {
        title: 'Some Title',
        description: '   ',
      })
    ).rejects.toThrow('description is required and must not be whitespace-only')
  })

  test('creates an expedite-idea task when expedite is true', async () => {
    const fileSystem = createFileSystem()
    const result = await createIdeaTask(fileSystem, '/project/.dust', {
      title: 'Progress Broadcasting',
      description: 'Allow agents to broadcast progress via WebSocket.',
      expedite: true,
    })

    expect(result.filePath).toBe(
      '/project/.dust/tasks/expedite-idea-progress-broadcasting.md'
    )
    const content = fileSystem.writtenFiles.get(result.filePath) as string
    expect(content).toContain(`# ${EXPEDITE_IDEA_PREFIX}Progress Broadcasting`)
    expect(content).toContain('Research this idea briefly')
    expect(content).toContain('implement directly and commit')
    expect(content).toContain(
      'create one or more narrowly-scoped task files in `.dust/tasks/`'
    )
    expect(content).toContain(
      'Run `dust principles` and `dust facts` for relevant context.'
    )
    expect(content).toContain(
      '- [ ] Idea is implemented directly OR one or more new tasks are created'
    )
    expect(content).toContain(
      '- [ ] If tasks were created, they link to relevant principles'
    )
    expect(content).toContain(
      '- [ ] Changes are committed with a clear commit message'
    )
    // Should NOT contain idea-file-specific instructions
    expect(content).not.toContain('Idea file exists at')
    expect(content).not.toContain('create an idea file')
  })

  test('uses custom dustCommand in templates', async () => {
    const fileSystem = createFileSystem()
    const result = await createIdeaTask(fileSystem, '/project/.dust', {
      title: 'Progress Broadcasting',
      description: 'Allow agents to broadcast progress via WebSocket.',
      dustCommand: 'bin/dust',
    })

    const content = fileSystem.writtenFiles.get(result.filePath) as string
    expect(content).toContain(
      'Run `bin/dust principles` and `bin/dust facts` for relevant context.'
    )
  })

  test('uses custom dustCommand in expedite templates', async () => {
    const fileSystem = createFileSystem()
    const result = await createIdeaTask(fileSystem, '/project/.dust', {
      title: 'Progress Broadcasting',
      description: 'Allow agents to broadcast progress via WebSocket.',
      expedite: true,
      dustCommand: 'bin/dust',
    })

    const content = fileSystem.writtenFiles.get(result.filePath) as string
    expect(content).toContain(
      'Run `bin/dust principles` and `bin/dust facts` for relevant context.'
    )
  })

  test('creates a capture-idea task when expedite is false', async () => {
    const fileSystem = createFileSystem()
    const result = await createIdeaTask(fileSystem, '/project/.dust', {
      title: 'Progress Broadcasting',
      description: 'Allow agents to broadcast progress via WebSocket.',
      expedite: false,
    })

    expect(result.filePath).toBe(
      '/project/.dust/tasks/add-idea-progress-broadcasting.md'
    )
    const content = fileSystem.writtenFiles.get(result.filePath) as string
    expect(content).toContain(`# ${CAPTURE_IDEA_PREFIX}Progress Broadcasting`)
    expect(content).toContain('create one or more idea files')
    expect(content).not.toContain(EXPEDITE_IDEA_PREFIX)
  })
})

describe('findWorkflowTaskForIdea', () => {
  test('returns null when no workflow task exists for the idea', async () => {
    const fileSystem = createFileSystem()
    const result = await findWorkflowTaskForIdea(
      fileSystem,
      '/project/.dust',
      'progress-broadcasting'
    )
    expect(result).toBeNull()
  })

  test('finds a refine task', async () => {
    const fileSystem = createFileSystem()
    await createRefineIdeaTask(
      fileSystem,
      '/project/.dust',
      'progress-broadcasting'
    )
    const result = await findWorkflowTaskForIdea(
      fileSystem,
      '/project/.dust',
      'progress-broadcasting'
    )
    expect(result).toEqual({
      type: 'refine',
      ideaSlug: 'progress-broadcasting',
      taskSlug: 'refine-idea-progress-broadcasting',
    })
  })

  test('finds a decompose-idea task', async () => {
    const fileSystem = createFileSystem()
    await decomposeIdea(fileSystem, '/project/.dust', {
      ideaSlug: 'progress-broadcasting',
    })
    const result = await findWorkflowTaskForIdea(
      fileSystem,
      '/project/.dust',
      'progress-broadcasting'
    )
    expect(result).toEqual({
      type: 'decompose-idea',
      ideaSlug: 'progress-broadcasting',
      taskSlug: 'decompose-idea-progress-broadcasting',
    })
  })

  test('finds a shelve task', async () => {
    const fileSystem = createFileSystem()
    await createShelveIdeaTask(
      fileSystem,
      '/project/.dust',
      'progress-broadcasting'
    )
    const result = await findWorkflowTaskForIdea(
      fileSystem,
      '/project/.dust',
      'progress-broadcasting'
    )
    expect(result).toEqual({
      type: 'shelve',
      ideaSlug: 'progress-broadcasting',
      taskSlug: 'shelve-idea-progress-broadcasting',
    })
  })

  test('throws when the idea does not exist', async () => {
    const fileSystem = createFileSystem()
    await expect(
      findWorkflowTaskForIdea(fileSystem, '/project/.dust', 'nonexistent')
    ).rejects.toThrow('Idea not found: "nonexistent"')
  })

  test('returns null for task with matching title prefix but no body section', async () => {
    const fileSystem = createFileSystemEmulator({
      project: {
        '.dust': {
          ideas: {
            'progress-broadcasting.md':
              '# Progress Broadcasting\n\nA great idea.',
          },
          tasks: {
            'decompose-idea-progress-broadcasting.md': `# Decompose Idea: Progress Broadcasting

Create tasks from this idea.

## Blocked By

(none)

## Definition of Done

- [ ] Tasks created
`,
          },
        },
      },
    })
    const result = await findWorkflowTaskForIdea(
      fileSystem,
      '/project/.dust',
      'progress-broadcasting'
    )
    expect(result).toBeNull()
  })

  test('finds task by body section link regardless of title', async () => {
    const fileSystem = createFileSystemEmulator({
      project: {
        '.dust': {
          ideas: {
            'progress-broadcasting.md':
              '# Progress Broadcasting\n\nA great idea.',
          },
          tasks: {
            'some-unrelated-name.md': `# Some Unrelated Name

Do something.

## Refines Idea

- [Progress Broadcasting](../ideas/progress-broadcasting.md)

## Blocked By

(none)

## Definition of Done

- [ ] Done
`,
          },
        },
      },
    })
    const result = await findWorkflowTaskForIdea(
      fileSystem,
      '/project/.dust',
      'progress-broadcasting'
    )
    expect(result).toEqual({
      type: 'refine',
      ideaSlug: 'progress-broadcasting',
      taskSlug: 'some-unrelated-name',
    })
  })

  test('finds decompose task by Decomposes Idea section', async () => {
    const fileSystem = createFileSystemEmulator({
      project: {
        '.dust': {
          ideas: {
            'my-idea.md': '# My Idea\n\nDescription.',
          },
          tasks: {
            'custom-task-name.md': `# Custom Task Name

Do something.

## Decomposes Idea

- [My Idea](../ideas/my-idea.md)

## Blocked By

(none)

## Definition of Done

- [ ] Done
`,
          },
        },
      },
    })
    const result = await findWorkflowTaskForIdea(
      fileSystem,
      '/project/.dust',
      'my-idea'
    )
    expect(result).toEqual({
      type: 'decompose-idea',
      ideaSlug: 'my-idea',
      taskSlug: 'custom-task-name',
    })
  })

  test('finds shelve task by Shelves Idea section', async () => {
    const fileSystem = createFileSystemEmulator({
      project: {
        '.dust': {
          ideas: {
            'my-idea.md': '# My Idea\n\nDescription.',
          },
          tasks: {
            'archive-task.md': `# Archive Task

Archive this idea.

## Shelves Idea

- [My Idea](../ideas/my-idea.md)

## Blocked By

(none)

## Definition of Done

- [ ] Done
`,
          },
        },
      },
    })
    const result = await findWorkflowTaskForIdea(
      fileSystem,
      '/project/.dust',
      'my-idea'
    )
    expect(result).toEqual({
      type: 'shelve',
      ideaSlug: 'my-idea',
      taskSlug: 'archive-task',
    })
  })

  test('returns null when tasks directory does not exist', async () => {
    const fileSystem = createFileSystemEmulator({
      project: {
        '.dust': {
          ideas: {
            'my-idea.md': '# My Idea\n\nDescription.',
          },
        },
      },
    })
    const result = await findWorkflowTaskForIdea(
      fileSystem,
      '/project/.dust',
      'my-idea'
    )
    expect(result).toBeNull()
  })

  test('stops parsing section at next H1 heading', async () => {
    const fileSystem = createFileSystemEmulator({
      project: {
        '.dust': {
          ideas: {
            'my-idea.md': '# My Idea\n\nDescription.',
          },
          tasks: {
            'some-task.md': `# Some Task

Do something.

## Refines Idea

# Another H1 heading interrupts

- [My Idea](../ideas/my-idea.md)

## Blocked By

(none)
`,
          },
        },
      },
    })
    const result = await findWorkflowTaskForIdea(
      fileSystem,
      '/project/.dust',
      'my-idea'
    )
    expect(result).toBeNull()
  })

  test('ignores links without .md extension in body section', async () => {
    const fileSystem = createFileSystemEmulator({
      project: {
        '.dust': {
          ideas: {
            'my-idea.md': '# My Idea\n\nDescription.',
          },
          tasks: {
            'some-task.md': `# Some Task

Do something.

## Refines Idea

- [External Link](https://example.com/my-idea)

## Blocked By

(none)
`,
          },
        },
      },
    })
    const result = await findWorkflowTaskForIdea(
      fileSystem,
      '/project/.dust',
      'my-idea'
    )
    expect(result).toBeNull()
  })
})

describe('shared error handling', () => {
  test('throws when the referenced idea does not exist', async () => {
    const fileSystem = createFileSystem()
    await expect(
      createRefineIdeaTask(fileSystem, '/project/.dust', 'nonexistent-idea')
    ).rejects.toThrow(
      'Idea not found: "nonexistent-idea" (expected file at /project/.dust/ideas/nonexistent-idea.md)'
    )
  })

  test('throws when the idea file has no title', async () => {
    const fileSystem = createFileSystemEmulator({
      project: {
        '.dust': {
          ideas: {
            'no-title.md': 'Just some text without a heading.',
          },
          tasks: {},
        },
      },
    })

    await expect(
      createRefineIdeaTask(fileSystem, '/project/.dust', 'no-title')
    ).rejects.toThrow(
      'Idea file has no title: /project/.dust/ideas/no-title.md'
    )
  })
})

describe('generated tasks pass lint rules', () => {
  test('createRefineIdeaTask produces a valid task file', async () => {
    const fileSystem = createFileSystem()
    const result = await createRefineIdeaTask(
      fileSystem,
      '/project/.dust',
      'progress-broadcasting'
    )
    const content = fileSystem.writtenFiles.get(result.filePath) as string
    expect(lintTaskFile(result.filePath, content)).toEqual([])
  })

  test('decomposeIdea produces a valid task file', async () => {
    const fileSystem = createFileSystem()
    const result = await decomposeIdea(fileSystem, '/project/.dust', {
      ideaSlug: 'progress-broadcasting',
    })
    const content = fileSystem.writtenFiles.get(result.filePath) as string
    expect(lintTaskFile(result.filePath, content)).toEqual([])
  })

  test('createShelveIdeaTask produces a valid task file', async () => {
    const fileSystem = createFileSystem()
    const result = await createShelveIdeaTask(
      fileSystem,
      '/project/.dust',
      'progress-broadcasting'
    )
    const content = fileSystem.writtenFiles.get(result.filePath) as string
    expect(lintTaskFile(result.filePath, content)).toEqual([])
  })

  test('createIdeaTask produces a valid task file', async () => {
    const fileSystem = createFileSystem()
    const result = await createIdeaTask(fileSystem, '/project/.dust', {
      title: 'Progress Broadcasting',
      description: 'Allow agents to broadcast progress via WebSocket.',
    })
    const content = fileSystem.writtenFiles.get(result.filePath) as string
    expect(lintTaskFile(result.filePath, content)).toEqual([])
  })

  test('createIdeaTask with expedite produces a valid task file', async () => {
    const fileSystem = createFileSystem()
    const result = await createIdeaTask(fileSystem, '/project/.dust', {
      title: 'Progress Broadcasting',
      description: 'Allow agents to broadcast progress via WebSocket.',
      expedite: true,
    })
    const content = fileSystem.writtenFiles.get(result.filePath) as string
    expect(lintTaskFile(result.filePath, content)).toEqual([])
  })
})

describe('CAPTURE_IDEA_PREFIX', () => {
  test('matches the prefix used by createIdeaTask', () => {
    expect(CAPTURE_IDEA_PREFIX).toBe('Add Idea: ')
  })
})

describe('parseCaptureIdeaTask', () => {
  test('returns null when file does not exist', async () => {
    const fileSystem = createFileSystem()
    const result = await parseCaptureIdeaTask(
      fileSystem,
      '/project/.dust',
      'nonexistent-task'
    )
    expect(result).toBeNull()
  })

  test('returns null for non-capture-idea tasks', async () => {
    const fileSystem = createFileSystemEmulator({
      project: {
        '.dust': {
          ideas: {},
          tasks: {
            'some-regular-task.md':
              '# Some Regular Task\n\nDo something.\n\n## Principles\n\n(none)\n\n## Blocked By\n\n(none)\n\n## Definition of Done\n\n- [ ] Done\n',
          },
        },
      },
    })
    const result = await parseCaptureIdeaTask(
      fileSystem,
      '/project/.dust',
      'some-regular-task'
    )
    expect(result).toBeNull()
  })

  test('returns null for old-format tasks without Idea Description heading', async () => {
    const fileSystem = createFileSystemEmulator({
      project: {
        '.dust': {
          ideas: {},
          tasks: {
            'add-idea-old-format.md':
              '# Add Idea: Old Format\n\nSome description inline.\n\n## Principles\n\n(none)\n\n## Blocked By\n\n(none)\n\n## Definition of Done\n\n- [ ] Done\n',
          },
        },
      },
    })
    const result = await parseCaptureIdeaTask(
      fileSystem,
      '/project/.dust',
      'add-idea-old-format'
    )
    expect(result).toBeNull()
  })

  test('returns null for files without a title', async () => {
    const fileSystem = createFileSystemEmulator({
      project: {
        '.dust': {
          ideas: {},
          tasks: {
            'no-title.md': 'Just some text without a heading.',
          },
        },
      },
    })
    const result = await parseCaptureIdeaTask(
      fileSystem,
      '/project/.dust',
      'no-title'
    )
    expect(result).toBeNull()
  })

  test('extracts title and description from new-format capture-idea tasks', async () => {
    const fileSystem = createFileSystem()
    await createIdeaTask(fileSystem, '/project/.dust', {
      title: 'Progress Broadcasting',
      description: 'Allow agents to broadcast progress via WebSocket.',
    })
    const result = await parseCaptureIdeaTask(
      fileSystem,
      '/project/.dust',
      'add-idea-progress-broadcasting'
    )
    expect(result).toEqual({
      ideaTitle: 'Progress Broadcasting',
      ideaDescription: 'Allow agents to broadcast progress via WebSocket.',
      expedite: false,
    })
  })

  test('returns expedite true for Expedite Idea tasks', async () => {
    const fileSystem = createFileSystem()
    await createIdeaTask(fileSystem, '/project/.dust', {
      title: 'Progress Broadcasting',
      description: 'Allow agents to broadcast progress via WebSocket.',
      expedite: true,
    })
    const result = await parseCaptureIdeaTask(
      fileSystem,
      '/project/.dust',
      'expedite-idea-progress-broadcasting'
    )
    expect(result).toEqual({
      ideaTitle: 'Progress Broadcasting',
      ideaDescription: 'Allow agents to broadcast progress via WebSocket.',
      expedite: true,
    })
  })

  test('preserves raw markdown content in description', async () => {
    const fileSystem = createFileSystem()
    const multilineDescription = `This is a description with **bold** and *italic*.

- List item 1
- List item 2

And a code block:
\`\`\`typescript
const x = 1;
\`\`\``
    await createIdeaTask(fileSystem, '/project/.dust', {
      title: 'Complex Idea',
      description: multilineDescription,
    })
    const result = await parseCaptureIdeaTask(
      fileSystem,
      '/project/.dust',
      'add-idea-complex-idea'
    )
    expect(result).toEqual({
      ideaTitle: 'Complex Idea',
      ideaDescription: multilineDescription,
      expedite: false,
    })
  })
})

describe('findAllWorkflowTasks', () => {
  test('returns empty results when tasks directory does not exist', async () => {
    const fileSystem = createFileSystemEmulator({
      project: { '.dust': { ideas: {} } },
    })
    const result = await findAllWorkflowTasks(fileSystem, '/project/.dust')
    expect(result.captureIdeaTasks).toEqual([])
    expect(result.workflowTasksByIdeaSlug.size).toBe(0)
  })

  test('skips task files with no title', async () => {
    const fileSystem = createFileSystemEmulator({
      project: {
        '.dust': {
          ideas: {},
          tasks: {
            'no-title.md': 'Just some text without a heading.',
          },
        },
      },
    })
    const result = await findAllWorkflowTasks(fileSystem, '/project/.dust')
    expect(result.captureIdeaTasks).toEqual([])
    expect(result.workflowTasksByIdeaSlug.size).toBe(0)
  })

  test('finds capture idea tasks (add-idea and expedite-idea)', async () => {
    const fileSystem = createFileSystem()
    await createIdeaTask(fileSystem, '/project/.dust', {
      title: 'Auto Linting',
      description: 'Lint on save.',
    })
    await createIdeaTask(fileSystem, '/project/.dust', {
      title: 'Progress Broadcasting',
      description: 'WebSocket-based progress.',
      expedite: true,
    })
    const result = await findAllWorkflowTasks(fileSystem, '/project/.dust')
    expect(result.captureIdeaTasks).toEqual([
      { taskSlug: 'add-idea-auto-linting', ideaTitle: 'Auto Linting' },
      {
        taskSlug: 'expedite-idea-progress-broadcasting',
        ideaTitle: 'Progress Broadcasting',
      },
    ])
  })

  test('builds workflow task map for ideas with refine/decompose/shelve tasks', async () => {
    const fileSystem = createFileSystemEmulator({
      project: {
        '.dust': {
          ideas: {
            'idea-a.md': '# Idea A\n\nDescription.',
            'idea-b.md': '# Idea B\n\nDescription.',
          },
          tasks: {},
        },
      },
    })
    await createRefineIdeaTask(fileSystem, '/project/.dust', 'idea-a')
    await createShelveIdeaTask(fileSystem, '/project/.dust', 'idea-b')
    const result = await findAllWorkflowTasks(fileSystem, '/project/.dust')
    expect(result.workflowTasksByIdeaSlug.get('idea-a')).toEqual({
      type: 'refine',
      ideaSlug: 'idea-a',
      taskSlug: 'refine-idea-idea-a',
    })
    expect(result.workflowTasksByIdeaSlug.get('idea-b')).toEqual({
      type: 'shelve',
      ideaSlug: 'idea-b',
      taskSlug: 'shelve-idea-idea-b',
    })
  })

  test('returns both capture tasks and workflow task map in a single call', async () => {
    const fileSystem = createFileSystemEmulator({
      project: {
        '.dust': {
          ideas: {
            'existing-idea.md': '# Existing Idea\n\nDescription.',
          },
          tasks: {},
        },
      },
    })
    await createIdeaTask(fileSystem, '/project/.dust', {
      title: 'New Idea',
      description: 'A new idea.',
    })
    await decomposeIdea(fileSystem, '/project/.dust', {
      ideaSlug: 'existing-idea',
    })
    const result = await findAllWorkflowTasks(fileSystem, '/project/.dust')
    expect(result.captureIdeaTasks).toEqual([
      { taskSlug: 'add-idea-new-idea', ideaTitle: 'New Idea' },
    ])
    expect(result.workflowTasksByIdeaSlug.get('existing-idea')).toEqual({
      type: 'decompose-idea',
      ideaSlug: 'existing-idea',
      taskSlug: 'decompose-idea-existing-idea',
    })
  })
})
