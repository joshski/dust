import { describe, expect, test } from 'vitest'
import {
  type Violation,
  validateFilename,
  validateImperativeOpeningSentence,
  validateOpeningSentence,
  validateOpeningSentenceLength,
  validateSemanticLinks,
  validateTaskHeadings,
  validateTitleFilenameMatch,
} from './cli/commands/lint-markdown'
import { createFileSystemEmulator } from './test/test-utilities'
import {
  CAPTURE_IDEA_PREFIX,
  createCaptureIdeaTask,
  createRefineIdeaTask,
  createShelveIdeaTask,
  createTaskFromIdea,
  findWorkflowTask,
  IDEA_TRANSITION_PREFIXES,
  findAllCaptureIdeaTasks,
  type OpenQuestionResponse,
  titleToFilename,
} from './workflow-tasks'

describe('IDEA_TRANSITION_PREFIXES', () => {
  test('contains all three transition prefixes', () => {
    expect(IDEA_TRANSITION_PREFIXES).toEqual([
      'Refine Idea: ',
      'Create Task From Idea: ',
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
      'Thoroughly research this idea and refine it into a well-defined proposal. Read the idea file, explore the codebase for relevant context, and identify any ambiguity. Where aspects are unclear or could go multiple ways, add open questions to the idea file. See [Progress Broadcasting](../ideas/progress-broadcasting.md).'
    )
    expect(content).toContain('## Goals\n\n(none)')
    expect(content).toContain('## Blocked By\n\n(none)')
    expect(content).toContain(
      '- [ ] Idea is thoroughly researched with relevant codebase context'
    )
    expect(content).toContain(
      '- [ ] Open questions are added for any ambiguous or underspecified aspects'
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
      'add open questions to the idea file. See [Progress Broadcasting](../ideas/progress-broadcasting.md).\n\nFocus on the WebSocket approach.\n\n## Goals'
    )
  })
})

describe('createTaskFromIdea', () => {
  test('creates a task-from-idea task with auto-filled defaults', async () => {
    const fileSystem = createFileSystem()
    const result = await createTaskFromIdea(fileSystem, '/project/.dust', {
      ideaSlug: 'progress-broadcasting',
    })

    expect(result.filePath).toBe(
      '/project/.dust/tasks/create-task-from-idea-progress-broadcasting.md'
    )
    const content = fileSystem.writtenFiles.get(result.filePath) as string
    expect(content).toContain('# Create Task From Idea: Progress Broadcasting')
    expect(content).toContain(
      'Create a well-defined task from this idea. See [Progress Broadcasting](../ideas/progress-broadcasting.md).'
    )
    expect(content).toContain('- [ ] A new task is created in .dust/tasks/')
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
    const result = await createTaskFromIdea(fileSystem, '/project/.dust', {
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
    const result = await createTaskFromIdea(fileSystem, '/project/.dust', {
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
    const result = await createTaskFromIdea(fileSystem, '/project/.dust', {
      ideaSlug: 'progress-broadcasting',
    })

    const content = fileSystem.writtenFiles.get(result.filePath) as string
    expect(content).not.toContain('## Resolved Questions')
  })

  test('omits Resolved Questions section when responses array is empty', async () => {
    const fileSystem = createFileSystem()
    const result = await createTaskFromIdea(fileSystem, '/project/.dust', {
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
    const result = await createCaptureIdeaTask(
      fileSystem,
      '/project/.dust',
      'Progress Broadcasting',
      'Allow agents to broadcast progress via WebSocket.'
    )

    expect(result.filePath).toBe(
      '/project/.dust/tasks/add-idea-progress-broadcasting.md'
    )
    const content = fileSystem.writtenFiles.get(result.filePath) as string
    expect(content).toContain('# Add Idea: Progress Broadcasting')
    expect(content).toContain(
      'Research this idea thoroughly, then create an idea file at `.dust/ideas/progress-broadcasting.md`.'
    )
    expect(content).toContain(
      'Read the codebase for relevant context, flesh out the description, and identify any ambiguity.'
    )
    expect(content).toContain(
      'Allow agents to broadcast progress via WebSocket.'
    )
    expect(content).toContain(
      '- [ ] Idea includes relevant context from codebase exploration'
    )
    expect(content).toContain(
      '- [ ] Open questions are added for any ambiguous or underspecified aspects'
    )
  })

  test('throws if title is empty', async () => {
    const fileSystem = createFileSystem()
    await expect(
      createCaptureIdeaTask(
        fileSystem,
        '/project/.dust',
        '',
        'Some description'
      )
    ).rejects.toThrow('title is required and must not be whitespace-only')
  })

  test('throws if title is whitespace-only', async () => {
    const fileSystem = createFileSystem()
    await expect(
      createCaptureIdeaTask(
        fileSystem,
        '/project/.dust',
        '   ',
        'Some description'
      )
    ).rejects.toThrow('title is required and must not be whitespace-only')
  })

  test('throws if description is empty', async () => {
    const fileSystem = createFileSystem()
    await expect(
      createCaptureIdeaTask(fileSystem, '/project/.dust', 'Some Title', '')
    ).rejects.toThrow('description is required and must not be whitespace-only')
  })

  test('throws if description is whitespace-only', async () => {
    const fileSystem = createFileSystem()
    await expect(
      createCaptureIdeaTask(fileSystem, '/project/.dust', 'Some Title', '   ')
    ).rejects.toThrow('description is required and must not be whitespace-only')
  })
})

describe('findWorkflowTask', () => {
  test('returns null when no workflow task exists for the idea', async () => {
    const fileSystem = createFileSystem()
    const result = await findWorkflowTask(
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
    const result = await findWorkflowTask(
      fileSystem,
      '/project/.dust',
      'progress-broadcasting'
    )
    expect(result).toEqual({
      type: 'refine',
      taskSlug: 'refine-idea-progress-broadcasting',
    })
  })

  test('finds a create-task task', async () => {
    const fileSystem = createFileSystem()
    await createTaskFromIdea(fileSystem, '/project/.dust', {
      ideaSlug: 'progress-broadcasting',
    })
    const result = await findWorkflowTask(
      fileSystem,
      '/project/.dust',
      'progress-broadcasting'
    )
    expect(result).toEqual({
      type: 'create-task',
      taskSlug: 'create-task-from-idea-progress-broadcasting',
    })
  })

  test('finds a shelve task', async () => {
    const fileSystem = createFileSystem()
    await createShelveIdeaTask(
      fileSystem,
      '/project/.dust',
      'progress-broadcasting'
    )
    const result = await findWorkflowTask(
      fileSystem,
      '/project/.dust',
      'progress-broadcasting'
    )
    expect(result).toEqual({
      type: 'shelve',
      taskSlug: 'shelve-idea-progress-broadcasting',
    })
  })

  test('throws when the idea does not exist', async () => {
    const fileSystem = createFileSystem()
    await expect(
      findWorkflowTask(fileSystem, '/project/.dust', 'nonexistent')
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
  function lintTaskFile(filePath: string, content: string): Violation[] {
    const violations: Violation[] = []
    const v1 = validateFilename(filePath)
    if (v1) violations.push(v1)
    const v2 = validateTitleFilenameMatch(filePath, content)
    if (v2) violations.push(v2)
    const v3 = validateOpeningSentence(filePath, content)
    if (v3) violations.push(v3)
    const v4 = validateOpeningSentenceLength(filePath, content)
    if (v4) violations.push(v4)
    const v5 = validateImperativeOpeningSentence(filePath, content)
    if (v5) violations.push(v5)
    violations.push(...validateTaskHeadings(filePath, content))
    violations.push(...validateSemanticLinks(filePath, content))
    return violations
  }

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

  test('createTaskFromIdea produces a valid task file', async () => {
    const fileSystem = createFileSystem()
    const result = await createTaskFromIdea(fileSystem, '/project/.dust', {
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
    const result = await createCaptureIdeaTask(
      fileSystem,
      '/project/.dust',
      'Progress Broadcasting',
      'Allow agents to broadcast progress via WebSocket.'
    )
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
              '# Some Regular Task\n\nDo something.\n\n## Goals\n\n(none)\n\n## Blocked By\n\n(none)\n\n## Definition of Done\n\n- [ ] Done\n',
          },
        },
      },
    })
    const result = await findAllCaptureIdeaTasks(fileSystem, '/project/.dust')
    expect(result).toEqual([])
  })

  test('finds capture-idea tasks created by createCaptureIdeaTask', async () => {
    const fileSystem = createFileSystem()
    await createCaptureIdeaTask(
      fileSystem,
      '/project/.dust',
      'Progress Broadcasting',
      'Allow agents to broadcast progress via WebSocket.'
    )
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
    await createCaptureIdeaTask(
      fileSystem,
      '/project/.dust',
      'Progress Broadcasting',
      'WebSocket-based progress.'
    )
    await createCaptureIdeaTask(
      fileSystem,
      '/project/.dust',
      'Auto Linting',
      'Lint on save.'
    )
    const result = await findAllCaptureIdeaTasks(fileSystem, '/project/.dust')
    expect(result).toEqual([
      { taskSlug: 'add-idea-auto-linting', ideaTitle: 'Auto Linting' },
      {
        taskSlug: 'add-idea-progress-broadcasting',
        ideaTitle: 'Progress Broadcasting',
      },
    ])
  })

  test('ignores idea transition tasks (refine, create-task, shelve)', async () => {
    const fileSystem = createFileSystem()
    await createRefineIdeaTask(
      fileSystem,
      '/project/.dust',
      'progress-broadcasting'
    )
    await createCaptureIdeaTask(
      fileSystem,
      '/project/.dust',
      'Auto Linting',
      'Lint on save.'
    )
    const result = await findAllCaptureIdeaTasks(fileSystem, '/project/.dust')
    expect(result).toEqual([
      { taskSlug: 'add-idea-auto-linting', ideaTitle: 'Auto Linting' },
    ])
  })
})
