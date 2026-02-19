import { describe, expect, test } from 'vitest'
import { createFileSystemEmulator, lintTaskFile } from '../test/test-utilities'
import {
  BUILD_IDEA_PREFIX,
  CAPTURE_IDEA_PREFIX,
  createCaptureIdeaTask,
  createRefineIdeaTask,
  createShelveIdeaTask,
  decomposeIdea,
  findAllCaptureIdeaTasks,
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
      'Thoroughly research this idea and refine it into a well-defined proposal. Read the idea file, explore the codebase for relevant context, and identify any ambiguity. Where aspects are unclear or could go multiple ways, add open questions to the idea file. Review `.dust/principles/` for alignment and `.dust/facts/` for relevant design decisions. See [Progress Broadcasting](../ideas/progress-broadcasting.md).'
    )
    expect(content).toContain(
      'If you add open questions, use `## Open Questions` with `### Question?` headings and one or more `#### Option` headings beneath each question, and only add questions that are meaningful decisions worth asking.'
    )
    expect(content).toContain('## Principles\n\n(none)')
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
      'Review `.dust/principles/` for alignment and `.dust/facts/` for relevant design decisions. See [Progress Broadcasting](../ideas/progress-broadcasting.md). If you add open questions, use `## Open Questions` with `### Question?` headings and one or more `#### Option` headings beneath each question, and only add questions that are meaningful decisions worth asking.\n\nFocus on the WebSocket approach.\n\n## Principles'
    )
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
      'Create one or more well-defined tasks from this idea. Prefer smaller, narrowly scoped tasks that each deliver a thin but complete vertical slice of working software -- a path through the system that can be tested end-to-end -- rather than component-oriented tasks (like "add schema" or "build endpoint") that only work once all tasks are done. Split the idea into multiple tasks if it covers more than one logical change. Review `.dust/principles/` to link relevant principles and `.dust/facts/` for design decisions that should inform the task. See [Progress Broadcasting](../ideas/progress-broadcasting.md).'
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
})

describe('createCaptureIdeaTask', () => {
  test('creates a capture-idea task with title and description', async () => {
    const fileSystem = createFileSystem()
    const result = await createCaptureIdeaTask(fileSystem, '/project/.dust', {
      title: 'Progress Broadcasting',
      description: 'Allow agents to broadcast progress via WebSocket.',
    })

    expect(result.filePath).toBe(
      '/project/.dust/tasks/add-idea-progress-broadcasting.md'
    )
    const content = fileSystem.writtenFiles.get(result.filePath) as string
    expect(content).toContain('# Add Idea: Progress Broadcasting')
    expect(content).toContain(
      'Research this idea thoroughly, then create an idea file at `.dust/ideas/progress-broadcasting.md`.'
    )
    expect(content).toContain(
      'Review `.dust/principles/` and `.dust/facts/` for relevant context.'
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
      createCaptureIdeaTask(fileSystem, '/project/.dust', {
        title: '',
        description: 'Some description',
      })
    ).rejects.toThrow('title is required and must not be whitespace-only')
  })

  test('throws if title is whitespace-only', async () => {
    const fileSystem = createFileSystem()
    await expect(
      createCaptureIdeaTask(fileSystem, '/project/.dust', {
        title: '   ',
        description: 'Some description',
      })
    ).rejects.toThrow('title is required and must not be whitespace-only')
  })

  test('throws if description is empty', async () => {
    const fileSystem = createFileSystem()
    await expect(
      createCaptureIdeaTask(fileSystem, '/project/.dust', {
        title: 'Some Title',
        description: '',
      })
    ).rejects.toThrow('description is required and must not be whitespace-only')
  })

  test('throws if description is whitespace-only', async () => {
    const fileSystem = createFileSystem()
    await expect(
      createCaptureIdeaTask(fileSystem, '/project/.dust', {
        title: 'Some Title',
        description: '   ',
      })
    ).rejects.toThrow('description is required and must not be whitespace-only')
  })

  test('creates a build-idea task when buildItNow is true', async () => {
    const fileSystem = createFileSystem()
    const result = await createCaptureIdeaTask(fileSystem, '/project/.dust', {
      title: 'Progress Broadcasting',
      description: 'Allow agents to broadcast progress via WebSocket.',
      buildItNow: true,
    })

    expect(result.filePath).toBe(
      '/project/.dust/tasks/build-idea-progress-broadcasting.md'
    )
    const content = fileSystem.writtenFiles.get(result.filePath) as string
    expect(content).toContain(`# ${BUILD_IDEA_PREFIX}Progress Broadcasting`)
    expect(content).toContain(
      'create one or more narrowly-scoped task files in `.dust/tasks/`'
    )
    expect(content).toContain('Review `.dust/principles/` and `.dust/facts/`')
    expect(content).toContain(
      '- [ ] One or more new tasks are created in `.dust/tasks/`'
    )
    expect(content).toContain(
      '- [ ] Tasks link to relevant principles from `.dust/principles/`'
    )
    expect(content).toContain('- [ ] Tasks are narrowly scoped vertical slices')
    // Should NOT contain idea-file-specific instructions
    expect(content).not.toContain('Idea file exists at')
    expect(content).not.toContain('create an idea file')
  })

  test('creates a capture-idea task when buildItNow is false', async () => {
    const fileSystem = createFileSystem()
    const result = await createCaptureIdeaTask(fileSystem, '/project/.dust', {
      title: 'Progress Broadcasting',
      description: 'Allow agents to broadcast progress via WebSocket.',
      buildItNow: false,
    })

    expect(result.filePath).toBe(
      '/project/.dust/tasks/add-idea-progress-broadcasting.md'
    )
    const content = fileSystem.writtenFiles.get(result.filePath) as string
    expect(content).toContain(`# ${CAPTURE_IDEA_PREFIX}Progress Broadcasting`)
    expect(content).toContain('create an idea file')
    expect(content).not.toContain(BUILD_IDEA_PREFIX)
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

  test('createCaptureIdeaTask produces a valid task file', async () => {
    const fileSystem = createFileSystem()
    const result = await createCaptureIdeaTask(fileSystem, '/project/.dust', {
      title: 'Progress Broadcasting',
      description: 'Allow agents to broadcast progress via WebSocket.',
    })
    const content = fileSystem.writtenFiles.get(result.filePath) as string
    expect(lintTaskFile(result.filePath, content)).toEqual([])
  })

  test('createCaptureIdeaTask with buildItNow produces a valid task file', async () => {
    const fileSystem = createFileSystem()
    const result = await createCaptureIdeaTask(fileSystem, '/project/.dust', {
      title: 'Progress Broadcasting',
      description: 'Allow agents to broadcast progress via WebSocket.',
      buildItNow: true,
    })
    const content = fileSystem.writtenFiles.get(result.filePath) as string
    expect(lintTaskFile(result.filePath, content)).toEqual([])
  })
})

describe('CAPTURE_IDEA_PREFIX', () => {
  test('matches the prefix used by createCaptureIdeaTask', () => {
    expect(CAPTURE_IDEA_PREFIX).toBe('Add Idea: ')
  })
})

describe('findAllCaptureIdeaTasks', () => {
  test('returns empty array when tasks directory does not exist', async () => {
    const fileSystem = createFileSystemEmulator({
      project: { '.dust': { ideas: {} } },
    })
    const result = await findAllCaptureIdeaTasks(fileSystem, '/project/.dust')
    expect(result).toEqual([])
  })

  test('returns empty array when no capture-idea tasks exist', async () => {
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
    const result = await findAllCaptureIdeaTasks(fileSystem, '/project/.dust')
    expect(result).toEqual([])
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
    const result = await findAllCaptureIdeaTasks(fileSystem, '/project/.dust')
    expect(result).toEqual([])
  })

  test('finds capture-idea tasks created by createCaptureIdeaTask', async () => {
    const fileSystem = createFileSystem()
    await createCaptureIdeaTask(fileSystem, '/project/.dust', {
      title: 'Progress Broadcasting',
      description: 'Allow agents to broadcast progress via WebSocket.',
    })
    const result = await findAllCaptureIdeaTasks(fileSystem, '/project/.dust')
    expect(result).toEqual([
      {
        taskSlug: 'add-idea-progress-broadcasting',
        ideaTitle: 'Progress Broadcasting',
      },
    ])
  })

  test('returns multiple capture-idea tasks sorted by filename', async () => {
    const fileSystem = createFileSystem()
    await createCaptureIdeaTask(fileSystem, '/project/.dust', {
      title: 'Progress Broadcasting',
      description: 'WebSocket-based progress.',
    })
    await createCaptureIdeaTask(fileSystem, '/project/.dust', {
      title: 'Auto Linting',
      description: 'Lint on save.',
    })
    const result = await findAllCaptureIdeaTasks(fileSystem, '/project/.dust')
    expect(result).toEqual([
      { taskSlug: 'add-idea-auto-linting', ideaTitle: 'Auto Linting' },
      {
        taskSlug: 'add-idea-progress-broadcasting',
        ideaTitle: 'Progress Broadcasting',
      },
    ])
  })

  test('finds build-idea tasks created by createCaptureIdeaTask with buildItNow', async () => {
    const fileSystem = createFileSystem()
    await createCaptureIdeaTask(fileSystem, '/project/.dust', {
      title: 'Progress Broadcasting',
      description: 'Allow agents to broadcast progress via WebSocket.',
      buildItNow: true,
    })
    const result = await findAllCaptureIdeaTasks(fileSystem, '/project/.dust')
    expect(result).toEqual([
      {
        taskSlug: 'build-idea-progress-broadcasting',
        ideaTitle: 'Progress Broadcasting',
      },
    ])
  })

  test('finds both add-idea and build-idea tasks', async () => {
    const fileSystem = createFileSystem()
    await createCaptureIdeaTask(fileSystem, '/project/.dust', {
      title: 'Auto Linting',
      description: 'Lint on save.',
    })
    await createCaptureIdeaTask(fileSystem, '/project/.dust', {
      title: 'Progress Broadcasting',
      description: 'WebSocket-based progress.',
      buildItNow: true,
    })
    const result = await findAllCaptureIdeaTasks(fileSystem, '/project/.dust')
    expect(result).toEqual([
      { taskSlug: 'add-idea-auto-linting', ideaTitle: 'Auto Linting' },
      {
        taskSlug: 'build-idea-progress-broadcasting',
        ideaTitle: 'Progress Broadcasting',
      },
    ])
  })

  test('ignores idea transition tasks (refine, decompose-idea, shelve)', async () => {
    const fileSystem = createFileSystem()
    await createRefineIdeaTask(
      fileSystem,
      '/project/.dust',
      'progress-broadcasting'
    )
    await createCaptureIdeaTask(fileSystem, '/project/.dust', {
      title: 'Auto Linting',
      description: 'Lint on save.',
    })
    const result = await findAllCaptureIdeaTasks(fileSystem, '/project/.dust')
    expect(result).toEqual([
      { taskSlug: 'add-idea-auto-linting', ideaTitle: 'Auto Linting' },
    ])
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
    await createCaptureIdeaTask(fileSystem, '/project/.dust', {
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
      buildItNow: false,
    })
  })

  test('returns buildItNow true for Build Idea tasks', async () => {
    const fileSystem = createFileSystem()
    await createCaptureIdeaTask(fileSystem, '/project/.dust', {
      title: 'Progress Broadcasting',
      description: 'Allow agents to broadcast progress via WebSocket.',
      buildItNow: true,
    })
    const result = await parseCaptureIdeaTask(
      fileSystem,
      '/project/.dust',
      'build-idea-progress-broadcasting'
    )
    expect(result).toEqual({
      ideaTitle: 'Progress Broadcasting',
      ideaDescription: 'Allow agents to broadcast progress via WebSocket.',
      buildItNow: true,
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
    await createCaptureIdeaTask(fileSystem, '/project/.dust', {
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
      buildItNow: false,
    })
  })
})
